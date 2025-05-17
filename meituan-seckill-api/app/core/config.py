import json
import os
import secrets
from typing import List, Optional, Dict, Any, Union
from pathlib import Path

from pydantic import validator, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 访问令牌过期时间 (分钟)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 天
    
    # CORS设置
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    # 数据库配置
    MYSQL_HOST: str = "192.168.31.186"
    MYSQL_PORT: str = "3306"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "123456"
    MYSQL_DATABASE: str = "meituan_seckill"
    
    # 构建数据库URL
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
    
    # 超级管理员初始账户
    FIRST_SUPERUSER: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

def get_settings_from_json(json_path: Optional[str] = None) -> Dict[str, Any]:
    """从JSON文件加载配置"""
    if not json_path:
        json_path = os.environ.get("MEITUAN_SECKILL_CONFIG")
    
    if not json_path or not os.path.exists(json_path):
        return {}
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"读取配置文件错误: {e}")
        return {}

# 从环境变量指定的JSON文件加载配置
json_settings = get_settings_from_json()

# 创建设置实例
settings = Settings(**json_settings) 