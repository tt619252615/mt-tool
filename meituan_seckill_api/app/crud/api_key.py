from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.security import create_api_key
from app.crud.base import CRUDBase
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyUpdate

class CRUDApiKey(CRUDBase[ApiKey, ApiKeyCreate, ApiKeyUpdate]):
    def create(self, db: Session, *, obj_in: ApiKeyCreate) -> ApiKey:
        """
        创建API密钥
        """
        key = create_api_key()
        db_obj = ApiKey(
            name=obj_in.name,
            key=key,
            description=obj_in.description,
            max_usage=obj_in.max_usage,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_key(self, db: Session, *, key: str) -> Optional[ApiKey]:
        """
        通过密钥获取API密钥
        """
        return db.query(ApiKey).filter(ApiKey.key == key).first()
    
    def update_usage(self, db: Session, *, db_obj: ApiKey) -> ApiKey:
        """
        更新API密钥使用次数
        """
        db_obj.current_usage += 1
        db_obj.last_used_at = datetime.utcnow()
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def reset_usage(self, db: Session, *, api_key_id: int) -> Optional[ApiKey]:
        """
        重置API密钥使用次数
        """
        api_key = self.get(db, id=api_key_id)
        if not api_key:
            return None
        api_key.current_usage = 0
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key

api_key = CRUDApiKey(ApiKey) 