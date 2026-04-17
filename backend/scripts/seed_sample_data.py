from datetime import date
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.guest import Guest


EMPLOYEES_SEED = [
    {
        "first_name": "Anna",
        "last_name": "Krause",
        "email": "anna.krause.test@bleiche.local",
        "phone": "+49-30-555-0101",
        "role": EmployeeRole.MANAGER,
    },
    {
        "first_name": "Lukas",
        "last_name": "Bergmann",
        "email": "lukas.bergmann.test@bleiche.local",
        "phone": "+49-30-555-0102",
        "role": EmployeeRole.RECEPTIONIST,
    },
    {
        "first_name": "Mira",
        "last_name": "Weiss",
        "email": "mira.weiss.test@bleiche.local",
        "phone": "+49-30-555-0103",
        "role": EmployeeRole.SPA_THERAPIST,
    },
    {
        "first_name": "Jonas",
        "last_name": "Fischer",
        "email": "jonas.fischer.test@bleiche.local",
        "phone": "+49-30-555-0104",
        "role": EmployeeRole.CHEF,
    },
]

GUESTS_SEED = [
    {
        "first_name": "Sophie",
        "last_name": "Neumann",
        "email": "sophie.neumann.test@guest.local",
        "phone": "+49-151-7000-1001",
        "date_of_birth": date(1991, 5, 14),
        "address": "Musterstrasse 12, 10115 Berlin, Germany",
        "nationality": "German",
        "notes": "Prefers late check-in and feather-free pillows.",
    },
    {
        "first_name": "David",
        "last_name": "Schulz",
        "email": "david.schulz.test@guest.local",
        "phone": "+49-151-7000-1002",
        "date_of_birth": date(1986, 11, 2),
        "address": "Hafenweg 3, 20095 Hamburg, Germany",
        "nationality": "German",
        "notes": "Vegan breakfast requested.",
    },
    {
        "first_name": "Elena",
        "last_name": "Rossi",
        "email": "elena.rossi.test@guest.local",
        "phone": "+39-347-555-1033",
        "date_of_birth": date(1994, 7, 29),
        "address": "Via Dante 44, 20121 Milan, Italy",
        "nationality": "Italian",
        "notes": "Celebrating anniversary, requested spa package.",
    },
    {
        "first_name": "Mateo",
        "last_name": "Alvarez",
        "email": "mateo.alvarez.test@guest.local",
        "phone": "+34-600-555-2088",
        "date_of_birth": date(1989, 1, 19),
        "address": "Calle Mayor 88, 28013 Madrid, Spain",
        "nationality": "Spanish",
        "notes": "Early breakfast before canoe tour.",
    },
]


def seed_data() -> None:
    session = SessionLocal()
    inserted_employees: list[Employee] = []
    inserted_guests: list[Guest] = []

    try:
        for data in EMPLOYEES_SEED:
            existing = session.query(Employee).filter(Employee.email == data["email"]).first()
            if existing:
                continue
            row = Employee(**data)
            session.add(row)
            session.flush()
            inserted_employees.append(row)

        for data in GUESTS_SEED:
            existing = session.query(Guest).filter(Guest.email == data["email"]).first()
            if existing:
                continue
            row = Guest(**data)
            session.add(row)
            session.flush()
            inserted_guests.append(row)

        session.commit()

        print("INSERTED_EMPLOYEES")
        for employee in inserted_employees:
            print(
                f"id={employee.id};name={employee.first_name} {employee.last_name};"
                f"email={employee.email};role={employee.role.value};phone={employee.phone}"
            )

        print("INSERTED_GUESTS")
        for guest in inserted_guests:
            dob = guest.date_of_birth.isoformat() if guest.date_of_birth else ""
            print(
                f"id={guest.id};name={guest.first_name} {guest.last_name};"
                f"email={guest.email};phone={guest.phone};dob={dob};"
                f"nationality={guest.nationality};notes={guest.notes}"
            )

        if not inserted_employees and not inserted_guests:
            print("NO_NEW_ROWS")
    finally:
        session.close()


if __name__ == "__main__":
    seed_data()
