"""Conversation management endpoints — list, read, delete, usage totals."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.conversation import Conversation, ConversationMessage
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetail,
    ConversationMessageRead,
    ConversationSummary,
    UsageSummary,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/", response_model=list[ConversationSummary])
def list_conversations(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.last_active_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = [
        ConversationMessageRead.model_validate(m)
        for m in conv.messages
        if m.role in ("user", "assistant")
    ]
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        last_active_at=conv.last_active_at,
        messages=messages,
    )


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()


@router.get("/usage/me", response_model=UsageSummary)
def my_usage(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    q = (
        db.query(
            func.coalesce(func.sum(ConversationMessage.prompt_tokens), 0),
            func.coalesce(func.sum(ConversationMessage.completion_tokens), 0),
            func.coalesce(func.sum(ConversationMessage.cost_micro_cents), 0),
            func.count(ConversationMessage.id),
        )
        .join(Conversation, Conversation.id == ConversationMessage.conversation_id)
        .filter(
            Conversation.user_id == user.id,
            ConversationMessage.role == "assistant",
            ConversationMessage.created_at >= cutoff,
        )
    )
    prompt_tokens, completion_tokens, cost_micro, requests = q.one()
    return UsageSummary(
        period_days=days,
        total_prompt_tokens=int(prompt_tokens or 0),
        total_completion_tokens=int(completion_tokens or 0),
        total_cost_cents=round(int(cost_micro or 0) / 10_000, 4),
        requests=int(requests or 0),
    )
