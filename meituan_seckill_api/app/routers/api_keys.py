from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.deps import get_current_active_user, get_current_admin_user
from app.db.database import get_db

router = APIRouter()

@router.get("/", response_model=schemas.PaginatedResponse[schemas.ApiKey])
def read_api_keys(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user)
) -> Any:
    """
    获取所有API密钥
    """
    api_keys = crud.api_key.get_multi(db, skip=skip, limit=limit)
    total = crud.api_key.get_count(db)
    return schemas.PaginatedResponse(
        items=api_keys,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit
    )

@router.post("/", response_model=schemas.ApiResponse[schemas.ApiKey])
def create_api_key(
    *,
    db: Session = Depends(get_db),
    api_key_in: schemas.ApiKeyCreate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    创建新API密钥
    """
    api_key = crud.api_key.create(db=db, obj_in=api_key_in)
    return schemas.ApiResponse(data=api_key)

@router.get("/{id}", response_model=schemas.ApiResponse[schemas.ApiKey])
def read_api_key(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: models.User = Depends(get_current_active_user)
) -> Any:
    """
    获取特定API密钥
    """
    api_key = crud.api_key.get(db=db, id=id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API密钥不存在")
    return schemas.ApiResponse(data=api_key)

@router.put("/{id}", response_model=schemas.ApiResponse[schemas.ApiKey])
def update_api_key(
    *,
    db: Session = Depends(get_db),
    id: int,
    api_key_in: schemas.ApiKeyUpdate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    更新API密钥
    """
    api_key = crud.api_key.get(db=db, id=id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API密钥不存在")
    api_key = crud.api_key.update(db=db, db_obj=api_key, obj_in=api_key_in)
    return schemas.ApiResponse(data=api_key)

@router.delete("/{id}", response_model=schemas.ApiResponse)
def delete_api_key(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    删除API密钥
    """
    api_key = crud.api_key.get(db=db, id=id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API密钥不存在")
    crud.api_key.remove(db=db, id=id)
    return schemas.ApiResponse(msg="删除成功")

@router.post("/{id}/reset-usage", response_model=schemas.ApiResponse[schemas.ApiKey])
def reset_api_key_usage(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    重置API密钥使用次数
    """
    api_key = crud.api_key.get(db=db, id=id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API密钥不存在")
    api_key = crud.api_key.reset_usage(db=db, api_key_id=id)
    return schemas.ApiResponse(data=api_key) 