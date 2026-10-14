import sqlite3
import csv

def init_db():
    conn = sqlite3.connect('data/sessions.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS logs
                 (session_id TEXT, condition TEXT, event TEXT, details TEXT)''')
    conn.commit()
    return conn

def log_event(session_id, condition, event, details):
    conn = sqlite3.connect('data/sessions.db')
    c = conn.cursor()
    c.execute("INSERT INTO logs VALUES (?, ?, ?, ?)", (session_id, condition, event, str(details)))
    conn.commit()

def export_to_csv():
    conn = sqlite3.connect('data/sessions.db')
    c = conn.cursor()
    c.execute("SELECT * FROM logs")
    with open('data/export.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "condition", "event", "details"])
        writer.writerows(c.fetchall())