import sys
import os
from pathlib import Path
from loguru import logger

# 创建日志目录
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# 移除默认处理器
logger.remove()

# 各级别日志对应的emoji
EMOJI_MAP = {
    "TRACE": "🔍",
    "DEBUG": "🐛",
    "INFO": "ℹ️ ",
    "SUCCESS": "✅",
    "WARNING": "⚠️ ",
    "ERROR": "❌",
    "CRITICAL": "🔥"
}

# 添加控制台处理器（带emoji表情）
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | {level.name} {level: <8} | <cyan>{name}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# 添加文件处理器，按日期切分
logger.add(
    "logs/meituan-seckill-{time:YYYY-MM-DD}.log",
    rotation="12:00",  # 每天中午12点切换新文件
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level.name} {level: <8} | {name} - {message}",
    level="DEBUG",
    encoding="utf-8",
    retention="30 days",  # 保留30天的日志
)

# 添加额外的日志函数
def db_log(message, level="INFO"):
    """数据库操作日志"""
    getattr(logger, level.lower())(f"💾 {message}")

def auth_log(message, level="INFO"):
    """认证相关日志"""
    getattr(logger, level.lower())(f"🔐 {message}")

def api_log(message, level="INFO"):
    """API请求日志"""
    getattr(logger, level.lower())(f"🌐 {message}")

def system_log(message, level="INFO"):
    """系统操作日志"""
    getattr(logger, level.lower())(f"🚀 {message}")

def perf_log(message, level="INFO"):
    """性能相关日志"""
    getattr(logger, level.lower())(f"⚡ {message}")

# 在INFO级别输出当前日志配置
logger.info("日志系统初始化完成")
logger.info(f"日志文件将保存在: {log_dir.absolute()}")
logger.success("日志系统emoji支持已启用") 