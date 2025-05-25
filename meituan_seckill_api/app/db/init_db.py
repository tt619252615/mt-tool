from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.config import settings
from app.core.logger import logger
from app.db import base  # noqa: F401
from app.models import User

# 创建初始超级用户
FIRST_SUPERUSER = settings.FIRST_SUPERUSER
FIRST_SUPERUSER_PASSWORD = settings.FIRST_SUPERUSER_PASSWORD

def init_db(db: Session) -> None:
    # 创建超级用户
    user = crud.user.get_by_username(db, username=FIRST_SUPERUSER)
    if not user:
        user_in = schemas.UserCreate(
            username=FIRST_SUPERUSER,
            password=FIRST_SUPERUSER_PASSWORD,
            is_admin=True,
        )
        user = crud.user.create(db, obj_in=user_in)
        logger.success(f"🔐 已创建超级用户: {FIRST_SUPERUSER}")
    else:
        logger.info(f"🔐 超级用户已存在: {FIRST_SUPERUSER}")
    
    # 创建默认 API 密钥
    api_keys = crud.api_key.get_multi(db, limit=1)
    if not api_keys:
        api_key_in = schemas.ApiKeyCreate(
            name="默认API密钥",
            description="系统自动创建的默认API密钥",
            max_usage=-1,  # 无限制
        )
        api_key = crud.api_key.create(db, obj_in=api_key_in)
        logger.success(f"🔑 已创建默认API密钥: {api_key.key}")
    else:
        logger.info("💾 API密钥已存在，跳过创建默认密钥") 