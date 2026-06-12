PRAGMA foreign_keys = ON;

-- Store user information and their roles (user, manager, admin)
CREATE TABLE IF NOT EXISTS USER (
    u_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    gender TEXT,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'manager', 'admin'))
);

-- Store wardrobes owned by each user
CREATE TABLE IF NOT EXISTS CLOSET (
    c_id INTEGER PRIMARY KEY AUTOINCREMENT,
    c_name TEXT NOT NULL,
    u_id INTEGER NOT NULL,
    FOREIGN KEY (u_id) REFERENCES USER(u_id) ON DELETE CASCADE
);

-- Store basic clothing item information
CREATE TABLE IF NOT EXISTS CLOTH_ITEM (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    c_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    size TEXT,
    last_worn TEXT,
    FOREIGN KEY (c_id) REFERENCES CLOSET(c_id) ON DELETE CASCADE
);

-- Store item tags specifying because one item can have multiple tags
CREATE TABLE IF NOT EXISTS CLOTH_TAG (
    item_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (item_id, tag),
    FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
);

-- Store item categories separately because one item can have multiple categories
CREATE TABLE IF NOT EXISTS CLOTH_CATEGORY (
    item_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    PRIMARY KEY (item_id, category),
    FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
);

-- Store item colors separately because one item can have multiple colors
CREATE TABLE IF NOT EXISTS CLOTH_COLOR (
    item_id INTEGER NOT NULL,
    color TEXT NOT NULL,
    PRIMARY KEY (item_id, color),
    FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
);

-- Store image paths for clothing items
CREATE TABLE IF NOT EXISTS CLOTH_IMG (
    item_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    PRIMARY KEY (item_id, image_url),
    FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
);

-- Store reusable outfits created by users
CREATE TABLE IF NOT EXISTS OUTFIT (
    outfit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    u_id INTEGER NOT NULL,
    outfit_name TEXT NOT NULL,
    note TEXT,
    created_date TEXT NOT NULL,
    FOREIGN KEY (u_id) REFERENCES USER(u_id) ON DELETE CASCADE
);

-- Store image paths for outfits
CREATE TABLE IF NOT EXISTS OUTFIT_IMG (
    outfit_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    PRIMARY KEY (outfit_id, image_url),
    FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
);

-- Store outfit seasons separately because one outfit can match multiple seasons
CREATE TABLE IF NOT EXISTS OUTFIT_SEASON (
    outfit_id INTEGER NOT NULL,
    season TEXT NOT NULL,
    PRIMARY KEY (outfit_id, season),
    FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
);

-- Store outfit occasions separately because one outfit can match multiple occasions
CREATE TABLE IF NOT EXISTS OUTFIT_OCCASION (
    outfit_id INTEGER NOT NULL,
    occasion TEXT NOT NULL,
    PRIMARY KEY (outfit_id, occasion),
    FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
);

-- Connect outfits with clothing items
-- This table represents the many-to-many relationship
CREATE TABLE IF NOT EXISTS INCLUDES (
    outfit_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    PRIMARY KEY (outfit_id, item_id),
    FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES CLOTH_ITEM(item_id) ON DELETE CASCADE
);

-- Store the history of when an outfit was worn
CREATE TABLE IF NOT EXISTS RECORD (
    outfit_id INTEGER NOT NULL,
    datetime TEXT NOT NULL,
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    weather TEXT,
    note TEXT,
    mood TEXT,
    PRIMARY KEY (outfit_id, datetime),
    FOREIGN KEY (outfit_id) REFERENCES OUTFIT(outfit_id) ON DELETE CASCADE
);
