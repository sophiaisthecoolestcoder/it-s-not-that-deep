"""LLM router — role-aware, rate-limited, DB-backed conversation history."""
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, tools_for
from app.database import get_db
from app.llm import LLMAgent
from app.models.conversation import Conversation, ConversationMessage
from app.models.user import User
from app.schemas.conversation import AskRequest, AskResponse
from app.security import llm_user_daily, llm_user_limiter

router = APIRouter(prefix="/llm", tags=["LLM"])
logger = logging.getLogger("bleiche.llm")


def _load_recent_history(db: Session, conversation_id: int, turns: int = 8):
    """Return up to `turns` most recent user/assistant pairs as {role, content}."""
    rows = (
        db.query(ConversationMessage)
        .filter(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.role.in_(("user", "assistant")),
        )
        .order_by(ConversationMessage.id.desc())
        .limit(turns * 2)
        .all()
    )
    return [{"role": r.role, "content": r.content} for r in reversed(rows)]


def _load_recent_refs(db: Session, conversation_id: int, message_limit: int = 20) -> List[Dict[str, Any]]:
    """Collect object references produced in recent assistant turns.

    Returns a flat, de-duplicated list of refs (most-recent first). The agent
    uses this to keep 'the third offer' or 'that guest' resolvable across turns
    without replaying raw tool output.
    """
    rows = (
        db.query(ConversationMessage.refs)
        .filter(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.role == "assistant",
            ConversationMessage.refs.isnot(None),
        )
        .order_by(ConversationMessage.id.desc())
        .limit(message_limit)
        .all()
    )
    merged: List[Dict[str, Any]] = []
    seen: set = set()
    for (refs,) in rows:
        if not isinstance(refs, list):
            continue
        for r in refs:
            if not isinstance(r, dict):
                continue
            key = (r.get("object_type"), str(r.get("object_id")))
            if not key[1] or key in seen:
                continue
            seen.add(key)
            merged.append(r)
    return merged


@router.post("/ask", response_model=AskResponse)
def ask_assistant(
    payload: AskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    llm_user_limiter.check(f"u:{user.id}")
    llm_user_daily.check(f"u:{user.id}:d")

    allowed = sorted(tools_for(user.role))
    if not allowed:
        raise HTTPException(status_code=403, detail="Ihre Rolle hat keinen Zugriff auf den Assistenten")

    # Resolve or create conversation
    conv: Conversation
    is_new_conversation = False
    if payload.conversation_id:
        conv = (
            db.query(Conversation)
            .filter(Conversation.id == payload.conversation_id, Conversation.user_id == user.id)
            .first()
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(user_id=user.id, title=payload.question[:120])
        db.add(conv)
        db.flush()  # obtain id
        is_new_conversation = True

    # Build context from the DB (server is the source of truth; client can't forge it).
    # Load BEFORE persisting the new user turn so we don't have to slice it back out.
    history = [] if is_new_conversation else _load_recent_history(db, conv.id, turns=8)
    prior_refs = [] if is_new_conversation else _load_recent_refs(db, conv.id)

    # Persist the user turn now.
    user_msg = ConversationMessage(
        conversation_id=conv.id, role="user", content=payload.question
    )
    db.add(user_msg)
    db.flush()

    employee = getattr(user, "employee", None)
    display_name = (
        " ".join(p for p in [getattr(employee, "first_name", ""), getattr(employee, "last_name", "")] if p).strip()
        or user.username
    )
    user_context = {
        "username": user.username,
        "role": user.role.value,
        "display_name": display_name,
    }
    if getattr(employee, "email", None):
        user_context["email"] = employee.email

    try:
        agent = LLMAgent(role=user.role, user_context=user_context)
        result = agent.query(payload.question, conversation=history, prior_refs=prior_refs)
    except ValueError as e:
        logger.warning("llm_unavailable user=%s err=%s", user.username, e)
        raise HTTPException(status_code=503, detail="Assistent ist momentan nicht verfügbar")
    except Exception as e:  # noqa: BLE001
        logger.exception("llm_internal_error user=%s", user.username)
        raise HTTPException(status_code=500, detail="Interner Fehler im Assistenten")

    usage = result.get("usage", {}) or {}
    asst = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        content=result.get("answer", ""),
        refs=result.get("references") or None,
        prompt_tokens=usage.get("prompt_tokens", 0),
        completion_tokens=usage.get("completion_tokens", 0),
        cost_micro_cents=usage.get("cost_micro_cents", 0),
        model=usage.get("model"),
    )
    db.add(asst)
    db.commit()
    db.refresh(conv)

    return AskResponse(
        conversation_id=conv.id,
        question=payload.question,
        answer=result.get("answer", ""),
        role=user.role.value,
        tools_available=allowed,
        references=result.get("references") or [],
        usage=usage,
    )


@router.get("/capabilities")
def capabilities(user: User = Depends(get_current_user)):
    return {
        "role": user.role.value,
        "tools_available": sorted(tools_for(user.role)),
    }
