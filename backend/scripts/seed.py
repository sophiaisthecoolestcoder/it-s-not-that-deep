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
        # Admin
        admin_username = os.getenv("BLEICHE_ADMIN_USER", "admin")
        admin_password = os.getenv("BLEICHE_ADMIN_PASS", "bleiche2026")
        if not session.query(User).filter(User.username == admin_username).first():
            admin = User(
                username=admin_username,
                password_hash=hash_password(admin_password),
                role=EmployeeRole.ADMIN,
            )
            session.add(admin)
            print(f"[seed] created admin user '{admin_username}' with password '{admin_password}'")
        else:
            print(f"[seed] admin user '{admin_username}' already exists")

        # Receptionist demo user
        recep_user = os.getenv("BLEICHE_RECEP_USER", "rezeption")
        recep_pass = os.getenv("BLEICHE_RECEP_PASS", "rezeption")
        if not session.query(User).filter(User.username == recep_user).first():
            session.add(User(
                username=recep_user,
                password_hash=hash_password(recep_pass),
                role=EmployeeRole.RECEPTIONIST,
            ))
            print(f"[seed] created receptionist user '{recep_user}' with password '{recep_pass}'")

        # Housekeeping demo user (limited assistant access)
        hk_user = os.getenv("BLEICHE_HK_USER", "hausdame")
        hk_pass = os.getenv("BLEICHE_HK_PASS", "hausdame")
        if not session.query(User).filter(User.username == hk_user).first():
            session.add(User(
                username=hk_user,
                password_hash=hash_password(hk_pass),
                role=EmployeeRole.HOUSEKEEPER,
            ))
            print(f"[seed] created housekeeper user '{hk_user}' with password '{hk_pass}'")

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
