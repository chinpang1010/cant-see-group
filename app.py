from flask import Flask, render_template, request, jsonify
from api.sql import init_db, Closet, ClothItem, Record

app = Flask(__name__)
app.secret_key = 'wardrobe-secret-key'

# --- 資料庫初始化 ---
init_db()


# --- 網頁路由設定 ---

# 首頁 
@app.route('/')
def index():
    # (寫 SQL 撈取使用者的衣櫃資料)
    return render_template('index.html')


# 穿搭紀錄業
@app.route('/record')
def record():
    # (寫 SQL 撈取使用者的衣服清單)
    return render_template('record.html')


# --- API 路由 ---
@app.route('/api/wardrobes')
def api_wardrobes():
    closets = Closet.get_all()
    return jsonify([dict(row) for row in closets])


@app.route('/api/closet/<int:closet_id>/items')
def api_closet_items(closet_id):
    items = ClothItem.get_by_closet(closet_id)
    return jsonify([dict(row) for row in items])


@app.route('/api/items', methods=['GET', 'POST'])
def api_items():
    if request.method == 'GET':
        items = ClothItem.get_by_closet(1)
        return jsonify([dict(row) for row in items])

    data = request.get_json() or request.form
    item_data = {
        'item_name': data.get('item_name', ''),
        'size': data.get('size', ''),
        'last_worn': data.get('last_worn', ''),
        'tag': data.get('tag', ''),
        'category': data.get('category', ''),
        'color': data.get('color', ''),
        'image_url': data.get('image_url', ''),
        'c_id': int(data.get('c_id', 1)),
    }
    ClothItem.add(item_data)
    return jsonify({'success': True}), 201


@app.route('/api/records', methods=['POST'])
def api_add_record():
    data = request.get_json() or request.form
    record_data = {
        'datetime': data.get('datetime', ''),
        'weather': data.get('weather', ''),
        'mood': data.get('mood', ''),
        'rating': int(data.get('rating', 0)) if data.get('rating') else None,
        'note': data.get('note', ''),
        'outfit_id': data.get('outfit_id'),
        'u_id': int(data.get('u_id', 1)),
        'outfit_name': data.get('outfit_name', 'My Outfit'),
        'season': data.get('season', ''),
        'occasion': data.get('occasion', ''),
        'image_url': data.get('image_url', ''),
        'item_ids': data.get('item_ids', []),
    }
    Record.add(record_data)
    return jsonify({'success': True}), 201


# --- 啟動伺服器 ---
if __name__ == '__main__':
    app.run(debug=True)