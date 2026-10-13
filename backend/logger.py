import psycopg2
import csv
import os

# Update these with your actual PostgreSQL database credentials
DB_CONFIG = {
    "dbname": "its_project",
    "user": "postgres",
    "password": "your_password",
    "host": "localhost",
    "port": "5432"
}

def init_db():
    # Note: The database 'its_project' must already be created in PostgreSQL 
    # before this script runs.
    conn = psycopg2.connect(**DB_CONFIG)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS logs
                 (session_id TEXT, condition TEXT, event TEXT, details TEXT)''')
    conn.commit()
    c.close()
    conn.close()

def log_event(session_id, condition, event, details):
    conn = psycopg2.connect(**DB_CONFIG)
    c = conn.cursor()
    # CRITICAL CHANGE: PostgreSQL uses %s instead of ? for placeholders
    c.execute(
        "INSERT INTO logs (session_id, condition, event, details) VALUES (%s, %s, %s, %s)", 
        (session_id, condition, event, str(details))
    )
    conn.commit()
    c.close()
    conn.close()

def export_to_csv():
    conn = psycopg2.connect(**DB_CONFIG)
    c = conn.cursor()
    c.execute("SELECT * FROM logs")
    with open('data/export.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "condition", "event", "details"])
        writer.writerows(c.fetchall())
    c.close()
    conn.close()