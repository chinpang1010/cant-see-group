# What2Wear Wardrobe Management System

What2Wear is a Flask + SQLite prototype for the MIS205 DBMS group project. The system supports digital closet organization, outfit planning, wear-history tracking, and simple usage reports.

## Requirement Coverage

- Clear user-facing functions:
  - Add, edit, delete, search, and filter clothing items.
  - Create outfit records by selecting existing clothing items.
  - View simple usage reports such as category counts, most-worn items, and least-used items.
- Two functional modules:
  - Wardrobe catalog module.
  - Outfit and usage management module.
- Database-backed implementation:
  - Flask routes call application logic in `api/sql.py`.
  - SQLite stores users, closets, clothing items, outfits, outfit-item links, and wear records.
- SQL deliverables:
  - `schema.sql`: DDL with primary keys, foreign keys, `NOT NULL`, `UNIQUE`, and `CHECK` constraints.
  - `seed.sql`: sample data for testing the system.
  - `queries.sql`: representative join, grouping/aggregation, subquery, and usage-report queries.

## Project Structure

```text
cant-see-group/
|-- app.py
|-- requirements.txt
|-- README.md
|-- db/
|   |-- schema.sql
|   |-- seed.sql
|   |-- queries.sql
|   `-- database.db
|-- api/
|   |-- sql.py
|   `-- link.py
|-- templates/
|   |-- admin.html
|   |-- index.html
|   `-- record.html
`-- static/
    |-- admin.css
    |-- style.css
    |-- script.js
    |-- record.css
    |-- record.js
    `-- img/
```

## Setup

```powershell
cd C:\Users\user\cant-see-group
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://127.0.0.1:5000/
```

Demo account:

```text
Username: student
Password: 1234
```

## Main Pages

- `/`: wardrobe catalog, clothing item CRUD, search/filter, and usage reports.
- `/record`: outfit creation and wear-history recording.

## Main API Endpoints

- `GET /api/wardrobes`
- `POST /api/wardrobes`
- `PUT /api/wardrobes/<closet_id>`
- `DELETE /api/wardrobes/<closet_id>`
- `GET /api/closet/<closet_id>/items`
- `GET /api/items`
- `POST /api/items`
- `PUT /api/items/<item_id>`
- `DELETE /api/items/<item_id>`
- `GET /api/outfits`
- `POST /api/outfits`
- `POST /api/records`
- `GET /api/records`
- `GET /api/options`
- `GET /api/reports`
- `POST /api/auth/login`
- `POST /api/auth/signup`

## Database Design Notes

The schema follows the supplied ERD and relational schema:

- `USER` owns many `CLOSET` rows.
- `CLOSET` contains many `CLOTH_ITEM` rows.
- Clothing item multi-valued attributes are represented as separate relations: `CLOTH_TAG`, `CLOTH_CATEGORY`, `CLOTH_COLOR`, and `CLOTH_IMG`.
- `OUTFIT` includes many clothing items through the associative relation `INCLUDES`.
- Outfit multi-valued attributes are represented as `OUTFIT_IMG`, `OUTFIT_SEASON`, and `OUTFIT_OCCASION`.
- `RECORD` stores wear-history data for outfits.

## Functional Dependencies

Example functional dependencies:

- `u_id -> username, password, gender, role`
- `c_id -> c_name, u_id`
- `item_id -> c_id, item_name, size, last_worn`
- `outfit_id -> u_id, outfit_name, note, created_date`
- `(outfit_id, datetime) -> rating, weather, note, mood`

## Normalization Notes

The design separates multi-valued attributes into independent relations, so repeating groups such as tags, categories, colors, seasons, occasions, and image URLs do not violate 1NF. Core entity tables keep non-key attributes dependent on the key, which supports a 3NF-style design for this prototype.

## Demo Flow

1. Open the home page.
2. Log in with the demo account.
3. Open a wardrobe and search/filter clothing items.
4. Add, edit, or delete a clothing item.
5. Go to the record page.
6. Select clothing items to create an outfit record.
7. Save the record.
8. Return to the home page and check the usage reports.
