"""Schemas for recruiter chatbot interactions."""
from typing import List, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    cv_id: int
    messages: List[ChatMessage]
    language: Literal["en", "fr", "auto"] = Field(
        default="auto",
        description="'auto' detects French from the latest user message",
    )


class ChatResponse(BaseModel):
    reply: str
