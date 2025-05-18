from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# 共享属性
class UserBase(BaseModel):
    username: str

# 创建用户时的属性
class UserCreate(UserBase):
    password: str
    is_admin: bool = False

# 更新用户时的属性
class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

# API返回的用户模型
class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True) 