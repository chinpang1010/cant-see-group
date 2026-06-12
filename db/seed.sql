PRAGMA foreign_keys = ON;

-- Insert sample users for testing login and role-based pages
INSERT OR IGNORE INTO USER (u_id, username, password, gender, role) VALUES
    (1, 'student', '1234', 'female', 'user'),
    (2, 'manager', '1234', 'prefer not to say', 'manager');

-- Insert sample wardrobes owned by the student user
INSERT OR IGNORE INTO CLOSET (c_id, c_name, u_id) VALUES
    (1, 'Daily Closet', 1),
    (2, 'Formal Closet', 1),
    (3, 'Sport Closet', 1);

-- Insert sample clothing items into different wardrobes
INSERT OR IGNORE INTO CLOTH_ITEM (item_id, c_id, item_name, size, last_worn) VALUES
    (1, 1, 'White Cotton Tee', 'M', '2026-05-01'),
    (2, 1, 'Blue Wide Jeans', 'L', '2026-05-08'),
    (3, 1, 'Cream Knit Cardigan', 'F', '2026-04-15'),
    (4, 1, 'Black Canvas Sneakers', '24', '2026-05-10'),
    (5, 2, 'Navy Blazer', 'M', '2026-05-05'),
    (6, 2, 'Grey Pleated Skirt', 'S', '2026-04-20'),
    (7, 3, 'Green Training Top', 'M', '2026-05-11');

-- Add tags for the sample clothing items
INSERT OR IGNORE INTO CLOTH_TAG (item_id, tag) VALUES
    (1, 'basic'),
    (2, 'casual'),
    (3, 'warm'),
    (4, 'versatile'),
    (5, 'formal'),
    (6, 'work'),
    (7, 'sport');

-- Add categories for the sample clothing items
INSERT OR IGNORE INTO CLOTH_CATEGORY (item_id, category) VALUES
    (1, 'Top'),
    (2, 'Bottom'),
    (3, 'Outerwear'),
    (4, 'Shoes'),
    (5, 'Outerwear'),
    (6, 'Bottom'),
    (7, 'Top');

-- Add colors for the sample clothing items
INSERT OR IGNORE INTO CLOTH_COLOR (item_id, color) VALUES
    (1, 'White'),
    (2, 'Blue'),
    (3, 'Cream'),
    (4, 'Black'),
    (5, 'Navy'),
    (6, 'Grey'),
    (7, 'Green');

-- Add image paths for the sample clothing items
INSERT OR IGNORE INTO CLOTH_IMG (item_id, image_url) VALUES
    (1, '/static/img/student_clothes/white_tee.png'),
    (2, '/static/img/student_clothes/blue_jeans.png'),
    (3, '/static/img/student_clothes/cardigan.png'),
    (4, '/static/img/student_clothes/sneakers.png'),
    (5, '/static/img/student_clothes/blazer.png'),
    (6, '/static/img/student_clothes/skirt.png'),
    (7, '/static/img/student_clothes/training_top.png');

-- Insert sample reusable outfits created by the student user
INSERT OR IGNORE INTO OUTFIT (outfit_id, u_id, outfit_name, note, created_date) VALUES
    (1, 1, 'Campus Comfort', 'Easy to move around campus all day.', '2026-05-20'),
    (2, 1, 'Presentation Ready', 'A clean outfit for group presentation day.', '2026-05-21');

-- Add image paths for the sample outfits
INSERT OR IGNORE INTO OUTFIT_IMG (outfit_id, image_url) VALUES
    (1, ''),
    (2, '');

-- Add seasons for the sample outfits
INSERT OR IGNORE INTO OUTFIT_SEASON (outfit_id, season) VALUES
    (1, 'Spring'),
    (2, 'Winter');

-- Add occasions for the sample outfits
INSERT OR IGNORE INTO OUTFIT_OCCASION (outfit_id, occasion) VALUES
    (1, 'Class'),
    (2, 'Formal');

-- Connect each sample outfit with its clothing items
INSERT OR IGNORE INTO INCLUDES (outfit_id, item_id) VALUES
    (1, 1),
    (1, 2),
    (1, 4),
    (2, 5),
    (2, 6),
    (2, 4);

-- Insert sample wear records for the demo outfits
INSERT OR IGNORE INTO RECORD (outfit_id, datetime, rating, weather, note, mood) VALUES
    (1, '2026-05-20 08:30:00', 4, 'Sunny', 'Comfortable class outfit.', 'Happy'),
    (2, '2026-05-22 13:00:00', 5, 'Cloudy', 'Looked polished for the proposal meeting.', 'Confident');
