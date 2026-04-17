"""LLM router for Bleiche API — role-aware."""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends

from app.llm import LLMAgent
from app.auth import get_current_user, tools_for
from app.models.user import User

router = APIRouter(prefix="/llm", tags=["LLM"])


class QueryRequest(BaseModel):
    question: str
    messages: list[dict] = Field(default_factory=list)


class QueryResponse(BaseModel):
    question: str
    answer: str
    role: str
    tools_available: list[str]
    references: list[dict] = []


@router.post("/ask", response_model=QueryResponse)
def ask_assistant(request: QueryRequest, user: User = Depends(get_current_user)) -> QueryResponse:
    allowed = sorted(tools_for(user.role))
    display_name = " ".join(part for part in [getattr(user.employee, "first_name", ""), getattr(user.employee, "last_name", "")] if part).strip()
    user_context = {
        "username": user.username,
        "role": user.role.value,
        "display_name": display_name or user.username,
    }
    if getattr(user.employee, "email", None):
        user_context["email"] = user.employee.email
    try:
        agent = LLMAgent(role=user.role, user_context=user_context)
        result = agent.query(request.question, conversation=request.messages)
        answer = result.get("answer", "")
        references = result.get("references", [])
    except ValueError as e:
        answer = f"Error: {str(e)}. Please ensure GROQ_API_KEY is set."
        references = []
    except Exception as e:  # noqa: BLE001
        answer = f"Error: {str(e)}"
        references = []
    return QueryResponse(
        question=request.question,
        answer=answer,
        role=user.role.value,
        tools_available=allowed,
        references=references,
    )


@router.get("/capabilities")
def capabilities(user: User = Depends(get_current_user)):
    return {
        "role": user.role.value,
        "tools_available": sorted(tools_for(user.role)),
    }
