from typing import Generic, TypeVar, Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from typing import Annotated, Any

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """API标准响应格式"""
    code: int = 0
    msg: str = "成功"
    data: Optional[T] = None

class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应格式"""
    items: List[T]
    total: int
    page: int
    size: int

class Token(BaseModel):
    """令牌模型"""
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    """令牌载荷"""
    sub: Optional[int] = None
    exp: Optional[int] = None 