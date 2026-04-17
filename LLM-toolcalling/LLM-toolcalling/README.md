# LLM Tool Calling with Groq (Guest CLI)

This example uses Groq's OpenAI-compatible API with model `openai/gpt-oss-120b` for tool calling against a local JSON guest database.

## What is included

- `data/guests.json`: sample guest records
- `tools.py`: local tool functions over the JSON database
- `cli.py`: command line app with model tool-calling loop
- `requirements.txt`: Python dependencies

## Setup

1. Open a terminal in `LLM-toolcalling`.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set your Groq API key (PowerShell):

```powershell
$env:GROQ_API_KEY="your_key_here"
```

Optional model override:

```powershell
$env:GROQ_MODEL="openai/gpt-oss-120b"
```

You can also copy `.env.example` to `.env` and set values there.

## Run

Interactive mode:

```bash
python cli.py
```

Single question mode:

```bash
python cli.py --ask "Who are the top 3 spenders?"
```

Custom model:

```bash
python cli.py --model "openai/gpt-oss-120b" --ask "List VIP guests from Croatia"
```

## Example questions

- "How many guests are from Croatia?"
- "Show VIP guests and their total spending."
- "Who stayed most recently?"
- "Find guest named Mia and summarize preferences."
- "Which guests asked for late checkout?"

## Notes

- The assistant uses tool calls for factual lookups and filtering.
- Guest data is local JSON only; no external database required.
