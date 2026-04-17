"""LLM agent using Groq API for tool calling (role-aware)."""

import json
import os
import re
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from groq import Groq

from app.llm.tools import get_all_tool_functions
from app.auth import tools_for
from app.models.employee import EmployeeRole

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

SYSTEM_PROMPT_BASE = (
    "You are a helpful Bleiche Resort & Spa assistant. You have access to tools to "
    "query and mutate guest, employee, offer and daily-briefing information from the database. "
    "For every task that requests concrete data lookups, object retrieval, creation, updates or exports, "
    "you must use the available tools and ground the answer in tool results. Never invent data. "
    "The user is logged in with a specific role — if you cannot satisfy a request "
    "because the required tool is unavailable for this role, explain politely which "
    "role would be required. Answers should be concise and grounded in tool results."
)

_ALL_TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_guests",
            "description": "List guests with optional nationality filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer"},
                    "nationality": {"type": "string"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_guest_by_name",
            "description": "Find guest(s) by partial name.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_guest",
            "description": "Get a guest by id.",
            "parameters": {
                "type": "object",
                "properties": {"guest_id": {"type": "integer"}},
                "required": ["guest_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_employees",
            "description": "List employees with optional role filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer"},
                    "role": {"type": "string"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee",
            "description": "Get an employee by id.",
            "parameters": {
                "type": "object",
                "properties": {"employee_id": {"type": "integer"}},
                "required": ["employee_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_by_role",
            "description": "Find employees by role.",
            "parameters": {
                "type": "object",
                "properties": {"role": {"type": "string"}},
                "required": ["role"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_guest_notes",
            "description": "Find guests by keyword in their notes (e.g. dietary preferences).",
            "parameters": {
                "type": "object",
                "properties": {"keyword": {"type": "string"}},
                "required": ["keyword"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_offers",
            "description": "List recent guest offers. Optional status filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer"},
                    "status": {"type": "string", "description": "draft|sent|accepted|declined"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_offer",
            "description": "Get one offer by id.",
            "parameters": {
                "type": "object",
                "properties": {"offer_id": {"type": "integer"}},
                "required": ["offer_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_offer",
            "description": "Create a new offer from provided customer and stay fields.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "salutation": {"type": "string", "description": "Herr|Frau|Familie"},
                    "email": {"type": "string"},
                    "street": {"type": "string"},
                    "zip_code": {"type": "string"},
                    "city": {"type": "string"},
                    "offer_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "arrival_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "departure_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "room_category": {"type": "string"},
                    "custom_room_category": {"type": "string"},
                    "adults": {"type": "integer"},
                    "children_ages": {"type": "array", "items": {"type": "integer"}},
                    "price_per_night": {"type": "string"},
                    "total_price": {"type": "string"},
                    "employee_name": {"type": "string"},
                    "notes": {"type": "string"},
                    "status": {"type": "string", "description": "draft|sent|accepted|declined"},
                },
                "required": ["first_name", "last_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_daily_briefings",
            "description": "List stored daily Belegungsliste dates, newest first.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer"}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_daily_briefing",
            "description": "Get one Belegung day by date.",
            "parameters": {
                "type": "object",
                "properties": {"date_iso": {"type": "string", "description": "YYYY-MM-DD"}},
                "required": ["date_iso"],
            },
        },
    },
]


class LLMAgent:
    def __init__(self, role: Optional[EmployeeRole] = None, user_context: Optional[Dict[str, str]] = None):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        self.role = role
        self.allowed = tools_for(role) if role else set()
        self.user_context = user_context or {}

    def _schemas(self) -> List[Dict[str, Any]]:
        if not self.role:
            return _ALL_TOOL_SCHEMAS
        return [t for t in _ALL_TOOL_SCHEMAS if t["function"]["name"] in self.allowed]

    def _system_prompt(self) -> str:
        role_label = self.role.value if self.role else "anonymous"
        allowed = ", ".join(sorted(self.allowed)) if self.allowed else "none"
        context_lines = []
        display_name = self.user_context.get("display_name")
        username = self.user_context.get("username")
        email = self.user_context.get("email")
        if display_name:
            context_lines.append(f"Name: {display_name}")
        if username and username != display_name:
            context_lines.append(f"Username: {username}")
        if email:
            context_lines.append(f"Email: {email}")
        context_lines.append(f"Role: {role_label}")
        context_block = "\n".join(context_lines)
        return (
            f"{SYSTEM_PROMPT_BASE}\n\n"
            f"Current user context:\n{context_block}\n\n"
            f"Allowed tools: {allowed}."
        )

    def _needs_strict_tool_call(self, user_question: str) -> bool:
        q = user_question.lower()
        wants_create_offer = bool(
            re.search(r"\b(create|erstellen|anlegen|make|new|neu)\b", q)
            and re.search(r"\b(offer|angebot)\b", q)
        )

        # Creating an offer often starts with missing fields. In that case, allow
        # the model to ask follow-up questions instead of forcing an immediate tool call.
        has_offer_payload_hints = bool(
            re.search(r"\b(vorname|nachname|first name|last name|arrival|anreise|departure|abreise)\b", q)
            or re.search(r"\b\d{4}-\d{2}-\d{2}\b", q)
        )
        if wants_create_offer and not has_offer_payload_hints:
            return False

        return bool(
            re.search(
                r"\b(create|erstellen|generate|new|neu|list|zeige|find|suche|get|abrufen|offer|angebot|guest|gast|employee|mitarbeiter|briefing|belegung|export|download)\b",
                q,
            )
        )

    def _extract_object_refs(self, tool_name: str, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        refs: List[Dict[str, Any]] = []

        if tool_name in {"list_offers"}:
            for o in (result.get("offers") or []):
                refs.append(
                    {
                        "object_type": "offer",
                        "object_id": str(o.get("id")),
                        "title": f"Offer #{o.get('id')} - {o.get('client', '').strip()}",
                        "subtitle": f"{o.get('status', '')} | {o.get('arrival') or 'n/a'}",
                        "actions": ["open", "download"],
                    }
                )

        if tool_name in {"get_offer", "create_offer"} and isinstance(result.get("offer"), dict):
            o = result["offer"]
            refs.append(
                {
                    "object_type": "offer",
                    "object_id": str(o.get("id")),
                    "title": f"Offer #{o.get('id')}",
                    "subtitle": f"{o.get('client') or (str(o.get('first_name', '')) + ' ' + str(o.get('last_name', ''))).strip()} | {o.get('status', '')}",
                    "actions": ["open", "download"],
                }
            )

        if tool_name == "list_guests":
            for g in (result.get("guests") or []):
                refs.append(
                    {
                        "object_type": "guest",
                        "object_id": str(g.get("id")),
                        "title": g.get("name") or f"Guest #{g.get('id')}",
                        "subtitle": g.get("email") or "",
                        "actions": ["open"],
                    }
                )

        if tool_name in {"get_guest", "get_guest_by_name"}:
            guest_rows = []
            if isinstance(result.get("guest"), dict):
                guest_rows = [result.get("guest")]
            elif isinstance(result.get("guests"), list):
                guest_rows = result.get("guests")
            for g in guest_rows:
                refs.append(
                    {
                        "object_type": "guest",
                        "object_id": str(g.get("id")),
                        "title": g.get("name") or f"{g.get('first_name', '')} {g.get('last_name', '')}".strip() or f"Guest #{g.get('id')}",
                        "subtitle": g.get("email") or "",
                        "actions": ["open"],
                    }
                )

        if tool_name == "list_employees":
            for e in (result.get("employees") or []):
                refs.append(
                    {
                        "object_type": "employee",
                        "object_id": str(e.get("id")),
                        "title": e.get("name") or f"Employee #{e.get('id')}",
                        "subtitle": e.get("role") or "",
                        "actions": ["open"],
                    }
                )

        if tool_name in {"get_employee", "get_employee_by_role"}:
            employee_rows = []
            if isinstance(result.get("employee"), dict):
                employee_rows = [result.get("employee")]
            elif isinstance(result.get("employees"), list):
                employee_rows = result.get("employees")
            for e in employee_rows:
                refs.append(
                    {
                        "object_type": "employee",
                        "object_id": str(e.get("id")),
                        "title": e.get("name") or f"{e.get('first_name', '')} {e.get('last_name', '')}".strip() or f"Employee #{e.get('id')}",
                        "subtitle": e.get("role") or "",
                        "actions": ["open"],
                    }
                )

        if tool_name == "list_daily_briefings":
            for d in (result.get("days") or []):
                day = d.get("date")
                refs.append(
                    {
                        "object_type": "daily_briefing",
                        "object_id": str(day),
                        "title": f"Belegung {day}",
                        "subtitle": f"Arrivals: {d.get('arrivals', 0)} | Stayers: {d.get('stayers', 0)}",
                        "actions": ["open"],
                    }
                )

        if tool_name == "get_daily_briefing" and isinstance(result.get("day"), dict):
            d = result["day"]
            day = d.get("date")
            refs.append(
                {
                    "object_type": "daily_briefing",
                    "object_id": str(day),
                    "title": f"Belegung {day}",
                    "subtitle": f"Arrivals: {d.get('arrivals', 0)} | Stayers: {d.get('stayers', 0)}",
                    "actions": ["open"],
                }
            )

        return [r for r in refs if r.get("object_id") not in {None, "None", ""}]

    def query(self, user_question: str, conversation: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Process a user question with tool calling and return structured metadata."""
        tool_functions = get_all_tool_functions()
        schemas = self._schemas()
        strict_mode = self._needs_strict_tool_call(user_question)
        references: List[Dict[str, Any]] = []
        tool_events: List[Dict[str, Any]] = []
        messages: List[Dict[str, Any]] = [{"role": "system", "content": self._system_prompt()}]

        if conversation:
            for item in conversation[-20:]:
                role = item.get("role")
                content = item.get("content")
                if role in {"user", "assistant", "tool"} and isinstance(content, str) and content.strip():
                    entry: Dict[str, Any] = {"role": role, "content": content}
                    if role == "tool" and item.get("tool_call_id"):
                        entry["tool_call_id"] = item["tool_call_id"]
                    if item.get("name"):
                        entry["name"] = item["name"]
                    messages.append(entry)

        if not conversation or not conversation[-1:] or conversation[-1].get("content") != user_question:
            messages.append({"role": "user", "content": user_question})

        for _ in range(8):
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": 0,
            }
            if schemas:
                kwargs["tools"] = schemas
                kwargs["tool_choice"] = "required" if strict_mode else "auto"

            try:
                response = self.client.chat.completions.create(**kwargs)
            except Exception as exc:
                # Some requests require clarification before a tool can be called.
                # In that case, retry once in auto mode instead of failing the whole request.
                err = str(exc)
                if schemas and strict_mode and "Tool choice is required, but model did not call a tool" in err:
                    fallback_kwargs = dict(kwargs)
                    fallback_kwargs["tool_choice"] = "auto"
                    response = self.client.chat.completions.create(**fallback_kwargs)
                    strict_mode = False
                else:
                    raise

            message = response.choices[0].message
            messages.append(
                {"role": "assistant", "content": message.content or "", "tool_calls": getattr(message, "tool_calls", None)}
            )

            if not getattr(message, "tool_calls", None):
                unique_refs: List[Dict[str, Any]] = []
                seen = set()
                for r in references:
                    key = (r.get("object_type"), r.get("object_id"))
                    if key in seen:
                        continue
                    seen.add(key)
                    unique_refs.append(r)
                return {
                    "answer": (message.content or "No response generated.").strip(),
                    "references": unique_refs,
                    "tool_events": tool_events,
                }

            for tool_call in message.tool_calls:
                name = tool_call.function.name
                raw_args = tool_call.function.arguments or "{}"

                if self.role and name not in self.allowed:
                    tool_result = {"error": f"Tool '{name}' is not available for role '{self.role.value}'."}
                else:
                    try:
                        args = json.loads(raw_args)
                    except json.JSONDecodeError:
                        args = {}

                    tool_fn = tool_functions.get(name)
                    if not tool_fn:
                        tool_result = {"error": f"Unknown tool '{name}'"}
                    else:
                        try:
                            tool_result = tool_fn(**args)
                        except TypeError as exc:
                            tool_result = {"error": f"Bad tool args: {str(exc)}"}
                        except Exception as exc:
                            tool_result = {"error": f"Tool failed: {str(exc)}"}

                tool_events.append({"tool": name, "args": raw_args, "result": tool_result})
                references.extend(self._extract_object_refs(name, tool_result if isinstance(tool_result, dict) else {}))

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": name,
                        "content": json.dumps(tool_result),
                    }
                )

        unique_refs: List[Dict[str, Any]] = []
        seen = set()
        for r in references:
            key = (r.get("object_type"), r.get("object_id"))
            if key in seen:
                continue
            seen.add(key)
            unique_refs.append(r)

        return {
            "answer": "I could not complete the request within the tool-call limit. Please try rephrasing.",
            "references": unique_refs,
            "tool_events": tool_events,
        }
