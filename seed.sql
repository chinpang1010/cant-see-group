PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO USER (u_id, username, password, gender, role) VALUES
    (1, 'student', '1234', 'female', 'user'),
    (2, 'manager', '1234', 'prefer not to say', 'manager');

INSERT OR IGNORE INTO CLOSET (c_id, c_name, u_id) VALUES
    (1, 'Daily Closet', 1),
    (2, 'Formal Closet', 1),
    (3, 'Sport Closet', 1);

INSERT OR IGNORE INTO CLOTH_ITEM (item_id, c_id, item_name, size, last_worn) VALUES
    (1, 1, 'White Cotton Tee', 'M', '2026-05-01'),
    (2, 1, 'Blue Wide Jeans', 'L', '2026-05-08'),
    (3, 1, 'Cream Knit Cardigan', 'F', '2026-04-15'),
    (4, 1, 'Black Canvas Sneakers', '24', '2026-05-10'),
    (5, 2, 'Navy Blazer', 'M', '2026-05-05'),
    (6, 2, 'Grey Pleated Skirt', 'S', '2026-04-20'),
    (7, 3, 'Green Training Top', 'M', '2026-05-11');

INSERT OR IGNORE INTO CLOTH_TAG (item_id, tag) VALUES
    (1, 'basic'),
    (2, 'casual'),
    (3, 'warm'),
    (4, 'versatile'),
    (5, 'formal'),
    (6, 'work'),
    (7, 'sport');

INSERT OR IGNORE INTO CLOTH_CATEGORY (item_id, category) VALUES
    (1, 'Top'),
    (2, 'Bottom'),
    (3, 'Outerwear'),
    (4, 'Shoes'),
    (5, 'Outerwear'),
    (6, 'Bottom'),
    (7, 'Top');

INSERT OR IGNORE INTO CLOTH_COLOR (item_id, color) VALUES
    (1, 'White'),
    (2, 'Blue'),
    (3, 'Cream'),
    (4, 'Black'),
    (5, 'Navy'),
    (6, 'Grey'),
    (7, 'Green');

INSERT OR IGNORE INTO CLOTH_IMG (item_id, image_url) VALUES
    (1, ''),
    (2, ''),
    (3, ''),
    (4, ''),
    (5, ''),
    (6, ''),
    (7, '');

INSERT OR IGNORE INTO OUTFIT (outfit_id, u_id, outfit_name, note, created_date) VALUES
    (1, 1, 'Campus Comfort', 'Easy to move around campus all day.', '2026-05-20'),
    (2, 1, 'Presentation Ready', 'A clean outfit for group presentation day.', '2026-05-21');

INSERT OR IGNORE INTO OUTFIT_IMG (outfit_id, image_url) VALUES
    (1, ''),
    (2, '');

INSERT OR IGNORE INTO OUTFIT_SEASON (outfit_id, season) VALUES
    (1, 'Spring'),
    (2, 'Winter');

INSERT OR IGNORE INTO OUTFIT_OCCASION (outfit_id, occasion) VALUES
    (1, 'Class'),
    (2, 'Formal');

INSERT OR IGNORE INTO INCLUDES (outfit_id, item_id) VALUES
    (1, 1),
    (1, 2),
    (1, 4),
    (2, 5),
    (2, 6),
    (2, 4);

INSERT OR IGNORE INTO RECORD (outfit_id, datetime, rating, weather, note, mood) VALUES
    (1, '2026-05-20 08:30:00', 4, 'Sunny', 'Comfortable class outfit.', 'Happy'),
    (2, '2026-05-22 13:00:00', 5, 'Cloudy', 'Looked polished for the proposal meeting.', 'Confident');
