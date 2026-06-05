# cant-see-group Backend Integration

## 主要修改內容

這次調整的目標是將 `cant-see-group` 的前端保留，並將後端資料庫與 API 功能整合進來。

### 1. 建立後端資料層

- 新增 `link.py`：建立 SQLite 連線並啟用 `Row` 回傳。
- 新增 `api/sql.py`：依照 `New_ERD_Schema` 的結構重新設計資料表。
  - User、Closet、Cloth Item、Cloth Tag、Cloth Category、Cloth Color、Cloth Image
  - Outfit、Outfit Image、Outfit Season、Outfit Occasion、Includes、Record
- 新增種子資料：建立預設使用者、衣櫃、衣物與穿搭。

### 2. 修改 Flask 應用程式

- 修改 `app.py`：保留原本的前端路由 `index` 與 `record`。
- 新增 API 路由：
  - `GET /api/wardrobes`
  - `GET /api/closet/<closet_id>/items`
  - `GET /api/items`
  - `POST /api/items`
  - `POST /api/records`
- 讓後端能真實寫入衣物與穿搭紀錄。

### 3. 前端串接後端

- 更新 `static/script.js`：
  - 從後端讀取衣櫃資料並呈現。
  - 新增衣物時呼叫 `POST /api/items`。
- 更新 `templates/record.html`：
  - 加上 `id` 屬性，讓表單可對應後端欄位。
- 更新 `static/record.js`：
  - 讀取 `/api/items` 欄位，並把衣服卡片變成可選取的 item_id。
  - 儲存時將真實 `item_ids` 一併送到 `/api/records`。

## 重要說明
- 採用 `database.db` 作為 SQLite 資料庫。
- 若要進一步支援登入、使用者切換或更多衣物分類功能，可以再依此後端框架擴充。
