"""LLM agent using Groq API for tool calling (role-aware)."""

import json
import os
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
    "query guest, employee, offer and daily-briefing information from the database. "
    "Use tools to lookup facts; never invent data. "
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
            "name": "list_daily_briefings",
            "description": "List stored daily Belegungsliste dates, newest first.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer"}},
                "required": [],
            },
        },
    },
]


class LLMAgent:
    def __init__(self, role: Optional[EmployeeRole] = None):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        self.role = role
        self.allowed = tools_for(role) if role else set()

    def _schemas(self) -> List[Dict[str, Any]]:
        if not self.role:
            return _ALL_TOOL_SCHEMAS
        return [t for t in _ALL_TOOL_SCHEMAS if t["function"]["name"] in self.allowed]

    def _system_prompt(self) -> str:
        role_label = self.role.value if self.role else "anonymous"
        allowed = ", ".join(sorted(self.allowed)) if self.allowed else "none"
        return f"{SYSTEM_PROMPT_BASE}\n\nCurrent role: {role_label}. Allowed tools: {allowed}."

    def query(self, user_question: str) -> str:
        """Process a user question with tool calling."""
        tool_functions = get_all_tool_functions()
        schemas = self._schemas()
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self._system_prompt()},
            {"role": "user", "content": user_question},
        ]

        for _ in range(8):
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": 0,
            }
            if schemas:
                kwargs["tools"] = schemas
                kwargs["tool_choice"] = "auto"

            response = self.client.chat.completions.create(**kwargs)

            message = response.choices[0].message
            messages.append(
                {"role": "assistant", "content": message.content or "", "tool_calls": getattr(message, "tool_calls", None)}
            )

            if not getattr(message, "tool_calls", None):
                return (message.content or "No response generated.").strip()

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

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": name,
                        "content": json.dumps(tool_result),
                    }
                )

        return "I could not complete the request within the tool-call limit. Please try rephrasing."
