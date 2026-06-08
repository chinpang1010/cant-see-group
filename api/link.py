import sqlite3

connection = sqlite3.connect('db/database.db', check_same_thread=False)
connection.row_factory = sqlite3.Row
