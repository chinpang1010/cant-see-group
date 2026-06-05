from link import connection


class DB:
    @staticmethod
    def connect():
        return connection.cursor()

    @staticmethod
    def execute(sql, params=()):
        cursor = DB.connect()
        cursor.execute(sql, params)
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


def init_db():
    cursor = DB.connect()
    cursor.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS USER (
            u_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            gender TEXT,
            role TEXT NOT NULL DEFAULT 'user'
        );

        CREATE TABLE IF NOT EXISTS CLOSET (
            c_id INTEGER PRIMARY KEY AUTOINCREMENT,
            c_name TEXT NOT NULL,
            u_id INTEGER NOT NULL,
            FOREIGN KEY (u_id) REFERENCES USER(u_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CLOTH_ITEM (
            item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            c_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            size TEXT,
            last_worn TEXT,
            FOREIGN KEY (c_id) REFERENCES CLOSET(c_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CLOTH_TAG (
            item_id INTEGER PRIMARY KEY,
            tag TEXT,
            FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CLOTH_CATEGORY (
            item_id INTEGER PRIMARY KEY,
            category TEXT,
            FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CLOTH_COLOR (
            item_id INTEGER PRIMARY KEY,
            color TEXT,
            FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CLOTH_IMG (
            item_id INTEGER PRIMARY KEY,
            image_url TEXT,
            FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS OUTFIT (
            outfit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            u_id INTEGER NOT NULL,
            outfit_name TEXT NOT NULL,
            note TEXT,
            created_date TEXT NOT NULL,
            FOREIGN KEY (u_id) REFERENCES USER(u_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS OUTFIT_IMG (
            outfit_id INTEGER PRIMARY KEY,
            image_url TEXT,
            FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS OUTFIT_SEASON (
            outfit_id INTEGER PRIMARY KEY,
            season TEXT,
            FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS OUTFIT_OCCASION (
            outfit_id INTEGER PRIMARY KEY,
            occasion TEXT,
            FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS INCLUDES (
            outfit_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            PRIMARY KEY (outfit_id, item_id),
            FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS RECORD (
            record_id INTEGER PRIMARY KEY AUTOINCREMENT,
            datetime TEXT NOT NULL,
            weather TEXT,
            mood TEXT,
            rating INTEGER,
            note TEXT,
            outfit_id INTEGER NOT NULL,
            FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
        );
        """
    )
    DB.commit()
    seed_data()


def seed_data():
    if DB.fetchone("SELECT COUNT(*) FROM USER")[0] > 0:
        return

    DB.execute(
        "INSERT INTO USER (username, password, gender, role) VALUES (?, ?, ?, ?)",
        ("student", "1234", "女", "user"),
    )
    DB.execute(
        "INSERT INTO USER (username, password, gender, role) VALUES (?, ?, ?, ?)",
        ("manager", "1234", "不限", "manager"),
    )
    DB.commit()

    student_id = DB.fetchone("SELECT u_id FROM USER WHERE username = ?", ("student",))[0]
    DB.execute("INSERT INTO CLOSET (c_name, u_id) VALUES (?, ?)", ("日常衣櫃", student_id))
    DB.commit()
    closet_id = DB.fetchone("SELECT c_id FROM CLOSET WHERE u_id = ?", (student_id,))[0]

    sample_items = [
        ("白色短袖上衣", "M", "2026-05-01", "基本款", "上衣", "白色", ""),
        ("牛仔寬褲", "L", "2026-05-08", "休閒", "下身", "藍色", ""),
        ("米色針織外套", "F", "2026-04-15", "保暖", "外套", "米色", ""),
        ("黑色帆布鞋", "24", "2026-05-10", "百搭", "鞋子", "黑色", ""),
    ]

    for item_name, size, last_worn, tag, category, color, image_url in sample_items:
        DB.execute(
            "INSERT INTO CLOTH_ITEM (item_name, size, last_worn, c_id) VALUES (?, ?, ?, ?)",
            (item_name, size, last_worn, closet_id),
        )
        item_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        DB.execute("INSERT INTO CLOTH_TAG (item_id, tag) VALUES (?, ?)", (item_id, tag))
        DB.execute("INSERT INTO CLOTH_CATEGORY (item_id, category) VALUES (?, ?)", (item_id, category))
        DB.execute("INSERT INTO CLOTH_COLOR (item_id, color) VALUES (?, ?)", (item_id, color))
        DB.execute("INSERT INTO CLOTH_IMG (item_id, image_url) VALUES (?, ?)", (item_id, image_url))
    DB.commit()

    DB.execute(
        "INSERT INTO OUTFIT (u_id, outfit_name, note, created_date) VALUES (?, ?, ?, date('now'))",
        (student_id, "上課舒適穿搭", "簡單好活動，適合整天在校園走動。",),
    )
    outfit_id = DB.fetchone("SELECT last_insert_rowid()")[0]
    DB.execute("INSERT INTO OUTFIT_IMG (outfit_id, image_url) VALUES (?, ?)", (outfit_id, ""))
    DB.execute("INSERT INTO OUTFIT_SEASON (outfit_id, season) VALUES (?, ?)", (outfit_id, "春秋"))
    DB.execute("INSERT INTO OUTFIT_OCCASION (outfit_id, occasion) VALUES (?, ?)", (outfit_id, "上課"))

    DB.execute("INSERT INTO INCLUDES (outfit_id, item_id) VALUES (?, ?)", (outfit_id, 1))
    DB.execute("INSERT INTO INCLUDES (outfit_id, item_id) VALUES (?, ?)", (outfit_id, 2))
    DB.execute("INSERT INTO INCLUDES (outfit_id, item_id) VALUES (?, ?)", (outfit_id, 4))
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
        return DB.fetchall("SELECT username FROM USER")

    @staticmethod
    def create_member(data):
        DB.execute(
            "INSERT INTO USER (username, password, gender, role) VALUES (?, ?, ?, ?)",
            (data["name"], data["password"], data.get("gender", ""), data.get("identity", "user")),
        )
        DB.commit()
        user_id = DB.fetchone("SELECT u_id FROM USER WHERE username = ?", (data["name"],))[0]
        DB.execute("INSERT INTO CLOSET (c_name, u_id) VALUES (?, ?)", ("我的衣櫃", user_id))
        DB.commit()

    @staticmethod
    def get_role(user_id):
        return DB.fetchone("SELECT role, username FROM USER WHERE u_id = ?", (user_id,))


class Closet:
    @staticmethod
    def get_all(user_id=None):
        sql = "SELECT c_id, c_name, u_id FROM CLOSET"
        params = ()
        if user_id:
            sql += " WHERE u_id = ?"
            params = (user_id,)
        return DB.fetchall(sql + " ORDER BY c_id", params)

    @staticmethod
    def get(closet_id):
        return DB.fetchone("SELECT c_id, c_name, u_id FROM CLOSET WHERE c_id = ?", (closet_id,))


class ClothItem:
    @staticmethod
    def get_by_closet(closet_id):
        sql = """
            SELECT I.item_id, I.item_name, I.size, I.last_worn,
                   C.c_name, T.tag, K.category, L.color, M.image_url
            FROM CLOTH_ITEM I
            JOIN CLOSET C ON I.c_id = C.c_id
            LEFT JOIN CLOTH_TAG T ON I.item_id = T.item_id
            LEFT JOIN CLOTH_CATEGORY K ON I.item_id = K.item_id
            LEFT JOIN CLOTH_COLOR L ON I.item_id = L.item_id
            LEFT JOIN CLOTH_IMG M ON I.item_id = M.item_id
            WHERE I.c_id = ?
        """
        return DB.fetchall(sql, (closet_id,))

    @staticmethod
    def add(data):
        DB.execute(
            "INSERT INTO CLOTH_ITEM (item_name, size, last_worn, c_id) VALUES (?, ?, ?, ?)",
            (data["item_name"], data.get("size", ""), data.get("last_worn", ""), data["c_id"]),
        )
        item_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        DB.execute("INSERT INTO CLOTH_TAG (item_id, tag) VALUES (?, ?)", (item_id, data.get("tag", "")))
        DB.execute("INSERT INTO CLOTH_CATEGORY (item_id, category) VALUES (?, ?)", (item_id, data.get("category", "")))
        DB.execute("INSERT INTO CLOTH_COLOR (item_id, color) VALUES (?, ?)", (item_id, data.get("color", "")))
        DB.execute("INSERT INTO CLOTH_IMG (item_id, image_url) VALUES (?, ?)", (item_id, data.get("image_url", "")))
        DB.commit()


class Outfit:
    @staticmethod
    def add(data, item_ids=None):
        DB.execute(
            "INSERT INTO OUTFIT (u_id, outfit_name, note, created_date) VALUES (?, ?, ?, date('now'))",
            (data["u_id"], data["outfit_name"], data.get("note", "")),
        )
        outfit_id = DB.fetchone("SELECT last_insert_rowid()")[0]
        DB.execute("INSERT INTO OUTFIT_IMG (outfit_id, image_url) VALUES (?, ?)", (outfit_id, data.get("image_url", "")))
        DB.execute("INSERT INTO OUTFIT_SEASON (outfit_id, season) VALUES (?, ?)", (outfit_id, data.get("season", "")))
        DB.execute("INSERT INTO OUTFIT_OCCASION (outfit_id, occasion) VALUES (?, ?)", (outfit_id, data.get("occasion", "")))
        if item_ids:
            for item_id in item_ids:
                DB.execute("INSERT OR IGNORE INTO INCLUDES (outfit_id, item_id) VALUES (?, ?)", (outfit_id, item_id))
        DB.commit()
        return outfit_id


class Record:
    @staticmethod
    def add(data):
        outfit_id = data.get("outfit_id")
        if not outfit_id:
            outfit_id = Outfit.add(
                {
                    "u_id": data.get("u_id", 1),
                    "outfit_name": data.get("outfit_name", "My Outfit"),
                    "note": data.get("note", ""),
                    "season": data.get("season", ""),
                    "occasion": data.get("occasion", ""),
                    "image_url": data.get("image_url", ""),
                },
                data.get("item_ids", []),
            )
        DB.execute(
            "INSERT INTO RECORD (datetime, weather, mood, rating, note, outfit_id) VALUES (?, ?, ?, ?, ?, ?)",
            (
                data["datetime"],
                data.get("weather", ""),
                data.get("mood", ""),
                data.get("rating", None),
                data.get("note", ""),
                outfit_id,
            ),
        )
        DB.commit()

    @staticmethod
    def get_all(user_id=None):
        sql = """
            SELECT R.record_id, R.datetime, R.weather, R.mood, R.rating, R.note,
                   O.outfit_name
            FROM RECORD R
            JOIN OUTFIT O ON R.outfit_id = O.outfit_id
        """
        if user_id:
            sql += " WHERE O.u_id = ?"
            return DB.fetchall(sql + " ORDER BY R.datetime DESC", (user_id,))
        return DB.fetchall(sql + " ORDER BY R.datetime DESC")
