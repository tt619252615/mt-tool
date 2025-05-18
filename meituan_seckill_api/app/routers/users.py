from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.deps import get_current_active_user, get_current_admin_user
from app.db.database import get_db

router = APIRouter()

@router.get("/", response_model=schemas.PaginatedResponse[schemas.User])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    获取所有用户
    """
    users = crud.user.get_multi(db, skip=skip, limit=limit)
    total = crud.user.get_count(db)
    return schemas.PaginatedResponse(
        items=users,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit
    )

@router.post("/", response_model=schemas.ApiResponse[schemas.User])
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserCreate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    创建新用户
    """
    user = crud.user.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="用户名已存在"
        )
    user = crud.user.create(db=db, obj_in=user_in)
    return schemas.ApiResponse(data=user)

@router.get("/me", response_model=schemas.ApiResponse[schemas.User])
def read_user_me(
    current_user: models.User = Depends(get_current_active_user)
) -> Any:
    """
    获取当前登录用户
    """
    return schemas.ApiResponse(data=current_user)

@router.put("/me", response_model=schemas.ApiResponse[schemas.User])
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user)
) -> Any:
    """
    更新当前登录用户
    """
    user = crud.user.update(db=db, db_obj=current_user, obj_in=user_in)
    return schemas.ApiResponse(data=user)

@router.get("/{user_id}", response_model=schemas.ApiResponse[schemas.User])
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    获取特定用户
    """
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="用户不存在"
        )
    return schemas.ApiResponse(data=user)

@router.put("/{user_id}", response_model=schemas.ApiResponse[schemas.User])
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    更新用户
    """
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="用户不存在"
        )
    user = crud.user.update(db=db, db_obj=user, obj_in=user_in)
    return schemas.ApiResponse(data=user)

@router.delete("/{user_id}", response_model=schemas.ApiResponse)
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    删除用户
    """
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="用户不存在"
        )
    # 禁止删除自己
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="不能删除当前登录用户"
        )
    crud.user.remove(db=db, id=user_id)
    return schemas.ApiResponse(msg="删除成功") 