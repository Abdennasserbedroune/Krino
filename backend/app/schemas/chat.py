"""Schemas for recruiter chatbot interactions."""
from typing import List, Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    cv_id: int
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
