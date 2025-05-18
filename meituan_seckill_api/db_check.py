#!/usr/bin/env python3
"""
数据库结构检查工具
- 检查数据库结构是否与模型定义匹配
- 打印出任何不匹配的字段
"""
import os
import sys
import inspect
import pymysql
from typing import Dict, List, Set, Any
from pathlib import Path
from sqlalchemy import inspect as sa_inspect

# 添加项目路径到Python路径
project_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_dir))

# 环境变量检查
config_path = os.environ.get("MEITUAN_SECKILL_CONFIG", "config.json")
if not os.path.exists(config_path):
    print(f"错误: 配置文件不存在: {config_path}")
    sys.exit(1)

# 导入项目配置
from app.core.config import settings
from app.core.logger import logger
from app.db.database import engine, Base
import app.models  # 导入所有模型

def get_model_columns(model: Any) -> Set[str]:
    """获取SQLAlchemy模型的所有列名"""
    inspector = sa_inspect(model)
    return set(c_attr.key for c_attr in inspector.mapper.column_attrs)

def get_table_columns(table_name: str) -> Set[str]:
    """获取数据库表的所有列名"""
    columns = set()
    
    try:
        # 连接到指定数据库
        conn = pymysql.connect(
            host=settings.MYSQL_HOST,
            port=int(settings.MYSQL_PORT),
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            database=settings.MYSQL_DATABASE,
            charset='utf8mb4'
        )
        
        with conn.cursor() as cursor:
            # 检查表是否存在
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            for column in cursor.fetchall():
                columns.add(column[0])  # 列名是结果的第一个元素
    except Exception as e:
        logger.error(f"❌ 获取表 {table_name} 的列失败: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()
    
    return columns

def collect_models() -> Dict[str, Any]:
    """收集所有数据库模型"""
    models = {}
    for _, obj in inspect.getmembers(app.models):
        # 检查是否是SQLAlchemy模型类
        if inspect.isclass(obj) and hasattr(obj, '__tablename__'):
            models[obj.__tablename__] = obj
    return models

def check_models() -> None:
    """检查模型定义与数据库表是否匹配"""
    models = collect_models()
    
    if not models:
        logger.error("❌ 未找到任何数据库模型")
        return
    
    logger.info(f"📊 找到 {len(models)} 个数据库模型")
    
    mismatches = []
    
    for table_name, model in models.items():
        # 获取模型和表的列名
        model_columns = get_model_columns(model)
        table_columns = get_table_columns(table_name)
        
        if not table_columns:
            logger.warning(f"⚠️ 表 {table_name} 在数据库中不存在或无法访问")
            continue
        
        # 检查差异
        model_extra = model_columns - table_columns
        table_extra = table_columns - model_columns
        
        if model_extra or table_extra:
            mismatches.append({
                'table': table_name,
                'model_extra': model_extra,
                'table_extra': table_extra
            })
    
    # 输出结果
    if mismatches:
        logger.warning(f"⚠️ 发现 {len(mismatches)} 个模型与数据库表不匹配")
        for mismatch in mismatches:
            logger.warning(f"  表: {mismatch['table']}")
            if mismatch['model_extra']:
                logger.warning(f"    模型中存在但表中缺少的列: {', '.join(mismatch['model_extra'])}")
            if mismatch['table_extra']:
                logger.warning(f"    表中存在但模型中缺少的列: {', '.join(mismatch['table_extra'])}")
        
        logger.info("💡 建议: 运行 `python db_init.py` 重建数据库")
    else:
        logger.success("✅ 所有模型与数据库表结构匹配")

if __name__ == "__main__":
    logger.info("🔍 ===== 美团秒杀系统数据库结构检查 =====")
    
    # 显示数据库连接信息
    logger.info("📊 数据库连接信息:")
    logger.info(f"  主机: {settings.MYSQL_HOST}")
    logger.info(f"  端口: {settings.MYSQL_PORT}")
    logger.info(f"  用户: {settings.MYSQL_USER}")
    logger.info(f"  数据库: {settings.MYSQL_DATABASE}")
    
    # 检查模型
    check_models() 