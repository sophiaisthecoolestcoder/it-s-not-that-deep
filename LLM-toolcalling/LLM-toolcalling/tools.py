import json
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_FILE = Path(__file__).parent / "data" / "guests.json"


def _load_guests() -> List[Dict[str, Any]]:
    with DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _contains(text: str, query: str) -> bool:
    return query.lower() in text.lower()


def list_guests(limit: int = 10, city: Optional[str] = None, country: Optional[str] = None) -> Dict[str, Any]:
    guests = _load_guests()

    if city:
        guests = [g for g in guests if _contains(g.get("city", ""), city)]
    if country:
        guests = [g for g in guests if _contains(g.get("country", ""), country)]

    trimmed = guests[: max(1, min(limit, 50))]
    return {"count": len(guests), "guests": trimmed}


def get_guest_by_name(name: str) -> Dict[str, Any]:
    guests = _load_guests()
    matched = [g for g in guests if _contains(g.get("full_name", ""), name)]
    return {"count": len(matched), "guests": matched[:10]}


def get_guest_by_id(guest_id: str) -> Dict[str, Any]:
    guests = _load_guests()
    for guest in guests:
        if guest.get("id", "").lower() == guest_id.lower():
            return {"found": True, "guest": guest}
    return {"found": False, "message": f"Guest id '{guest_id}' not found."}


def filter_guests_by_tag(tag: str) -> Dict[str, Any]:
    guests = _load_guests()
    matched = [
        g for g in guests if any(_contains(t, tag) for t in g.get("tags", []))
    ]
    return {"count": len(matched), "guests": matched[:25]}


def filter_guests_by_preference(keyword: str) -> Dict[str, Any]:
    guests = _load_guests()
    matched = [
        g
        for g in guests
        if any(_contains(pref, keyword) for pref in g.get("preferences", []))
    ]
    return {"count": len(matched), "guests": matched[:25]}


def top_spenders(limit: int = 5) -> Dict[str, Any]:
    guests = _load_guests()
    sorted_guests = sorted(guests, key=lambda g: g.get("total_spend_usd", 0), reverse=True)
    return {"guests": sorted_guests[: max(1, min(limit, 20))]}


def get_all_tool_functions() -> Dict[str, Any]:
    return {
        "list_guests": list_guests,
        "get_guest_by_name": get_guest_by_name,
        "get_guest_by_id": get_guest_by_id,
        "filter_guests_by_tag": filter_guests_by_tag,
        "filter_guests_by_preference": filter_guests_by_preference,
        "top_spenders": top_spenders,
    }
