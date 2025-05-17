# 美团秒杀系统API

这是一个美团优惠券抢购工具的后端API系统，提供用户管理、任务管理、API密钥管理和访问日志功能。

## 功能特性

- 用户认证与管理
- 抢券任务管理
- API密钥生成与管理
- 访问日志记录与查询
- 统一响应格式与日志系统
- Emoji表情增强日志可视化

## 技术栈

- FastAPI: 高性能Web框架
- SQLAlchemy: ORM框架
- MySQL: 数据库
- Pydantic: 数据验证
- JWT: 用户认证
- Loguru: 高性能日志系统

## 安装

### 依赖项

- Python 3.7+
- pip
- MySQL 5.7+

### 安装步骤

1. 创建虚拟环境：

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows
```

2. 安装依赖：

```bash
pip install -r requirements.txt
```

3. 配置系统：

复制配置文件示例并修改：

```bash
cp config.example.json config.json
# 编辑 config.json 修改为你的配置
```

## 数据库初始化

系统提供了两个脚本来简化数据库管理：

### 1. 数据库重建工具 (db_init.py)

此脚本会**删除并重新创建**整个数据库，然后初始化所有表结构和初始数据：

```bash
python db_init.py
```

⚠️ **警告**：此操作会删除所有现有数据，请谨慎使用！

### 2. 数据库检查工具 (db_check.py)

此脚本会检查数据库表结构是否与模型定义匹配：

```bash
python db_check.py
```

如果发现不匹配，会建议您运行 `db_init.py` 修复问题。

## 使用方法

### 设置环境变量

```bash
# Linux/Mac
export MEITUAN_SECKILL_CONFIG=/path/to/config.json

# Windows
set MEITUAN_SECKILL_CONFIG=C:\path\to\config.json
```

### 启动服务

```bash
python startup.py
```

或者直接启动FastAPI服务：

```bash
uvicorn app.main:app --reload
```

### API文档

启动服务后，访问以下URL查看API文档：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 系统特点

### 统一响应格式

所有接口返回统一使用Pydantic BaseModel格式，包括：

- `Response`: 标准响应，不包含数据
- `DataResponse`: 包含单个数据对象的响应
- `ListResponse`: 包含列表数据和分页信息的响应
- `ErrorResponse`: 错误响应，包含错误代码和详情

### 日志系统

系统使用Loguru进行日志管理，增加了Emoji图标支持，具有以下特点：

- 彩色控制台输出，便于调试
- Emoji增强视觉效果，直观区分日志级别
- 自动按日期切分日志文件
- 记录详细的上下文信息
- 支持多级别日志(DEBUG, INFO, WARNING, ERROR, CRITICAL)
- 日志保留策略(默认保留30天)

#### 日志级别对应的Emoji图标

| 日志级别 | Emoji | 含义 |
|---------|-------|------|
| TRACE | 🔍 | 追踪级别，最详细的调试信息 |
| DEBUG | 🐛 | 调试级别，用于调试问题 |
| INFO | ℹ️ | 信息级别，常规操作信息 |
| SUCCESS | ✅ | 成功级别，操作成功信息 |
| WARNING | ⚠️ | 警告级别，可能的问题 |
| ERROR | ❌ | 错误级别，操作失败 |
| CRITICAL | 🔥 | 严重级别，系统严重错误 |

#### 特定类型日志的额外图标

系统还提供了针对特定类型操作的专用日志函数：

- 数据库操作: 💾 `db_log()`
- 认证相关: 🔐 `auth_log()`
- API请求: 🌐 `api_log()`
- 系统操作: 🚀 `system_log()`
- 性能监控: ⚡ `perf_log()`

日志文件保存在项目根目录的`logs`文件夹中。

## 测试

系统包含完整的API测试脚本，便于快速验证所有接口是否正常工作。测试界面同样使用了丰富的Emoji，使结果一目了然。

```bash
# 运行API测试
python tests/test_api.py
```

详细的测试说明请查看[测试文档](tests/README.md)。

## 常见问题解决

### 数据库表结构与模型不匹配

如果遇到类似 `Unknown column '表名.列名' in 'field list'` 的错误，通常是因为数据库表结构与模型定义不匹配。解决步骤：

1. 运行数据库检查工具检查具体问题：
   ```bash
   python db_check.py
   ```

2. 使用数据库重建工具修复问题（⚠️ 会删除所有数据）：
   ```bash
   python db_init.py
   ```

### 数据库连接失败

如果遇到数据库连接失败问题，请检查：

1. 确保MySQL服务已启动
2. 检查`config.json`中的连接配置是否正确
3. 确保有权限访问指定的数据库

## API端点

### 认证

- POST `/api/auth/login`: 用户登录，获取访问令牌
- GET `/api/auth/me`: 获取当前用户信息

### 用户管理

- GET `/api/users`: 获取所有用户
- POST `/api/users`: 创建新用户
- GET `/api/users/{id}`: 获取特定用户
- PUT `/api/users/{id}`: 更新用户
- DELETE `/api/users/{id}`: 删除用户

### 任务管理

- GET `/api/tasks`: 获取所有任务
- POST `/api/tasks`: 创建新任务
- GET `/api/tasks/{id}`: 获取特定任务
- PUT `/api/tasks/{id}`: 更新任务
- DELETE `/api/tasks/{id}`: 删除任务
- PATCH `/api/tasks/{id}/status`: 更新任务状态

### API密钥管理

- GET `/api/keys`: 获取所有API密钥
- POST `/api/keys`: 创建新API密钥
- GET `/api/keys/{id}`: 获取特定API密钥
- PUT `/api/keys/{id}`: 更新API密钥
- DELETE `/api/keys/{id}`: 删除API密钥
- POST `/api/keys/{id}/reset-usage`: 重置API密钥使用次数

### 访问日志

- GET `/api/logs/recent`: 获取最近的访问日志
- GET `/api/logs/by-key/{api_key_id}`: 获取特定API密钥的访问日志
- GET `/api/logs/time-range`: 获取特定时间范围内的访问日志

## 许可证

[MIT](LICENSE) 