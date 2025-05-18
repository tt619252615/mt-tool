import os
import sys
import pymysql
from pathlib import Path

# 添加项目路径到Python路径
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_dir)

# 检查配置文件环境变量
config_path = os.environ.get("MEITUAN_SECKILL_CONFIG", "config.json")
if not os.path.exists(config_path):
    print(f"错误: 配置文件不存在: {config_path}")
    print("请设置 MEITUAN_SECKILL_CONFIG 指向配置文件路径")
    print("例如:")
    print("  export MEITUAN_SECKILL_CONFIG=/path/to/config.json (Linux/Mac)")
    print("  set MEITUAN_SECKILL_CONFIG=C:\\path\\to\\config.json (Windows)")
    sys.exit(1)

# 导入日志系统
from app.core.logger import logger
from app.core.config import settings

def check_database_exists():
    """检查数据库是否存在"""
    try:
        # 连接到MySQL服务器（不指定数据库）
        conn = pymysql.connect(
            host=settings.MYSQL_HOST,
            port=int(settings.MYSQL_PORT),
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            charset='utf8mb4'
        )
        
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES")
            databases = [db[0] for db in cursor.fetchall()]
            
            if settings.MYSQL_DATABASE in databases:
                logger.success(f"✅ 数据库 {settings.MYSQL_DATABASE} 已存在")
                return True
            else:
                logger.error(f"❌ 数据库 {settings.MYSQL_DATABASE} 不存在")
                return False
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {e}")
        return False
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def check_tables_exist():
    """检查必要的数据表是否存在"""
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
            # 检查users表是否存在
            cursor.execute("SHOW TABLES LIKE 'users'")
            if cursor.fetchone():
                logger.success("✅ 核心数据表已存在")
                return True
            else:
                logger.warning("⚠️ 核心数据表不存在")
                return False
    except Exception as e:
        logger.error(f"❌ 检查数据表失败: {e}")
        return False
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def start() -> None:
    """启动应用"""
    # 检查数据库存在
    if not check_database_exists():
        logger.error("❌ 数据库不存在，请先运行初始化脚本: python db_init.py")
        sys.exit(1)
    
    # 检查核心表是否存在
    if not check_tables_exist():
        logger.warning("⚠️ 数据表不存在，请先运行初始化脚本: python db_init.py")
        choice = input("是否继续启动应用？(y/n): ").strip().lower()
        if choice != 'y':
            logger.info("❌ 操作已取消")
            sys.exit(0)
    
    # 启动服务器
    logger.info("🚀 正在启动API服务器...")
    os.system("uvicorn app.main:app --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    logger.info("🚀 ===== 美团秒杀系统启动 =====")
    logger.info(f"📋 配置文件路径: {config_path}")
    
    # 显示数据库连接信息
    logger.info("📊 数据库连接信息:")
    logger.info(f"  主机: {settings.MYSQL_HOST}")
    logger.info(f"  端口: {settings.MYSQL_PORT}")
    logger.info(f"  用户: {settings.MYSQL_USER}")
    logger.info(f"  数据库: {settings.MYSQL_DATABASE}")
    
    # 启动应用
    start() 