"""LLM router for Bleiche API — role-aware."""

from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.llm import LLMAgent
from app.auth import get_current_user, tools_for
from app.models.user import User

router = APIRouter(prefix="/llm", tags=["LLM"])


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    question: str
    answer: str
    role: str
    tools_available: list[str]


@router.post("/ask", response_model=QueryResponse)
def ask_assistant(request: QueryRequest, user: User = Depends(get_current_user)) -> QueryResponse:
    allowed = sorted(tools_for(user.role))
    try:
        agent = LLMAgent(role=user.role)
        answer = agent.query(request.question)
    except ValueError as e:
        answer = f"Error: {str(e)}. Please ensure GROQ_API_KEY is set."
    except Exception as e:  # noqa: BLE001
        answer = f"Error: {str(e)}"
    return QueryResponse(
        question=request.question,
        answer=answer,
        role=user.role.value,
        tools_available=allowed,
    )


@router.get("/capabilities")
def capabilities(user: User = Depends(get_current_user)):
    return {
        "role": user.role.value,
        "tools_available": sorted(tools_for(user.role)),
    }
