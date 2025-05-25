from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    key = Column(String(64), unique=True, index=True, nullable=False)
    description = Column(String(500), nullable=True)
    max_usage = Column(Integer, default=-1)  # -1表示无限制
    current_usage = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # 外键
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # 关联
    user = relationship("User", back_populates="api_keys")
    access_logs = relationship("AccessLog", back_populates="api_key") 