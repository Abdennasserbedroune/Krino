"""CV model for storing user CVs and analysis results."""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class CV(Base):
    """CV model for storing user CVs and analysis results."""
    __tablename__ = "cvs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String(10), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    
    # Extracted CV data (parsed immediately after upload)
    extracted_cv = Column(JSON, nullable=True)
    
    # Analysis results
    analysis_result = Column(JSON, nullable=True)
    suggestions = Column(JSON, nullable=True)
    score = Column(Integer, nullable=True)  # Overall CV score (0-100)

    # Normalized CV data used for branded PDF generation
    structured_data = Column(JSON, nullable=True)
    
    # Timestamps
    analyzed_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="cvs")
    
    def __repr__(self) -> str:
        return f"<CV {self.original_filename} (User {self.user_id})>"
    
    @property
    def is_analyzed(self) -> bool:
        """Check if CV has been analyzed."""
        return self.analyzed_at is not None
