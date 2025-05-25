from typing import Any, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.deps import get_current_active_user, get_current_admin_user
from app.db.database import get_db

router = APIRouter()

@router.get("/recent", response_model=schemas.PaginatedResponse[schemas.AccessLog])
def read_recent_logs(
    db: Session = Depends(get_db),
    hours: int = Query(24, gt=0, le=720),  # 限制在1-720小时内
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    获取最近的访问日志
    """
    logs = crud.access_log.get_recent(db, hours=hours, skip=skip, limit=limit)
    # 简单估算总数，实际应用中可能需要更精确的计数
    total_estimate = len(logs) * (1 + skip // limit) if logs else 0
    return schemas.PaginatedResponse(
        items=logs,
        total=total_estimate,
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit
    )

@router.get("/by-key/{api_key_id}", response_model=schemas.PaginatedResponse[schemas.AccessLog])
def read_logs_by_api_key(
    api_key_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    获取特定API密钥的访问日志
    """
    # 验证API密钥是否存在
    api_key = crud.api_key.get(db, id=api_key_id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API密钥不存在")
    
    logs = crud.access_log.get_by_api_key(db, api_key_id=api_key_id, skip=skip, limit=limit)
    # 简单估算总数
    total_estimate = len(logs) * (1 + skip // limit) if logs else 0
    return schemas.PaginatedResponse(
        items=logs,
        total=total_estimate,
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit
    )

@router.get("/time-range", response_model=schemas.PaginatedResponse[schemas.AccessLog])
def read_logs_in_time_range(
    start_time: datetime,
    end_time: datetime = None,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    获取特定时间范围内的访问日志
    """
    logs = crud.access_log.get_in_time_range(
        db, start_time=start_time, end_time=end_time, skip=skip, limit=limit
    )
    # 简单估算总数
    total_estimate = len(logs) * (1 + skip // limit) if logs else 0
    return schemas.PaginatedResponse(
        items=logs,
        total=total_estimate,
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit
    )

@router.get("/{id}", response_model=schemas.ApiResponse[schemas.AccessLogDetail])
def read_log_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    获取访问日志详情
    """
    log = crud.access_log.get(db, id=id)
    if not log:
        raise HTTPException(status_code=404, detail="日志不存在")
    return schemas.ApiResponse(data=log) 