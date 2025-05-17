from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# API返回的访问日志模型
class AccessLog(BaseModel):
    id: int
    api_key_id: Optional[int] = None
    endpoint: str
    method: str
    status_code: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)

# 详细访问日志（包含请求和响应数据）
class AccessLogDetail(AccessLog):
    request_data: Optional[Dict[str, Any]] = None
    response_data: Optional[Dict[str, Any]] = None 