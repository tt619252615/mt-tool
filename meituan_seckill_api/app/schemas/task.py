from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# 共享属性
class TaskBase(BaseModel):
    name: str
    post_url: str
    execution_time: str  # 格式: "HH:MM:SS:mmm"
    frequency: int = 100
    requests_per_task: int = 3
    priority: int = 0

# 创建任务时的属性
class TaskCreate(TaskBase):
    is_active: bool = True

# 更新任务时的属性
class TaskUpdate(BaseModel):
    name: Optional[str] = None
    post_url: Optional[str] = None
    execution_time: Optional[str] = None
    frequency: Optional[int] = None
    requests_per_task: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

# 更新任务状态
class TaskStatusUpdate(BaseModel):
    is_active: bool

# API返回的任务模型
class Task(TaskBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True) 