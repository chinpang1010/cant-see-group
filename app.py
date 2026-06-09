from pathlib import Path
from sqlite3 import IntegrityError
from uuid import uuid4

from flask import Flask, abort, jsonify, redirect, render_template, request, session, url_for
from werkzeug.utils import secure_filename

from api.sql import Closet, ClothItem, DB, Member, Outfit, Record, Reports, init_db


app = Flask(__name__)
app.secret_key = "wardrobe-secret-key"
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

UPLOAD_DIR = Path(app.root_path) / "static" / "uploads"
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ADMIN_ROLES = {"admin", "manager"}

init_db()


def _payload():
    return request.get_json(silent=True) or request.form.to_dict(flat=False) or {}


def _scalar(data, key, default=""):
    value = data.get(key, default)
    if isinstance(value, list):
        return value[0] if value else default
    return value


def _current_user_id(data=None):
    data = data or {}
    value = request.args.get("u_id") or _scalar(data, "u_id", None) or session.get("u_id") or 1
    try:
        return int(value)
    except (TypeError, ValueError):
        return 1


def _item_filters(extra=None):
    filters = {
        "q": request.args.get("search", "").strip(),
        "category": request.args.get("category", "").strip(),
        "color": request.args.get("color", "").strip(),
        "tag": request.args.get("tag", "").strip(),
    }
    if extra:
        filters.update(extra)
    return {key: value for key, value in filters.items() if value}


def _json_rows(rows):
    return jsonify([dict(row) for row in rows])


def _error(message, status=400):
    return jsonify({"success": False, "error": message}), status


def _allowed_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def _is_admin_user():
    return session.get("role") in ADMIN_ROLES


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/index.html")
def index_alias():
    return redirect(url_for("index"))


@app.route("/record")
def record():
    return render_template("record.html")


@app.route("/record.html")
def record_alias():
    return redirect(url_for("record"))


@app.route("/admin")
def admin():
    if not session.get("u_id"):
        return redirect(url_for("index"))
    if not _is_admin_user():
        abort(403)
    users = [dict(row) for row in Member.get_all_users()]
    return render_template("admin.html", users=users)


@app.route("/admin.html")
def admin_alias():
    return redirect(url_for("admin"))


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = _payload()
    username = _scalar(data, "username") or _scalar(data, "account")
    password = _scalar(data, "password")
    user = Member.verify(username, password)
    if not user:
        return _error("Invalid username or password.", 401)
    session["u_id"] = user["u_id"]
    session["username"] = user["username"]
    session["role"] = user["role"]
    return jsonify({"success": True, "user": user})


@app.route("/api/auth/signup", methods=["POST"])
def api_signup():
    data = _payload()
    username = (_scalar(data, "username") or _scalar(data, "name") or "").strip()
    password = (_scalar(data, "password") or "").strip()
    if not username or not password:
        return _error("Username and password are required.")
    try:
        user_id = Member.create_member(
            {
                "username": username,
                "password": password,
                "gender": _scalar(data, "gender", ""),
                "role": "user",
                "closet_name": f"{username}'s Closet",
            }
        )
    except IntegrityError:
        DB.rollback()
        return _error("Username already exists.", 409)
    session["u_id"] = user_id
    session["username"] = username
    session["role"] = "user"
    return jsonify(
        {
            "success": True,
            "user": {"u_id": user_id, "username": username, "role": session["role"]},
        }
    ), 201


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/uploads", methods=["POST"])
def api_upload_image():
    image = request.files.get("image")
    if not image or not image.filename:
        return _error("No image file uploaded.")

    if not _allowed_image(image.filename):
        return _error("Only png, jpg, jpeg, gif, and webp files are allowed.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    original_name = secure_filename(image.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    filename = f"{uuid4().hex}.{extension}"
    image.save(UPLOAD_DIR / filename)

    return jsonify({"success": True, "image_url": f"/static/uploads/{filename}"}), 201


@app.route("/api/wardrobes", methods=["GET", "POST"])
def api_wardrobes():
    if request.method == "GET":
        return _json_rows(Closet.get_all(_current_user_id()))

    data = _payload()
    name = (_scalar(data, "c_name") or _scalar(data, "name") or "").strip()
    if not name:
        return _error("Wardrobe name is required.")
    closet_id = Closet.add({"c_name": name, "u_id": _current_user_id(data)})
    closet = Closet.get(closet_id)
    return jsonify({"success": True, "closet": dict(closet)}), 201


@app.route("/api/wardrobes/<int:closet_id>", methods=["PUT", "DELETE"])
def api_wardrobe_detail(closet_id):
    if request.method == "DELETE":
        Closet.delete(closet_id)
        return jsonify({"success": True})

    data = _payload()
    name = (_scalar(data, "c_name") or _scalar(data, "name") or "").strip()
    if not name:
        return _error("Wardrobe name is required.")
    Closet.update(closet_id, {"c_name": name})
    return jsonify({"success": True, "closet": dict(Closet.get(closet_id))})


@app.route("/api/closet/<int:closet_id>/items")
def api_closet_items(closet_id):
    return _json_rows(ClothItem.get_by_closet(closet_id, _item_filters()))


@app.route("/api/items", methods=["GET", "POST"])
def api_items():
    if request.method == "GET":
        filters = _item_filters()
        closet_id = request.args.get("c_id") or request.args.get("closet_id")
        if closet_id:
            filters["closet_id"] = int(closet_id)
        return _json_rows(ClothItem.search(filters))

    data = _payload()
    item_name = (_scalar(data, "item_name") or "").strip()
    if not item_name:
        return _error("Item name is required.")

    item_id = ClothItem.add(
        {
            "item_name": item_name,
            "size": _scalar(data, "size", ""),
            "last_worn": _scalar(data, "last_worn", ""),
            "tag": data.get("tag", ""),
            "category": data.get("category", ""),
            "color": data.get("color", ""),
            "image_url": data.get("image_url", ""),
            "c_id": int(_scalar(data, "c_id", 1) or 1),
        }
    )
    return jsonify({"success": True, "item": dict(ClothItem.get(item_id))}), 201


@app.route("/api/items/<int:item_id>", methods=["GET", "PUT", "PATCH", "DELETE"])
def api_item_detail(item_id):
    if request.method == "GET":
        item = ClothItem.get(item_id)
        if not item:
            return _error("Item not found.", 404)
        return jsonify(dict(item))

    if request.method == "DELETE":
        ClothItem.delete(item_id)
        return jsonify({"success": True})

    data = _payload()
    ok = ClothItem.update(
        item_id,
        {
            "item_name": _scalar(data, "item_name", ""),
            "size": _scalar(data, "size", ""),
            "last_worn": _scalar(data, "last_worn", ""),
            "tag": data.get("tag", ""),
            "category": data.get("category", ""),
            "color": data.get("color", ""),
            "image_url": data.get("image_url", ""),
            "c_id": int(_scalar(data, "c_id", 1) or 1),
        },
    )
    if not ok:
        return _error("Item not found.", 404)
    return jsonify({"success": True, "item": dict(ClothItem.get(item_id))})


@app.route("/api/outfits", methods=["GET", "POST"])
def api_outfits():
    if request.method == "GET":
        return _json_rows(Outfit.get_all(_current_user_id()))

    data = _payload()
    item_ids = data.get("item_ids", [])
    if isinstance(item_ids, str):
        item_ids = [part.strip() for part in item_ids.split(",") if part.strip()]
    name = (_scalar(data, "outfit_name") or "").strip()
    if not name:
        return _error("Outfit name is required.")
    outfit_id = Outfit.add(
        {
            "u_id": _current_user_id(data),
            "outfit_name": name,
            "note": _scalar(data, "note", ""),
            "season": data.get("season", ""),
            "occasion": data.get("occasion", ""),
            "image_url": data.get("image_url", ""),
        },
        item_ids,
    )
    return jsonify({"success": True, "outfit_id": outfit_id}), 201


@app.route("/api/outfits/<int:outfit_id>", methods=["DELETE"])
def api_outfit_detail(outfit_id):
    Outfit.delete(outfit_id)
    return jsonify({"success": True})


@app.route("/api/records", methods=["GET", "POST"])
def api_records():
    if request.method == "GET":
        return _json_rows(Record.get_all(_current_user_id()))

    data = _payload()
    item_ids = data.get("item_ids", [])
    if isinstance(item_ids, str):
        item_ids = [part.strip() for part in item_ids.split(",") if part.strip()]
    if not data.get("outfit_id") and not item_ids:
        return _error("Select at least one clothing item for the outfit.")

    outfit_id = Record.add(
        {
            "datetime": _scalar(data, "datetime", ""),
            "weather": _scalar(data, "weather", ""),
            "mood": _scalar(data, "mood", ""),
            "rating": int(_scalar(data, "rating", 0) or 0) or None,
            "note": _scalar(data, "note", ""),
            "outfit_id": _scalar(data, "outfit_id", None),
            "u_id": _current_user_id(data),
            "outfit_name": _scalar(data, "outfit_name", "Outfit Record"),
            "season": data.get("season", ""),
            "occasion": data.get("occasion", ""),
            "image_url": data.get("image_url", ""),
            "item_ids": item_ids,
        }
    )
    return jsonify({"success": True, "outfit_id": outfit_id}), 201


@app.route("/api/records/<int:outfit_id>", methods=["PUT", "DELETE"])
def api_record_detail(outfit_id):
    data = _payload()
    datetime_str = _scalar(data, "datetime", "")
    
    if request.method == "DELETE":
        Record.delete(outfit_id, datetime_str)
        return jsonify({"success": True})
    
    if request.method == "PUT":
        Record.update(outfit_id, datetime_str, {
            "rating": int(_scalar(data, "rating", 0) or 0) or None,
            "weather": _scalar(data, "weather", ""),
            "mood": _scalar(data, "mood", ""),
            "note": _scalar(data, "note", ""),
            "outfit_name": _scalar(data, "outfit_name", ""),
            "outfit_note": _scalar(data, "outfit_note", ""),
            "season": _scalar(data, "season", ""),
            "occasion": _scalar(data, "occasion", ""),
        })
        return jsonify({"success": True})


@app.route("/api/options")
def api_options():
    return jsonify(ClothItem.options())


@app.route("/api/reports")
def api_reports():
    return jsonify(Reports.overview(_current_user_id()))


if __name__ == "__main__":
    app.run(debug=True)
