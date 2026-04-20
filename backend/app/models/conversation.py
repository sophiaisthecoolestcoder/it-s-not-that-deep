"""Chat conversations + per-turn audit log for the LLM assistant.

Server-side storage enables: GDPR export/delete, cost/token accounting per user,
abuse detection, session resume, and not having to trust client-sent history.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False, server_default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    messages = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.id",
    )


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # one of: user, assistant, tool
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False, server_default="")
    tool_call_id = Column(String(80), nullable=True)
    tool_name = Column(String(80), nullable=True)
    # For assistant messages that requested tool calls
    tool_calls = Column(JSONB, nullable=True)
    # Resolved object references surfaced to the UI
    refs = Column(JSONB, nullable=True)
    prompt_tokens = Column(Integer, nullable=False, server_default="0")
    completion_tokens = Column(Integer, nullable=False, server_default="0")
    # Fractional cents to avoid losing precision on tiny Groq unit prices.
    cost_micro_cents = Column(Integer, nullable=False, server_default="0")
    model = Column(String(80), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")


Index("ix_conv_msg_conv_created", ConversationMessage.conversation_id, ConversationMessage.created_at)
