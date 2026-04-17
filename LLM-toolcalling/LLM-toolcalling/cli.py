import argparse
import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from openai import OpenAI

from tools import get_all_tool_functions

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
SYSTEM_PROMPT = (
    "You are a hotel guest assistant. Use tool calls whenever user asks for facts, "
    "lookups, filtering, ranking, or counts. Never invent guest data. "
    "Keep answers concise and clearly grounded in tool results."
)


TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_guests",
            "description": "List guests with optional city/country filters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "How many guests to return."},
                    "city": {"type": "string", "description": "Filter by city."},
                    "country": {"type": "string", "description": "Filter by country."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_guest_by_name",
            "description": "Find guest(s) by partial full name.",
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
            "name": "get_guest_by_id",
            "description": "Get one guest record by unique guest id (e.g., G003).",
            "parameters": {
                "type": "object",
                "properties": {
                    "guest_id": {"type": "string", "description": "Guest id like G001."}
                },
                "required": ["guest_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "filter_guests_by_tag",
            "description": "Find guests by tag, such as vip, business, family, frequent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tag": {"type": "string", "description": "Tag keyword."}
                },
                "required": ["tag"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "filter_guests_by_preference",
            "description": "Find guests by preference keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Preference keyword."}
                },
                "required": ["keyword"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "top_spenders",
            "description": "Return guests sorted by total spending descending.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "How many guests to return."}
                },
                "required": [],
            },
        },
    },
]


def _message_to_dict(message: Any) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"role": "assistant", "content": message.content}

    if getattr(message, "tool_calls", None):
        payload["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in message.tool_calls
        ]

    return payload


def _run_question(client: OpenAI, model: str, user_question: str) -> str:
    tool_functions = get_all_tool_functions()

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_question},
    ]

    for _ in range(8):
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
            temperature=0,
        )

        message = response.choices[0].message
        messages.append(_message_to_dict(message))

        if not message.tool_calls:
            return (message.content or "No response generated.").strip()

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


def build_client() -> OpenAI:
    load_dotenv()

    api_key = None
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing. Add it to your environment or .env file.")

    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")


def interactive_mode(model: str) -> None:
    client = build_client()
    print("Guest CLI ready. Ask a question, or type 'exit' to quit.")

    while True:
        user_input = input("\n> ").strip()
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break
        if not user_input:
            continue

        answer = _run_question(client=client, model=model, user_question=user_input)
        print(f"\n{answer}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Groq tool-calling guest database CLI")
    parser.add_argument("--ask", type=str, help="Ask one question and exit.")
    parser.add_argument(
        "--model",
        type=str,
        default=os.getenv("GROQ_MODEL", DEFAULT_MODEL),
        help="Groq model name (default: openai/gpt-oss-120b)",
    )

    args = parser.parse_args()

    if args.ask:
        client = build_client()
        print(_run_question(client=client, model=args.model, user_question=args.ask))
        return

    interactive_mode(model=args.model)


if __name__ == "__main__":
    main()
