"""LLM router for Bleiche API."""

from pydantic import BaseModel
from fastapi import APIRouter

from app.llm import LLMAgent

router = APIRouter(prefix="/llm", tags=["llm"])


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    question: str
    answer: str


@router.post("/ask", response_model=QueryResponse)
def ask_assistant(request: QueryRequest) -> QueryResponse:
    """Ask the LLM assistant a question about guests or employees."""
    try:
        agent = LLMAgent()
        answer = agent.query(request.question)
        return QueryResponse(question=request.question, answer=answer)
    except ValueError as e:
        return QueryResponse(
            question=request.question,
            answer=f"Error: {str(e)}. Please ensure GROQ_API_KEY is set.",
        )
    except Exception as e:
        return QueryResponse(
            question=request.question,
            answer=f"Error: {str(e)}",
        )
