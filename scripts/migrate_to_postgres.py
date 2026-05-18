"""
Migrate data from SQLite (sql_app.db) → PostgreSQL (grc_db).
Run once, then delete this script.
"""
import sqlite3
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ── Source: SQLite ──────────────────────────────────────────────────────────────
sqlite_conn = sqlite3.connect("sql_app.db")
sqlite_conn.row_factory = sqlite3.Row
cur = sqlite_conn.cursor()

# ── Destination: PostgreSQL ─────────────────────────────────────────────────────
PG_URL = os.getenv("NORYX_POSTGRES_URL", "postgresql://localhost/grc_db")
pg_engine = create_engine(PG_URL)

# Create all tables first via our models
import database, models
models.Base.metadata.create_all(bind=pg_engine)

PgSession = sessionmaker(bind=pg_engine)
pg = PgSession()

# ── Migrate departments ─────────────────────────────────────────────────────────
print("Migrating departments...")
cur.execute("SELECT * FROM departments")
for row in cur.fetchall():
    pg.add(models.Department(id=row["id"], name=row["name"], description=row["description"]))
pg.commit()

# ── Migrate employees ───────────────────────────────────────────────────────────
print("Migrating employees...")
cur.execute("SELECT * FROM employees")
for row in cur.fetchall():
    pg.add(models.Employee(id=row["id"], name=row["name"], role=row["role"], department_id=row["department_id"]))
pg.commit()

# ── Migrate controls ────────────────────────────────────────────────────────────
print("Migrating controls...")
cur.execute("SELECT * FROM controls")
for row in cur.fetchall():
    pg.add(models.Control(
        id=row["id"], name=row["name"], description=row["description"],
        criteria=row["criteria"], category=row["category"], department_id=row["department_id"]
    ))
pg.commit()

# ── Migrate evidence ────────────────────────────────────────────────────────────
print("Migrating evidence...")
cur.execute("SELECT * FROM evidence")
for row in cur.fetchall():
    pg.add(models.Evidence(
        id=row["id"], control_id=row["control_id"], department_id=row["department_id"],
        employee_name=row["employee_name"], file_path=row["file_path"],
        upload_time=row["upload_time"], status=row["status"],
        extracted_text=row["extracted_text"], ai_confidence=row["ai_confidence"]
    ))
pg.commit()

# ── Reset sequences to max id ───────────────────────────────────────────────────
print("Resetting sequences...")
with pg_engine.connect() as conn:
    for table in ["departments", "employees", "controls", "evidence"]:
        conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}"))
    conn.commit()

pg.close()
sqlite_conn.close()
print("\n✅ Migration complete!")
print("   departments:  migrated")
print("   employees:    migrated")
print("   controls:     migrated")
print("   evidence:     migrated")
