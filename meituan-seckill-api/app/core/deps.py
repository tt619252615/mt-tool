from typing import Generator, Optional

from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core import security
from app.core.config import settings
from app.db.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> models.User:
    """
    获取当前用户
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = schemas.TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无法验证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = crud.user.get(db, id=int(token_data.sub))
    if not user:
        raise HTTPException(status_code=404, detail="用户未找到")
    return user

def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """
    获取当前活跃用户
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户未激活")
    return current_user

def get_current_admin_user(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    """
    获取当前管理员用户
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="权限不足"
        )
    return current_user

def get_api_key(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    request: Request = None
) -> models.ApiKey:
    """
    获取并验证API密钥
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少API密钥",
        )
    
    api_key_value = authorization.replace("Bearer ", "")
    api_key = crud.api_key.get_by_key(db, key=api_key_value)
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的API密钥",
        )
    
    if not api_key.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API密钥已被禁用",
        )
    
    # 检查使用限制
    if api_key.max_usage > 0 and api_key.current_usage >= api_key.max_usage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API密钥使用次数已达上限",
        )
    
    # 更新使用统计和最后使用时间
    crud.api_key.update_usage(db, db_obj=api_key)
    
    # 记录访问日志
    if request:
        # 创建访问日志
        log_data = {
            "api_key_id": api_key.id,
            "endpoint": str(request.url.path),
            "method": request.method,
            "status_code": 200,  # 初始状态码
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }
        crud.access_log.create(db, obj_in=log_data)
    
    return api_key 