"""User model and related functionality."""
from sqlalchemy import Boolean, Column, Integer, String, DateTime, func
import uuid
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    last_login = Column(DateTime)
    
    # Relationships
    cvs = relationship("CV", back_populates="owner")

    
    def __repr__(self) -> str:
        return f"<User {self.email}>"
    
    @property
    def is_authenticated(self) -> bool:
        """Check if user is authenticated."""
        return True
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin."""
        return self.is_superuser
