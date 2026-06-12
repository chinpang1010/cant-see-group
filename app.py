# Main Flask application for the wardrobe management system
# This file defines page routes and API endpoints used by the frontend

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
SEASONS = ("Spring", "Summer", "Autumn", "Winter")

init_db()


# Helper functions for request data, login checks, and API responses
def _payload():
    return request.get_json(silent=True) or request.form.to_dict(flat=False) or {}


def _scalar(data, key, default=""):
    value = data.get(key, default)
    if isinstance(value, list):
        return value[0] if value else default
    return value


def _authenticated_user_id():
    try:
        return int(session["u_id"])
    except (KeyError, TypeError, ValueError):
        return None


def _item_ids(data):
    values = data.get("item_ids", [])
    if isinstance(values, str):
        values = values.split(",")

    item_ids = []
    for value in values:
        try:
            item_id = int(str(value).strip())
        except (TypeError, ValueError):
            continue
        if item_id not in item_ids:
            item_ids.append(item_id)
    return item_ids


def _rating(data):
    value = _scalar(data, "rating", 0)
    if value in (None, "", 0, "0"):
        return None
    try:
        value = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError("Rating must be between 1 and 5.") from error
    if value not in range(1, 6):
        raise ValueError("Rating must be between 1 and 5.")
    return value


def _season_values(data):
    value = data.get("season", "")
    values = value if isinstance(value, list) else str(value).split(",")
    canonical = {season.lower(): season for season in SEASONS}
    seasons = []

    for item in values:
        text = str(item).strip()
        if not text:
            continue
        season = canonical.get(text.lower())
        if not season:
            raise ValueError(
                f"Season must be one of: {', '.join(SEASONS)}."
            )
        if season not in seasons:
            seasons.append(season)
    return seasons


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
    if not session.get("u_id"):
        return redirect(url_for("index"))
    return render_template("record.html", seasons=SEASONS)


@app.route("/record.html")
def record_alias():
    return redirect(url_for("record"))


@app.route("/outfits")
def outfits():
    if not session.get("u_id"):
        return redirect(url_for("index"))
    return render_template("outfits.html", seasons=SEASONS)


@app.route("/outfits.html")
def outfits_alias():
    return redirect(url_for("outfits"))


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


# Authentication APIs: login, signup, and logout
# After login, user information is stored in Flask session
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


# Save uploaded clothing or outfit images into the static/uploads folder
# The filename is changed to a random UUID to avoid duplicate names
@app.route("/api/uploads", methods=["POST"])
def api_upload_image():
    if _authenticated_user_id() is None:
        return _error("Log in to upload images.", 401)

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


# Wardrobe APIs: load, create, rename, and delete wardrobes
# Each wardrobe belongs to the currently logged-in user
@app.route("/api/wardrobes", methods=["GET", "POST"])
def api_wardrobes():
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage wardrobes.", 401)

    if request.method == "GET":
        return _json_rows(Closet.get_all(user_id))

    data = _payload()
    name = (_scalar(data, "c_name") or _scalar(data, "name") or "").strip()
    if not name:
        return _error("Wardrobe name is required.")
    closet_id = Closet.add({"c_name": name, "u_id": user_id})
    closet = Closet.get(closet_id)
    return jsonify({"success": True, "closet": dict(closet)}), 201


# Update or delete one wardrobe after checking ownership
@app.route("/api/wardrobes/<int:closet_id>", methods=["PUT", "DELETE"])
def api_wardrobe_detail(closet_id):
    user_id = _authenticated_user_id()
    closet = Closet.get(closet_id)
    if user_id is None:
        return _error("Log in to manage wardrobes.", 401)
    if not closet or closet["u_id"] != user_id:
        return _error("Wardrobe not found.", 404)

    if request.method == "DELETE":
        reference_count = Closet.outfit_reference_count(closet_id)
        if reference_count:
            return _error(
                f"This wardrobe contains items used by {reference_count} outfit(s). Update or delete those outfits first.",
                409,
            )
        Closet.delete(closet_id)
        return jsonify({"success": True})

    data = _payload()
    name = (_scalar(data, "c_name") or _scalar(data, "name") or "").strip()
    if not name:
        return _error("Wardrobe name is required.")
    Closet.update(closet_id, {"c_name": name})
    return jsonify({"success": True, "closet": dict(Closet.get(closet_id))})


# Load clothing items from one wardrobe
@app.route("/api/closet/<int:closet_id>/items")
def api_closet_items(closet_id):
    user_id = _authenticated_user_id()
    closet = Closet.get(closet_id)
    if user_id is None:
        return _error("Log in to view clothing items.", 401)
    if not closet or closet["u_id"] != user_id:
        return _error("Wardrobe not found.", 404)
    return _json_rows(ClothItem.get_by_closet(closet_id, _item_filters()))


# Clothing item APIs: search, create, update, and delete clothing items
# Items can be filtered by keyword, category, color, and tag
@app.route("/api/items", methods=["GET", "POST"])
def api_items():
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage clothing items.", 401)

    if request.method == "GET":
        filters = _item_filters()
        filters["user_id"] = user_id
        closet_id = request.args.get("c_id") or request.args.get("closet_id")
        if closet_id:
            filters["closet_id"] = int(closet_id)
        return _json_rows(ClothItem.search(filters))

    data = _payload()
    item_name = (_scalar(data, "item_name") or "").strip()
    if not item_name:
        return _error("Item name is required.")

    closet_id = int(_scalar(data, "c_id", 0) or 0)
    closet = Closet.get(closet_id)
    if not closet or closet["u_id"] != user_id:
        return _error("Wardrobe not found.", 404)

    item_id = ClothItem.add(
        {
            "item_name": item_name,
            "size": _scalar(data, "size", ""),
            "last_worn": _scalar(data, "last_worn", ""),
            "tag": data.get("tag", ""),
            "category": data.get("category", ""),
            "color": data.get("color", ""),
            "image_url": data.get("image_url", ""),
            "c_id": closet_id,
        }
    )
    return jsonify({"success": True, "item": dict(ClothItem.get(item_id))}), 201


@app.route("/api/items/<int:item_id>", methods=["GET", "PUT", "PATCH", "DELETE"])
def api_item_detail(item_id):
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage clothing items.", 401)

    item = ClothItem.get(item_id)
    if not item or item["u_id"] != user_id:
        return _error("Item not found.", 404)

    if request.method == "GET":
        return jsonify(dict(item))

    if request.method == "DELETE":
        reference_count = ClothItem.outfit_reference_count(item_id, user_id)
        if reference_count:
            return _error(
                f"This item is used by {reference_count} outfit(s). Update or delete those outfits first.",
                409,
            )
        ClothItem.delete(item_id)
        return jsonify({"success": True})

    data = _payload()
    closet_id = int(_scalar(data, "c_id", item["c_id"]) or item["c_id"])
    closet = Closet.get(closet_id)
    if not closet or closet["u_id"] != user_id:
        return _error("Wardrobe not found.", 404)
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
            "c_id": closet_id,
        },
    )
    if not ok:
        return _error("Item not found.", 404)
    return jsonify({"success": True, "item": dict(ClothItem.get(item_id))})


# Outfit APIs: create and manage reusable outfits
# An outfit is made by combining multiple clothing items
@app.route("/api/outfits", methods=["GET", "POST"])
def api_outfits():
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage outfits.", 401)

    if request.method == "GET":
        return _json_rows(Outfit.get_all(user_id))

    data = _payload()
    item_ids = _item_ids(data)
    name = (_scalar(data, "outfit_name") or "").strip()
    if not name:
        return _error("Outfit name is required.")
    if not item_ids:
        return _error("Select at least one clothing item.")

    owned_item_ids = ClothItem.owned_ids(user_id, item_ids)
    if set(owned_item_ids) != set(item_ids):
        return _error("One or more clothing items do not belong to this user.", 403)

    try:
        seasons = _season_values(data)
    except ValueError as error:
        return _error(str(error))

    outfit_id = Outfit.add(
        {
            "u_id": user_id,
            "outfit_name": name,
            "note": _scalar(data, "note", ""),
            "season": seasons,
            "occasion": data.get("occasion", ""),
            "image_url": data.get("image_url", ""),
        },
        item_ids,
    )
    return jsonify({"success": True, "outfit_id": outfit_id}), 201


# Manage one outfit and keep its item list fixed after it has wear records
@app.route("/api/outfits/<int:outfit_id>", methods=["GET", "PUT", "DELETE"])
def api_outfit_detail(outfit_id):
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage outfits.", 401)

    outfit = Outfit.get(outfit_id, user_id)
    if not outfit:
        return _error("Outfit not found.", 404)

    if request.method == "GET":
        result = dict(outfit)
        result["item_ids"] = Outfit.get_item_ids(outfit_id)
        result["items"] = [dict(row) for row in Outfit.get_items(outfit_id)]
        return jsonify(result)

    if request.method == "DELETE":
        Outfit.delete(outfit_id, user_id)
        return jsonify({"success": True})

    data = _payload()
    name = (_scalar(data, "outfit_name") or "").strip()
    item_ids = _item_ids(data)
    if not name:
        return _error("Outfit name is required.")
    if not item_ids:
        return _error("Select at least one clothing item.")

    owned_item_ids = ClothItem.owned_ids(user_id, item_ids)
    if set(owned_item_ids) != set(item_ids):
        return _error("One or more clothing items do not belong to this user.", 403)
    if outfit["worn_count"] and set(item_ids) != set(Outfit.get_item_ids(outfit_id)):
        return _error(
            "Clothing items cannot be changed after an outfit has wear records. Create a new outfit instead.",
            409,
        )

    try:
        seasons = _season_values(data)
    except ValueError as error:
        return _error(str(error))

    Outfit.update(
        outfit_id,
        user_id,
        {
            "outfit_name": name,
            "note": _scalar(data, "note", ""),
            "season": seasons,
            "occasion": data.get("occasion", ""),
            "image_url": data.get("image_url", ""),
        },
        item_ids,
    )
    return jsonify({"success": True, "outfit_id": outfit_id})


# Wear record APIs: record what the user wore on a specific date
# A record can reuse an existing outfit or create a new one from selected items
@app.route("/api/records", methods=["GET", "POST"])
def api_records():
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage records.", 401)

    if request.method == "GET":
        return _json_rows(Record.get_all(user_id))

    data = _payload()
    item_ids = _item_ids(data)
    outfit_id = _scalar(data, "outfit_id", None)
    try:
        outfit_id = int(outfit_id) if outfit_id else None
    except (TypeError, ValueError):
        return _error("Invalid outfit.")

    if outfit_id:
        if not Outfit.get(outfit_id, user_id):
            return _error("Outfit not found.", 404)
        item_ids = []
    elif not item_ids:
        return _error("Select at least one clothing item for the outfit.")
    else:
        owned_item_ids = ClothItem.owned_ids(user_id, item_ids)
        if set(owned_item_ids) != set(item_ids):
            return _error("One or more clothing items do not belong to this user.", 403)

    try:
        rating = _rating(data)
        seasons = _season_values(data) if not outfit_id else []
        outfit_id = Record.add(
            {
                "datetime": _scalar(data, "datetime", ""),
                "weather": _scalar(data, "weather", ""),
                "mood": _scalar(data, "mood", ""),
                "rating": rating,
                "note": _scalar(data, "note", ""),
                "outfit_id": outfit_id,
                "owner_id": user_id,
                "outfit_name": _scalar(data, "outfit_name", "Outfit Record"),
                "outfit_note": _scalar(data, "outfit_note", ""),
                "season": seasons,
                "occasion": data.get("occasion", ""),
                "image_url": data.get("image_url", ""),
                "item_ids": item_ids,
            }
        )
    except ValueError as error:
        return _error(str(error))
    except IntegrityError:
        DB.rollback()
        return _error("This outfit already has a record for that date.", 409)
    return jsonify({"success": True, "outfit_id": outfit_id}), 201


# Update or delete one wear record using the outfit ID and record date
@app.route("/api/records/<int:outfit_id>", methods=["PUT", "DELETE"])
def api_record_detail(outfit_id):
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to manage records.", 401)
    if not Outfit.get(outfit_id, user_id):
        return _error("Outfit not found.", 404)

    data = _payload()
    datetime_str = _scalar(data, "datetime", "")
    if not datetime_str:
        return _error("Record date is required.")
    
    if request.method == "DELETE":
        result = Record.delete(outfit_id, datetime_str, user_id)
        if not result["record_deleted"]:
            return _error("Record not found.", 404)
        return jsonify({"success": True, **result})
    
    if request.method == "PUT":
        try:
            rating = _rating(data)
        except ValueError as error:
            return _error(str(error))
        updated = Record.update(
            outfit_id,
            datetime_str,
            {
                "rating": rating,
                "weather": _scalar(data, "weather", ""),
                "mood": _scalar(data, "mood", ""),
                "note": _scalar(data, "note", ""),
            },
        )
        if not updated:
            return _error("Record not found.", 404)
        return jsonify({"success": True})


# Load form options such as categories, colors, tags, closets, and outfits
@app.route("/api/options")
def api_options():
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to view clothing options.", 401)
    return jsonify(ClothItem.options(user_id))


# Report API used by the dashboard to summarize wardrobe usage
@app.route("/api/reports")
def api_reports():
    user_id = _authenticated_user_id()
    if user_id is None:
        return _error("Log in to view reports.", 401)
    return jsonify(Reports.overview(user_id))


if __name__ == "__main__":
    app.run(debug=True)
