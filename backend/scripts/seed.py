"""Seed script: default admin user + room registry.

Run: python -m scripts.seed  (from backend/ with venv active)
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.employee import EmployeeRole  # noqa: E402
from app.models.belegung import Room  # noqa: E402
from app.auth import hash_password  # noqa: E402


ROOMS: list[tuple[str, str, str]] = (
    [(f"{n}", "KDZ", "1.OG") for n in range(101, 111)]
    + [(f"{n}", "GDZ", "1.OG") for n in range(111, 116)]
    + [(f"{n}", "GDZ+S", "1.OG") for n in range(116, 119)]
    + [(f"{n}", "KDZ", "2.OG") for n in range(201, 211)]
    + [(f"{n}", "GDZ", "2.OG") for n in range(211, 216)]
    + [(f"{n}", "GDZ+S", "2.OG") for n in range(216, 219)]
    + [(f"{n}", "KDZ", "DG") for n in range(301, 306)]
    + [(f"{n}", "BS", "Suite") for n in range(401, 407)]
    + [(f"{n}", "BS+S", "Suite") for n in range(407, 414)]
    + [(f"{n}", "SPA", "SPA") for n in range(501, 505)]
    + [(f"{n}", "GSPA", "SPA") for n in range(505, 508)]
    + [("600", "PS", "Bes."), ("601", "JS", "Bes."), ("602", "STB", "Bes.")]
)


def seed():
    session = SessionLocal()
    try:
        # Default admin user (change password after first login)
        admin_username = "admin"
        admin_password = "bleiche2026"
        if not session.query(User).filter(User.username == admin_username).first():
            admin = User(
                username=admin_username,
                password_hash=hash_password(admin_password),
                role=EmployeeRole.ADMIN,
                must_change_password=True,
            )
            session.add(admin)
            print(f"[seed] created admin user '{admin_username}' (MUST change password on first login)")
        else:
            print(f"[seed] admin user '{admin_username}' already exists")

        # Default demo users
        demo_users = [
            ("rezeption", "rezeption", EmployeeRole.RECEPTIONIST),
            ("hausdame", "hausdame", EmployeeRole.HOUSEKEEPER),
        ]
        for username, password, role in demo_users:
            if not session.query(User).filter(User.username == username).first():
                session.add(User(
                    username=username,
                    password_hash=hash_password(password),
                    role=role,
                    must_change_password=True,
                ))
                print(f"[seed] created {role.value} user '{username}' (MUST change password on first login)")

        # Rooms
        existing = {r.number for r in session.query(Room).all()}
        added = 0
        for number, cat, floor in ROOMS:
            if number not in existing:
                session.add(Room(number=number, category=cat, floor=floor))
                added += 1
        print(f"[seed] inserted {added} rooms (existing: {len(existing)})")

        session.commit()
    finally:
        session.close()


if __name__ == "__main__":
    seed()
