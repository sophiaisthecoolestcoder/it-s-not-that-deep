"""LLM agent using Groq API for tool calling."""

import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from groq import Groq

from app.llm.tools import get_all_tool_functions

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

SYSTEM_PROMPT = (
    "You are a helpful Bleiche Resort & Spa assistant. You have access to tools to "
    "query guest and employee information from the database. Use tools to lookup facts, "
    "answer questions about guests and staff, and provide detailed information. "
    "Never invent data; always use tool calls to retrieve information. "
    "Keep responses concise and grounded in tool results."
)

TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_guests",
            "description": "List guests with optional nationality filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "How many guests to return."},
                    "nationality": {"type": "string", "description": "Filter by nationality."},
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
                "properties": {
                    "name": {"type": "string", "description": "Full or partial guest name."}
                },
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
                    "limit": {"type": "integer", "description": "How many employees to return."},
                    "role": {
                        "type": "string",
                        "description": "Filter by role (manager, receptionist, housekeeper, spa_therapist, chef, waiter, concierge, maintenance, admin).",
                    },
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
                "properties": {
                    "role": {
                        "type": "string",
                        "description": "Employee role (manager, receptionist, housekeeper, spa_therapist, chef, waiter, concierge, maintenance, admin).",
                    }
                },
                "required": ["role"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_guest_notes",
            "description": "Find guests by keyword in notes (e.g., dietary preferences, special requests).",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Keyword to search in guest notes."}
                },
                "required": ["keyword"],
            },
        },
    },
]


class LLMAgent:
    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL

    def query(self, user_question: str) -> str:
        """Process a user question with tool calling."""
        tool_functions = get_all_tool_functions()
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_question},
        ]

        # Run up to 8 rounds of tool calling
        for _ in range(8):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
                temperature=0,
            )

            message = response.choices[0].message
            messages.append(
                {"role": "assistant", "content": message.content or "", "tool_calls": getattr(message, "tool_calls", None)}
            )

            # No tool calls; return the response
            if not getattr(message, "tool_calls", None):
                return (message.content or "No response generated.").strip()

            # Execute tool calls
            for tool_call in message.tool_calls:
                name = tool_call.function.name
                raw_args = tool_call.function.arguments or "{}"

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
