from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# 共享属性
class ApiKeyBase(BaseModel):
    name: str
    description: Optional[str] = None
    max_usage: int = -1  # -1表示无限制

# 创建API密钥时的属性
class ApiKeyCreate(ApiKeyBase):
    pass

# 更新API密钥时的属性
class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_usage: Optional[int] = None
    is_active: Optional[bool] = None

# API返回的API密钥模型
class ApiKey(ApiKeyBase):
    id: int
    key: str
    current_usage: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True) 