import sqlite3
from flask import Flask, render_template, request

app = Flask(__name__)

# --- 資料庫連線設定 ---
def get_db_connection():
    # 這裡會自動在你的資料夾建立 database.db 檔案
    conn = sqlite3.connect('database.db') 
    # 讓查詢結果可以像字典一樣用欄位名稱取值
    conn.row_factory = sqlite3.Row 
    return conn


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


# --- 啟動伺服器 ---
if __name__ == '__main__':
    # debug=True 讓你在修改程式碼後，重新整理網頁就能看到變化
    app.run(debug=True)