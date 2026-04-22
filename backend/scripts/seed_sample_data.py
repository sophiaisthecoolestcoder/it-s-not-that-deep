from datetime import date, datetime, time, timezone, timedelta
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.guest import Guest
from app.models.user import User
from app.models.calendar import (
    CalendarEvent,
    CalendarEventException,
    CalendarEventParticipant,
    CalendarEventType,
    CalendarAudienceScope,
    CalendarExceptionType,
)
from app.models.cashier import (
    Product,
    ProductCategory,
    InvoiceVenue,
)


EMPLOYEES_SEED = [
    {
        "first_name": "Anna",
        "last_name": "Krause",
        "email": "anna.krause.test@bleiche.local",
        "phone": "+49-30-555-0101",
        "role": EmployeeRole.MANAGER,
        "department": "Administration",
        "position": "Hoteldirektorin",
        "employment_started_on": date(2020, 3, 1),
        "active": True,
        "notes": "Manages overall hotel operations.",
    },
    {
        "first_name": "Stefan",
        "last_name": "Hoffmann",
        "email": "stefan.hoffmann.test@bleiche.local",
        "phone": "+49-30-555-0151",
        "role": EmployeeRole.MANAGER,
        "department": "Administration",
        "position": "Stellvertretender Direktor",
        "employment_started_on": date(2021, 1, 15),
        "active": True,
    },
    {
        "first_name": "Lukas",
        "last_name": "Bergmann",
        "email": "lukas.bergmann.test@bleiche.local",
        "phone": "+49-30-555-0102",
        "role": EmployeeRole.RECEPTIONIST,
        "department": "Reception",
        "position": "Senior Rezeptionist",
        "employment_started_on": date(2021, 6, 1),
        "active": True,
    },
    {
        "first_name": "Clara",
        "last_name": "Schmidt",
        "email": "clara.schmidt.test@bleiche.local",
        "phone": "+49-30-555-0103",
        "role": EmployeeRole.RECEPTIONIST,
        "department": "Reception",
        "position": "Rezeptionistin",
        "employment_started_on": date(2023, 4, 10),
        "active": True,
    },
    {
        "first_name": "Petra",
        "last_name": "Wagner",
        "email": "petra.wagner.test@bleiche.local",
        "phone": "+49-30-555-0111",
        "role": EmployeeRole.HOUSEKEEPER,
        "department": "Housekeeping",
        "position": "Hausdame",
        "employment_started_on": date(2019, 9, 1),
        "active": True,
    },
    {
        "first_name": "Ivana",
        "last_name": "Novak",
        "email": "ivana.novak.test@bleiche.local",
        "phone": "+49-30-555-0112",
        "role": EmployeeRole.HOUSEKEEPER,
        "department": "Housekeeping",
        "position": "Zimmermädchen",
        "employment_started_on": date(2022, 2, 14),
        "active": True,
    },
    {
        "first_name": "Marek",
        "last_name": "Kowalski",
        "email": "marek.kowalski.test@bleiche.local",
        "phone": "+49-30-555-0113",
        "role": EmployeeRole.HOUSEKEEPER,
        "department": "Housekeeping",
        "position": "Hausmeister Housekeeping",
        "employment_started_on": date(2024, 5, 1),
        "active": True,
    },
    {
        "first_name": "Jonas",
        "last_name": "Fischer",
        "email": "jonas.fischer.test@bleiche.local",
        "phone": "+49-30-555-0104",
        "role": EmployeeRole.CHEF,
        "department": "Kitchen",
        "position": "Küchenchef",
        "employment_started_on": date(2018, 11, 1),
        "active": True,
        "notes": "Leads the seasonal Spreewald tasting menu.",
    },
    {
        "first_name": "Sabine",
        "last_name": "Müller",
        "email": "sabine.mueller.test@bleiche.local",
        "phone": "+49-30-555-0114",
        "role": EmployeeRole.CHEF,
        "department": "Kitchen",
        "position": "Sous-Chef",
        "employment_started_on": date(2022, 8, 1),
        "active": True,
    },
    {
        "first_name": "Mira",
        "last_name": "Weiss",
        "email": "mira.weiss.test@bleiche.local",
        "phone": "+49-30-555-0105",
        "role": EmployeeRole.SPA_THERAPIST,
        "department": "Spa",
        "position": "Senior Spa-Therapeutin",
        "employment_started_on": date(2020, 10, 1),
        "active": True,
    },
    {
        "first_name": "Jana",
        "last_name": "Becker",
        "email": "jana.becker.test@bleiche.local",
        "phone": "+49-30-555-0115",
        "role": EmployeeRole.SPA_THERAPIST,
        "department": "Spa",
        "position": "Kosmetikerin",
        "employment_started_on": date(2023, 1, 20),
        "active": True,
    },
    {
        "first_name": "Thomas",
        "last_name": "Keller",
        "email": "thomas.keller.test@bleiche.local",
        "phone": "+49-30-555-0116",
        "role": EmployeeRole.WAITER,
        "department": "Service",
        "position": "Restaurantleiter",
        "employment_started_on": date(2019, 7, 1),
        "active": True,
    },
    {
        "first_name": "Elena",
        "last_name": "Costa",
        "email": "elena.costa.test@bleiche.local",
        "phone": "+49-30-555-0117",
        "role": EmployeeRole.WAITER,
        "department": "Service",
        "position": "Servicekraft",
        "employment_started_on": date(2024, 3, 1),
        "active": True,
    },
    {
        "first_name": "Rudi",
        "last_name": "Schulte",
        "email": "rudi.schulte.test@bleiche.local",
        "phone": "+49-30-555-0118",
        "role": EmployeeRole.MAINTENANCE,
        "department": "Maintenance",
        "position": "Haustechniker",
        "employment_started_on": date(2017, 4, 1),
        "active": True,
    },
    {
        "first_name": "Hannes",
        "last_name": "Braun",
        "email": "hannes.braun.test@bleiche.local",
        "phone": "+49-30-555-0119",
        "role": EmployeeRole.CONCIERGE,
        "department": "Reception",
        "position": "Concierge",
        "employment_started_on": date(2022, 11, 15),
        "active": True,
    },
    # One intentionally inactive record so the filter UI has something to show.
    {
        "first_name": "Karin",
        "last_name": "Lehmann",
        "email": "karin.lehmann.test@bleiche.local",
        "phone": "+49-30-555-0199",
        "role": EmployeeRole.RECEPTIONIST,
        "department": "Reception",
        "position": "Rezeptionistin",
        "employment_started_on": date(2019, 2, 1),
        "employment_ended_on": date(2024, 12, 31),
        "active": False,
        "notes": "Left for maternity leave; inactive for now.",
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


def _next_monday(base: date) -> date:
    days_ahead = (0 - base.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return base + timedelta(days=days_ahead)


def _seed_calendar(session) -> list[str]:
    """Seed a handful of illustrative calendar events (idempotent)."""
    out: list[str] = []
    admin_user = session.query(User).filter(User.username == "admin").first()
    reception_user = session.query(User).filter(User.username == "rezeption").first()

    today = date.today()
    next_monday = _next_monday(today)

    # 1) Weekly staff meeting, role-scoped (managers + admin).
    title = "Wöchentliches Team-Meeting"
    existing = (
        session.query(CalendarEvent)
        .filter(CalendarEvent.title == title, CalendarEvent.recurrence_rule.isnot(None))
        .first()
    )
    if existing is None and admin_user is not None:
        meeting_start = datetime.combine(next_monday + timedelta(days=2), time(9, 0), tzinfo=timezone.utc)
        meeting_end = meeting_start + timedelta(hours=1)
        event = CalendarEvent(
            title=title,
            description="Kurzer Wochenstatus: Belegung, Events, offene Themen.",
            event_type=CalendarEventType.MEETING,
            starts_at=meeting_start,
            ends_at=meeting_end,
            recurrence_rule="FREQ=WEEKLY;BYDAY=WE",
            audience_scope=CalendarAudienceScope.ROLE,
            visible_to_roles=[EmployeeRole.MANAGER, EmployeeRole.ADMIN],
            location="Büro EG",
            created_by_user_id=admin_user.id,
        )
        session.add(event)
        session.flush()
        # One cancelled-occurrence exception, 7 days later.
        session.add(
            CalendarEventException(
                event_id=event.id,
                occurrence_at=meeting_start + timedelta(days=7),
                exception_type=CalendarExceptionType.CANCELLED,
                reason="Feiertag",
            )
        )
        out.append(f"calendar:event:{event.id}:weekly_meeting")

    # 2) Recurring weekday shift for the front desk user.
    title = "Rezeption Frühschicht"
    if (
        reception_user is not None
        and session.query(CalendarEvent).filter(CalendarEvent.title == title).first() is None
    ):
        shift_start = datetime.combine(next_monday, time(7, 0), tzinfo=timezone.utc)
        shift_end = shift_start.replace(hour=15)
        event = CalendarEvent(
            title=title,
            description="Empfang, Check-in, Gästeanfragen.",
            event_type=CalendarEventType.SHIFT,
            starts_at=shift_start,
            ends_at=shift_end,
            recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            audience_scope=CalendarAudienceScope.USERS,
            created_by_user_id=admin_user.id if admin_user else None,
        )
        session.add(event)
        session.flush()
        session.add(CalendarEventParticipant(event_id=event.id, user_id=reception_user.id))
        out.append(f"calendar:event:{event.id}:reception_shift")

    # 3) One-off hotel-wide maintenance window, global visibility.
    title = "Wartungsfenster Heizung"
    if session.query(CalendarEvent).filter(CalendarEvent.title == title).first() is None:
        maint_start = datetime.combine(today + timedelta(days=30), time(8, 0), tzinfo=timezone.utc)
        maint_end = maint_start.replace(hour=12)
        event = CalendarEvent(
            title=title,
            description="Planmäßige Wartung der Zentralheizung. Warmwasser zeitweise eingeschränkt.",
            event_type=CalendarEventType.MAINTENANCE,
            starts_at=maint_start,
            ends_at=maint_end,
            audience_scope=CalendarAudienceScope.GLOBAL,
            location="Technikraum UG",
            created_by_user_id=admin_user.id if admin_user else None,
        )
        session.add(event)
        session.flush()
        out.append(f"calendar:event:{event.id}:maintenance")

    return out


PRODUCTS_SEED = [
    # Accommodation — reduced 7% VAT in Germany (still in 2026).
    {"sku": "ACC-KDZ", "name": "Komfort-Doppelzimmer / Nacht", "category": ProductCategory.ACCOMMODATION,
     "venue": InvoiceVenue.RECEPTION, "unit_price_cents": 19000, "vat_rate_bp": 700},
    {"sku": "ACC-GDZ", "name": "Gartenzimmer / Nacht", "category": ProductCategory.ACCOMMODATION,
     "venue": InvoiceVenue.RECEPTION, "unit_price_cents": 24000, "vat_rate_bp": 700},
    {"sku": "ACC-SUITE", "name": "Bleiche Suite / Nacht", "category": ProductCategory.ACCOMMODATION,
     "venue": InvoiceVenue.RECEPTION, "unit_price_cents": 39000, "vat_rate_bp": 700},
    # Restaurant food — 19% standard (dine-in rate post-2024).
    {"sku": "FOOD-MENU-2", "name": "2-Gang-Menue", "category": ProductCategory.FOOD,
     "venue": InvoiceVenue.RESTAURANT, "unit_price_cents": 4500, "vat_rate_bp": 1900},
    {"sku": "FOOD-MENU-4", "name": "4-Gang-Ueberraschungsmenue", "category": ProductCategory.FOOD,
     "venue": InvoiceVenue.RESTAURANT, "unit_price_cents": 8900, "vat_rate_bp": 1900},
    {"sku": "FOOD-BREAKFAST", "name": "Fruehstueck a la carte", "category": ProductCategory.FOOD,
     "venue": InvoiceVenue.RESTAURANT, "unit_price_cents": 2400, "vat_rate_bp": 1900},
    # Beverages
    {"sku": "BEV-WINE-GLASS", "name": "Glas Wein (0.15l)", "category": ProductCategory.BEVERAGE,
     "venue": InvoiceVenue.RESTAURANT, "unit_price_cents": 850, "vat_rate_bp": 1900},
    {"sku": "BEV-SPARKLING", "name": "Flasche Sekt (0.75l)", "category": ProductCategory.BEVERAGE,
     "venue": InvoiceVenue.RESTAURANT, "unit_price_cents": 3800, "vat_rate_bp": 1900},
    {"sku": "BEV-WATER", "name": "Mineralwasser (0.75l)", "category": ProductCategory.BEVERAGE,
     "venue": InvoiceVenue.RESTAURANT, "unit_price_cents": 650, "vat_rate_bp": 1900},
    # Spa — 19% standard.
    {"sku": "SPA-MASSAGE-60", "name": "Klassische Massage (60 Min.)", "category": ProductCategory.SPA,
     "venue": InvoiceVenue.SPA, "unit_price_cents": 9500, "vat_rate_bp": 1900},
    {"sku": "SPA-FACIAL", "name": "Bleiche Signature Facial", "category": ProductCategory.SPA,
     "venue": InvoiceVenue.SPA, "unit_price_cents": 12500, "vat_rate_bp": 1900},
    {"sku": "SPA-HAMMAM", "name": "Hammam-Ritual (90 Min.)", "category": ProductCategory.SPA,
     "venue": InvoiceVenue.SPA, "unit_price_cents": 14500, "vat_rate_bp": 1900},
    # Misc
    {"sku": "MISC-PARKING", "name": "Parkgebuehr / Tag", "category": ProductCategory.MISC,
     "venue": InvoiceVenue.RECEPTION, "unit_price_cents": 1200, "vat_rate_bp": 1900},
]


def seed_data() -> None:
    session = SessionLocal()
    inserted_employees: list[Employee] = []
    inserted_guests: list[Guest] = []
    inserted_calendar: list[str] = []
    inserted_products: list[Product] = []

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

        inserted_calendar = _seed_calendar(session)

        for data in PRODUCTS_SEED:
            existing = session.query(Product).filter(Product.sku == data["sku"]).first()
            if existing:
                continue
            row = Product(**data)
            session.add(row)
            session.flush()
            inserted_products.append(row)

        session.commit()

        print("INSERTED_EMPLOYEES")
        for employee in inserted_employees:
            print(
                f"id={employee.id};name={employee.first_name} {employee.last_name};"
                f"email={employee.email};role={employee.role.value};"
                f"department={employee.department};position={employee.position};"
                f"active={employee.active}"
            )

        print("INSERTED_GUESTS")
        for guest in inserted_guests:
            dob = guest.date_of_birth.isoformat() if guest.date_of_birth else ""
            print(
                f"id={guest.id};name={guest.first_name} {guest.last_name};"
                f"email={guest.email};phone={guest.phone};dob={dob};"
                f"nationality={guest.nationality};notes={guest.notes}"
            )

        print("INSERTED_CALENDAR")
        for entry in inserted_calendar:
            print(entry)

        print("INSERTED_PRODUCTS")
        for product in inserted_products:
            print(
                f"id={product.id};sku={product.sku};name={product.name};"
                f"category={product.category.value};venue={product.venue.value};"
                f"price_cents={product.unit_price_cents};vat_bp={product.vat_rate_bp}"
            )

        if not inserted_employees and not inserted_guests and not inserted_calendar and not inserted_products:
            print("NO_NEW_ROWS")
    finally:
        session.close()


if __name__ == "__main__":
    seed_data()
