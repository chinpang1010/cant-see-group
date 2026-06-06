from datetime import datetime
from pathlib import Path

from api.link import connection


ROOT_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT_DIR / "db/schema.sql"


class DB:
    @staticmethod
    def connect():
        connection.execute("PRAGMA foreign_keys = ON")
        return connection.cursor()

    @staticmethod
    def execute(sql, params=()):
        cursor = DB.connect()
        cursor.execute(sql, params)
        return cursor

    @staticmethod
    def executemany(sql, rows):
        cursor = DB.connect()
        cursor.executemany(sql, rows)
        return cursor

    @staticmethod
    def executescript(sql):
        cursor = DB.connect()
        cursor.executescript(sql)
        return cursor

    @staticmethod
    def fetchall(sql, params=()):
        return DB.execute(sql, params).fetchall()

    @staticmethod
    def fetchone(sql, params=()):
        return DB.execute(sql, params).fetchone()

    @staticmethod
    def commit():
        connection.commit()

    @staticmethod
    def rollback():
        connection.rollback()


def _today():
    return datetime.now().strftime("%Y-%m-%d")


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        values = value
    else:
        values = str(value).split(",")
    cleaned = []
    for item in values:
        text = str(item).strip()
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def _row_to_dict(row):
    return dict(row) if row else None


def init_db():
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    DB.executescript(schema_sql)
    DB.commit()
    seed_data()


def seed_data():
    if DB.fetchone("SELECT COUNT(*) FROM USER")[0] > 0:
        return

    DB.executemany(
        "INSERT INTO USER (username, password, gender, role) VALUES (?, ?, ?, ?)",
        [
            ("student", "1234", "female", "user"),
            ("manager", "1234", "prefer not to say", "manager"),
        ],
    )
    student_id = DB.fetchone("SELECT u_id FROM USER WHERE username = ?", ("student",))[0]

    DB.executemany(
        "INSERT INTO CLOSET (c_name, u_id) VALUES (?, ?)",
        [
            ("Daily Closet", student_id),
            ("Formal Closet", student_id),
            ("Sport Closet", student_id),
        ],
    )

    closet_ids = {
        row["c_name"]: row["c_id"]
        for row in DB.fetchall("SELECT c_id, c_name FROM CLOSET WHERE u_id = ?", (student_id,))
    }
    sample_items = [
        (closet_ids["Daily Closet"], "White Cotton Tee", "M", "2026-05-01", "basic", "Top", "White", "/static/img/student_clothes/white_tee.png"),
        (closet_ids["Daily Closet"], "Blue Wide Jeans", "L", "2026-05-08", "casual", "Bottom", "Blue", "/static/img/student_clothes/blue_jeans.png"),
        (closet_ids["Daily Closet"], "Cream Knit Cardigan", "F", "2026-04-15", "warm", "Outerwear", "Cream", "/static/img/student_clothes/cardigan.png"),
        (closet_ids["Daily Closet"], "Black Canvas Sneakers", "24", "2026-05-10", "versatile", "Shoes", "Black", "/static/img/student_clothes/sneakers.png"),
        (closet_ids["Formal Closet"], "Navy Blazer", "M", "2026-05-05", "formal", "Outerwear", "Navy", "/static/img/student_clothes/blazer.png"),
        (closet_ids["Formal Closet"], "Grey Pleated Skirt", "S", "2026-04-20", "work", "Bottom", "Grey", "/static/img/student_clothes/skirt.png"),
        (closet_ids["Sport Closet"], "Green Training Top", "M", "2026-05-11", "sport", "Top", "Green", "/static/img/student_clothes/training_top.png"),
    ]

    for item in sample_items:
        ClothItem.add(
            {
                "c_id": item[0],
                "item_name": item[1],
                "size": item[2],
                "last_worn": item[3],
                "tag": item[4],
                "category": item[5],
                "color": item[6],
                "image_url": item[7],
            },
            commit=False,
        )
    DB.commit()

    outfit_id = Outfit.add(
        {
            "u_id": student_id,
            "outfit_name": "Campus Comfort",
            "note": "Easy to move around campus all day.",
            "season": "Spring",
            "occasion": "Class",
            "image_url": "",
        },
        [1, 2, 4],
        commit=False,
    )
    DB.execute(
        """
        INSERT OR IGNORE INTO RECORD
            (outfit_id, datetime, rating, weather, note, mood)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (outfit_id, "2026-05-20 08:30:00", 4, "Sunny", "Comfortable class outfit.", "Happy"),
    )
    DB.commit()


class Member:
    @staticmethod
    def get_member(username):
        return DB.fetchall(
            "SELECT username, password, u_id, role FROM USER WHERE username = ?",
            (username,),
        )

    @staticmethod
    def get_all_account():
        return DB.fetchall("SELECT username FROM USER ORDER BY username")

    @staticmethod
    def create_member(data):
        DB.execute(
            """
            INSERT INTO USER (username, password, gender, role)
            VALUES (?, ?, ?, ?)
            """,
            (
                data["username"],
                data["password"],
                data.get("gender", ""),
                data.get("role", "user"),
            ),
        )
        user_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        DB.execute(
            "INSERT INTO CLOSET (c_name, u_id) VALUES (?, ?)",
            (data.get("closet_name", "My Closet"), user_id),
        )
        DB.commit()
        return user_id

    @staticmethod
    def verify(username, password):
        row = DB.fetchone(
            """
            SELECT u_id, username, role
            FROM USER
            WHERE username = ? AND password = ?
            """,
            (username, password),
        )
        return _row_to_dict(row)

    @staticmethod
    def get_role(user_id):
        return DB.fetchone("SELECT role, username FROM USER WHERE u_id = ?", (user_id,))


class Closet:
    @staticmethod
    def get_all(user_id=None):
        sql = "SELECT c_id, c_name, u_id FROM CLOSET"
        params = []
        if user_id:
            sql += " WHERE u_id = ?"
            params.append(user_id)
        return DB.fetchall(sql + " ORDER BY c_id", tuple(params))

    @staticmethod
    def get(closet_id):
        return DB.fetchone("SELECT c_id, c_name, u_id FROM CLOSET WHERE c_id = ?", (closet_id,))

    @staticmethod
    def add(data):
        DB.execute(
            "INSERT INTO CLOSET (c_name, u_id) VALUES (?, ?)",
            (data["c_name"], data.get("u_id", 1)),
        )
        closet_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        DB.commit()
        return closet_id

    @staticmethod
    def update(closet_id, data):
        DB.execute(
            "UPDATE CLOSET SET c_name = ? WHERE c_id = ?",
            (data["c_name"], closet_id),
        )
        DB.commit()

    @staticmethod
    def delete(closet_id):
        DB.execute("DELETE FROM CLOSET WHERE c_id = ?", (closet_id,))
        DB.commit()


class ClothItem:
    BASE_SELECT = """
        SELECT
            I.item_id,
            I.c_id,
            I.item_name,
            I.size,
            I.last_worn,
            C.c_name,
            GROUP_CONCAT(DISTINCT T.tag) AS tag,
            GROUP_CONCAT(DISTINCT K.category) AS category,
            GROUP_CONCAT(DISTINCT L.color) AS color,
            GROUP_CONCAT(DISTINCT M.image_url) AS image_url
        FROM CLOTH_ITEM I
        JOIN CLOSET C ON I.c_id = C.c_id
        LEFT JOIN CLOTH_TAG T ON I.item_id = T.item_id
        LEFT JOIN CLOTH_CATEGORY K ON I.item_id = K.item_id
        LEFT JOIN CLOTH_COLOR L ON I.item_id = L.item_id
        LEFT JOIN CLOTH_IMG M ON I.item_id = M.item_id
    """

    @staticmethod
    def _filters(filters=None):
        filters = filters or {}
        clauses = []
        params = []

        if filters.get("closet_id"):
            clauses.append("I.c_id = ?")
            params.append(filters["closet_id"])

        if filters.get("q"):
            like = f"%{filters['q'].lower()}%"
            clauses.append(
                """
                (
                    LOWER(I.item_name) LIKE ?
                    OR LOWER(COALESCE(T.tag, '')) LIKE ?
                    OR LOWER(COALESCE(K.category, '')) LIKE ?
                    OR LOWER(COALESCE(L.color, '')) LIKE ?
                    OR LOWER(COALESCE(I.size, '')) LIKE ?
                )
                """
            )
            params.extend([like, like, like, like, like])

        for key, alias, column in [
            ("category", "K", "category"),
            ("color", "L", "color"),
            ("tag", "T", "tag"),
        ]:
            if filters.get(key):
                clauses.append(f"{alias}.{column} = ?")
                params.append(filters[key])

        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        return where, tuple(params)

    @staticmethod
    def search(filters=None):
        where, params = ClothItem._filters(filters)
        sql = (
            ClothItem.BASE_SELECT
            + where
            + """
            GROUP BY I.item_id
            ORDER BY
                CASE WHEN I.last_worn IS NULL OR I.last_worn = '' THEN 0 ELSE 1 END,
                I.last_worn ASC,
                I.item_name ASC
            """
        )
        return DB.fetchall(sql, params)

    @staticmethod
    def get_by_closet(closet_id, filters=None):
        filters = dict(filters or {})
        filters["closet_id"] = closet_id
        return ClothItem.search(filters)

    @staticmethod
    def get(item_id):
        sql = ClothItem.BASE_SELECT + " WHERE I.item_id = ? GROUP BY I.item_id"
        return DB.fetchone(sql, (item_id,))

    @staticmethod
    def _replace_values(table, column, item_id, values):
        DB.execute(f"DELETE FROM {table} WHERE item_id = ?", (item_id,))
        for value in _as_list(values):
            DB.execute(
                f"INSERT OR IGNORE INTO {table} (item_id, {column}) VALUES (?, ?)",
                (item_id, value),
            )

    @staticmethod
    def add(data, commit=True):
        DB.execute(
            """
            INSERT INTO CLOTH_ITEM (c_id, item_name, size, last_worn)
            VALUES (?, ?, ?, ?)
            """,
            (
                data.get("c_id", 1),
                data["item_name"],
                data.get("size", ""),
                data.get("last_worn", ""),
            ),
        )
        item_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        ClothItem._replace_values("CLOTH_TAG", "tag", item_id, data.get("tag", ""))
        ClothItem._replace_values("CLOTH_CATEGORY", "category", item_id, data.get("category", ""))
        ClothItem._replace_values("CLOTH_COLOR", "color", item_id, data.get("color", ""))
        ClothItem._replace_values("CLOTH_IMG", "image_url", item_id, data.get("image_url", ""))
        if commit:
            DB.commit()
        return item_id

    @staticmethod
    def update(item_id, data):
        current = ClothItem.get(item_id)
        if not current:
            return False
        DB.execute(
            """
            UPDATE CLOTH_ITEM
            SET c_id = ?, item_name = ?, size = ?, last_worn = ?
            WHERE item_id = ?
            """,
            (
                data.get("c_id", current["c_id"]),
                data.get("item_name", current["item_name"]),
                data.get("size", current["size"] or ""),
                data.get("last_worn", current["last_worn"] or ""),
                item_id,
            ),
        )
        if "tag" in data:
            ClothItem._replace_values("CLOTH_TAG", "tag", item_id, data.get("tag", ""))
        if "category" in data:
            ClothItem._replace_values("CLOTH_CATEGORY", "category", item_id, data.get("category", ""))
        if "color" in data:
            ClothItem._replace_values("CLOTH_COLOR", "color", item_id, data.get("color", ""))
        if "image_url" in data:
            ClothItem._replace_values("CLOTH_IMG", "image_url", item_id, data.get("image_url", ""))
        DB.commit()
        return True

    @staticmethod
    def delete(item_id):
        DB.execute("DELETE FROM CLOTH_ITEM WHERE item_id = ?", (item_id,))
        DB.commit()

    @staticmethod
    def touch_worn(item_ids, worn_date):
        for item_id in _as_list(item_ids):
            DB.execute(
                "UPDATE CLOTH_ITEM SET last_worn = ? WHERE item_id = ?",
                (worn_date, item_id),
            )

    @staticmethod
    def options():
        return {
            "categories": [row[0] for row in DB.fetchall("SELECT DISTINCT category FROM CLOTH_CATEGORY WHERE category <> '' ORDER BY category")],
            "colors": [row[0] for row in DB.fetchall("SELECT DISTINCT color FROM CLOTH_COLOR WHERE color <> '' ORDER BY color")],
            "tags": [row[0] for row in DB.fetchall("SELECT DISTINCT tag FROM CLOTH_TAG WHERE tag <> '' ORDER BY tag")],
        }


class Outfit:
    @staticmethod
    def _replace_values(table, column, outfit_id, values):
        DB.execute(f"DELETE FROM {table} WHERE outfit_id = ?", (outfit_id,))
        for value in _as_list(values):
            DB.execute(
                f"INSERT OR IGNORE INTO {table} (outfit_id, {column}) VALUES (?, ?)",
                (outfit_id, value),
            )

    @staticmethod
    def add(data, item_ids=None, commit=True):
        DB.execute(
            """
            INSERT INTO OUTFIT (u_id, outfit_name, note, created_date)
            VALUES (?, ?, ?, ?)
            """,
            (
                data.get("u_id", 1),
                data["outfit_name"],
                data.get("note", ""),
                data.get("created_date", _today()),
            ),
        )
        outfit_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        Outfit._replace_values("OUTFIT_IMG", "image_url", outfit_id, data.get("image_url", ""))
        Outfit._replace_values("OUTFIT_SEASON", "season", outfit_id, data.get("season", ""))
        Outfit._replace_values("OUTFIT_OCCASION", "occasion", outfit_id, data.get("occasion", ""))

        for item_id in _as_list(item_ids):
            DB.execute(
                "INSERT OR IGNORE INTO INCLUDES (outfit_id, item_id) VALUES (?, ?)",
                (outfit_id, item_id),
            )
        if commit:
            DB.commit()
        return outfit_id

    @staticmethod
    def get_all(user_id=None):
        sql = """
            SELECT
                O.outfit_id,
                O.u_id,
                O.outfit_name,
                O.note,
                O.created_date,
                GROUP_CONCAT(DISTINCT S.season) AS season,
                GROUP_CONCAT(DISTINCT A.occasion) AS occasion,
                GROUP_CONCAT(DISTINCT G.image_url) AS image_url,
                COUNT(DISTINCT I.item_id) AS item_count
            FROM OUTFIT O
            LEFT JOIN OUTFIT_SEASON S ON O.outfit_id = S.outfit_id
            LEFT JOIN OUTFIT_OCCASION A ON O.outfit_id = A.outfit_id
            LEFT JOIN OUTFIT_IMG G ON O.outfit_id = G.outfit_id
            LEFT JOIN INCLUDES I ON O.outfit_id = I.outfit_id
        """
        params = []
        if user_id:
            sql += " WHERE O.u_id = ?"
            params.append(user_id)
        sql += " GROUP BY O.outfit_id ORDER BY O.created_date DESC, O.outfit_id DESC"
        return DB.fetchall(sql, tuple(params))

    @staticmethod
    def get_item_ids(outfit_id):
        rows = DB.fetchall("SELECT item_id FROM INCLUDES WHERE outfit_id = ?", (outfit_id,))
        return [row["item_id"] for row in rows]

    @staticmethod
    def delete(outfit_id):
        DB.execute("DELETE FROM OUTFIT WHERE outfit_id = ?", (outfit_id,))
        DB.commit()


class Record:
    @staticmethod
    def add(data):
        outfit_id = data.get("outfit_id")
        item_ids = _as_list(data.get("item_ids", []))

        if not outfit_id:
            outfit_id = Outfit.add(
                {
                    "u_id": data.get("u_id", 1),
                    "outfit_name": data.get("outfit_name", "Outfit Record"),
                    "note": data.get("note", ""),
                    "season": data.get("season", ""),
                    "occasion": data.get("occasion", ""),
                    "image_url": data.get("image_url", ""),
                    "created_date": data.get("datetime", _today())[:10],
                },
                item_ids,
                commit=False,
            )
        elif not item_ids:
            item_ids = Outfit.get_item_ids(outfit_id)

        record_datetime = data.get("datetime") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        DB.execute(
            """
            INSERT OR REPLACE INTO RECORD
                (outfit_id, datetime, rating, weather, note, mood)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                outfit_id,
                record_datetime,
                data.get("rating"),
                data.get("weather", ""),
                data.get("note", ""),
                data.get("mood", ""),
            ),
        )
        ClothItem.touch_worn(item_ids, record_datetime[:10])
        DB.commit()
        return outfit_id

    @staticmethod
    def get_all(user_id=None):
        sql = """
            SELECT
                R.outfit_id,
                R.datetime,
                R.weather,
                R.mood,
                R.rating,
                R.note,
                O.outfit_name,
                GROUP_CONCAT(DISTINCT S.season) AS season,
                GROUP_CONCAT(DISTINCT A.occasion) AS occasion,
                COUNT(DISTINCT I.item_id) AS item_count
            FROM RECORD R
            JOIN OUTFIT O ON R.outfit_id = O.outfit_id
            LEFT JOIN OUTFIT_SEASON S ON O.outfit_id = S.outfit_id
            LEFT JOIN OUTFIT_OCCASION A ON O.outfit_id = A.outfit_id
            LEFT JOIN INCLUDES I ON O.outfit_id = I.outfit_id
        """
        params = []
        if user_id:
            sql += " WHERE O.u_id = ?"
            params.append(user_id)
        sql += " GROUP BY R.outfit_id, R.datetime ORDER BY R.datetime DESC"
        return DB.fetchall(sql, tuple(params))


class Reports:
    @staticmethod
    def overview(user_id=1):
        totals = DB.fetchone(
            """
            SELECT
                (SELECT COUNT(*) FROM CLOSET WHERE u_id = ?) AS closet_count,
                (SELECT COUNT(*)
                 FROM CLOTH_ITEM I
                 JOIN CLOSET C ON I.c_id = C.c_id
                 WHERE C.u_id = ?) AS item_count,
                (SELECT COUNT(*) FROM OUTFIT WHERE u_id = ?) AS outfit_count,
                (SELECT COUNT(*)
                 FROM RECORD R
                 JOIN OUTFIT O ON R.outfit_id = O.outfit_id
                 WHERE O.u_id = ?) AS record_count
            """,
            (user_id, user_id, user_id, user_id),
        )
        return {
            "totals": _row_to_dict(totals),
            "category_counts": [dict(row) for row in Reports.category_counts(user_id)],
            "most_worn": [dict(row) for row in Reports.item_usage(user_id, "DESC")],
            "least_worn": [dict(row) for row in Reports.item_usage(user_id, "ASC")],
            "outfit_reuse": [dict(row) for row in Reports.outfit_reuse(user_id)],
            "recent_records": [dict(row) for row in Record.get_all(user_id)[:5]],
        }

    @staticmethod
    def category_counts(user_id=1):
        return DB.fetchall(
            """
            SELECT COALESCE(K.category, 'Uncategorized') AS category,
                   COUNT(DISTINCT I.item_id) AS item_count
            FROM CLOTH_ITEM I
            JOIN CLOSET C ON I.c_id = C.c_id
            LEFT JOIN CLOTH_CATEGORY K ON I.item_id = K.item_id
            WHERE C.u_id = ?
            GROUP BY COALESCE(K.category, 'Uncategorized')
            ORDER BY item_count DESC, category ASC
            """,
            (user_id,),
        )

    @staticmethod
    def item_usage(user_id=1, direction="DESC"):
        direction = "ASC" if direction.upper() == "ASC" else "DESC"
        return DB.fetchall(
            f"""
            SELECT
                I.item_id,
                I.item_name,
                GROUP_CONCAT(DISTINCT K.category) AS category,
                GROUP_CONCAT(DISTINCT L.color) AS color,
                I.last_worn,
                COUNT(DISTINCT CASE
                    WHEN R.datetime IS NOT NULL THEN R.outfit_id || '|' || R.datetime
                END) AS wear_count
            FROM CLOTH_ITEM I
            JOIN CLOSET C ON I.c_id = C.c_id
            LEFT JOIN CLOTH_CATEGORY K ON I.item_id = K.item_id
            LEFT JOIN CLOTH_COLOR L ON I.item_id = L.item_id
            LEFT JOIN INCLUDES N ON I.item_id = N.item_id
            LEFT JOIN RECORD R ON N.outfit_id = R.outfit_id
            WHERE C.u_id = ?
            GROUP BY I.item_id
            ORDER BY wear_count {direction}, I.last_worn ASC, I.item_name ASC
            LIMIT 5
            """,
            (user_id,),
        )

    @staticmethod
    def outfit_reuse(user_id=1):
        return DB.fetchall(
            """
            SELECT O.outfit_id,
                   O.outfit_name,
                   COUNT(R.datetime) AS worn_times,
                   MAX(R.datetime) AS last_recorded
            FROM OUTFIT O
            LEFT JOIN RECORD R ON O.outfit_id = R.outfit_id
            WHERE O.u_id = ?
            GROUP BY O.outfit_id
            ORDER BY worn_times DESC, O.created_date DESC
            LIMIT 5
            """,
            (user_id,),
        )
