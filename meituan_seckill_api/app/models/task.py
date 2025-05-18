from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.db.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    post_url = Column(String(500))
    execution_time = Column(String(20))  # HH:MM:SS:mmm
    frequency = Column(Integer, default=100)  # 毫秒
    requests_per_task = Column(Integer, default=3)
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 