from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """
        通过用户名获取用户
        """
        return db.query(User).filter(User.username == username).first()
    
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """
        创建用户
        """
        db_obj = User(
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            is_admin=obj_in.is_admin,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """
        更新用户
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
            
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
            
        return super().update(db, db_obj=db_obj, obj_in=update_data)
    
    def authenticate(self, db: Session, *, username: str, password: str) -> Optional[User]:
        """
        验证用户
        """
        user = self.get_by_username(db, username=username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    def is_admin(self, user: User) -> bool:
        """
        判断用户是否为管理员
        """
        return user.is_admin
    
    def is_active(self, user: User) -> bool:
        """
        判断用户是否激活
        """
        return user.is_active
    
    # 添加以下帮助方法，用于解决依赖问题
    def get_current_user(self, db: Session, user_id: int) -> Optional[User]:
        """
        获取当前用户 - 帮助依赖函数
        """
        return self.get(db, id=user_id)
    
    def get_current_active_user(self, current_user: User) -> User:
        """
        获取当前活跃用户 - 帮助依赖函数
        """
        if not self.is_active(current_user):
            raise ValueError("用户未激活")
        return current_user
    
    def get_current_admin_user(self, current_user: User) -> User:
        """
        获取当前管理员用户 - 帮助依赖函数
        """
        if not self.is_admin(current_user):
            raise ValueError("非管理员用户")
        return current_user

user = CRUDUser(User) 