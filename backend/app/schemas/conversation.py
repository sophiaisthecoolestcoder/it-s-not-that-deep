from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class AssistantRef(BaseModel):
    object_type: str
    object_id: str
    title: str
    subtitle: str = ""
    actions: List[str] = []


class ConversationMessageRead(BaseModel):
    id: int
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_calls: Optional[Any] = None
    refs: Optional[List[AssistantRef]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: int
    title: str
    last_active_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationSummary):
    messages: List[ConversationMessageRead] = []


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[int] = None


class AskResponse(BaseModel):
    conversation_id: int
    question: str
    answer: str
    role: str
    tools_available: List[str]
    references: List[AssistantRef] = []
    usage: dict = {}


class UsageSummary(BaseModel):
    period_days: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost_cents: float
    requests: int
