"""Pydantic schemas for user-related data."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)
    role: Literal["seeker", "recruiter"] = "seeker"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str

    class Config:
        from_attributes = True
