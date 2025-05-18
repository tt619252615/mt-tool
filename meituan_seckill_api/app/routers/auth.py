from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core import security, deps
from app.core.config import settings
from app.db.database import get_db

router = APIRouter()

@router.post("/login", response_model=schemas.ApiResponse[schemas.Token])
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.user.authenticate(db, username=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    if not crud.user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="用户未激活"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return schemas.ApiResponse(
        data=schemas.Token(
            access_token=security.create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            token_type="bearer",
        )
    )

@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_active_user)
) -> Any:
    """
    获取当前登录用户信息
    """
    return current_user

@router.post("/test-token", response_model=schemas.ApiResponse[schemas.User])
def test_token(current_user: models.User = Depends(deps.get_current_active_user)) -> Any:
    """
    测试access token
    """
    return schemas.ApiResponse(data=current_user)

@router.post("/register", response_model=schemas.ApiResponse[schemas.User])
def register_new_user(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """
    创建新用户
    """
    user = crud.user.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="用户名已存在",
        )
    
    user = crud.user.create(db, obj_in=user_in)
    return schemas.ApiResponse(
        data=user
    ) 