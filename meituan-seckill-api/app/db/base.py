# 导入所有模型，以便数据库创建时能够找到所有表
from app.db.database import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.api_key import ApiKey  # noqa: F401
from app.models.access_log import AccessLog  # noqa: F401 