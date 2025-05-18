#!/usr/bin/env python3
"""
数据库初始化工具
- 删除并重新创建数据库
- 创建表结构
- 创建初始管理员和API密钥
"""
import os
import sys
import pymysql
import traceback
from pathlib import Path

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

def recreate_database():
    """删除并重新创建数据库"""
    # 连接到MySQL服务器（不指定数据库）
    conn = pymysql.connect(
        host=settings.MYSQL_HOST,
        port=int(settings.MYSQL_PORT),
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD,
        charset='utf8mb4'
    )
    
    try:
        with conn.cursor() as cursor:
            # 先尝试删除数据库
            logger.info(f"💾 尝试删除数据库: {settings.MYSQL_DATABASE}")
            cursor.execute(f"DROP DATABASE IF EXISTS `{settings.MYSQL_DATABASE}`")
            
            # 创建数据库
            logger.info(f"💾 创建数据库: {settings.MYSQL_DATABASE}")
            cursor.execute(
                f"CREATE DATABASE `{settings.MYSQL_DATABASE}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            
            # 确认数据库创建成功
            cursor.execute("SHOW DATABASES")
            databases = [db[0] for db in cursor.fetchall()]
            if settings.MYSQL_DATABASE in databases:
                logger.success(f"✅ 数据库 {settings.MYSQL_DATABASE} 创建成功")
            else:
                logger.error(f"❌ 数据库 {settings.MYSQL_DATABASE} 创建失败")
                sys.exit(1)
        
        conn.commit()
    finally:
        conn.close()

def initialize_tables():
    """创建表结构并初始化数据"""
    from app.db.database import Base, engine, SessionLocal
    import app.models  # 导入所有模型以便创建表
    from app.db import init_db
    
    try:
        # 创建表
        logger.info("💾 创建数据库表...")
        Base.metadata.create_all(bind=engine)
        
        # 初始化数据
        db = SessionLocal()
        try:
            logger.info("💾 初始化数据...")
            init_db.init_db(db)
            logger.success("✅ 数据初始化成功")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ 表结构创建失败: {e}")
        # 打印详细的异常堆栈信息
        logger.error(f"详细错误信息: {traceback.format_exc()}")
        sys.exit(1)

def show_connection_info():
    """显示数据库连接信息"""
    logger.info("📊 数据库连接信息:")
    logger.info(f"  主机: {settings.MYSQL_HOST}")
    logger.info(f"  端口: {settings.MYSQL_PORT}")
    logger.info(f"  用户: {settings.MYSQL_USER}")
    logger.info(f"  数据库: {settings.MYSQL_DATABASE}")
    logger.info(f"  连接URL: {settings.DATABASE_URL}")

def show_model_info():
    """显示模型信息"""
    import inspect
    import app.models
    
    logger.info("📊 数据库模型信息:")
    model_count = 0
    for _, obj in inspect.getmembers(app.models):
        if inspect.isclass(obj) and hasattr(obj, '__tablename__'):
            model_count += 1
            logger.info(f"  表: {obj.__tablename__}")
            
    logger.info(f"  共找到 {model_count} 个数据模型")

if __name__ == "__main__":
    logger.info("🚀 ===== 美团秒杀系统数据库初始化工具 =====")
    
    # 显示连接信息
    show_connection_info()
    
    # 显示模型信息
    show_model_info()
    
    # 确认操作
    print("\n⚠️  警告: 这将删除并重新创建数据库。所有现有数据将丢失!")
    confirm = input("确定要继续吗? (y/n): ").strip().lower()
    
    if confirm != 'y':
        logger.info("❌ 操作已取消")
        sys.exit(0)
    
    # 重建数据库
    recreate_database()
    
    # 初始化表结构和数据
    initialize_tables()
    
    logger.success("🎉 数据库初始化完成!")
    logger.info(f"👤 管理员账号: {settings.FIRST_SUPERUSER}")
    logger.info(f"🔑 管理员密码: {settings.FIRST_SUPERUSER_PASSWORD}")
    logger.info("✨ 现在可以启动应用了: python startup.py") 