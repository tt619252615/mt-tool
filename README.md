# 🚀 美团外卖抢单系统抢券url管理

## 📖 项目简介

这是一个基于 FastAPI 和 React 构建的美团秒杀系统，包含后端 API 服务和管理后台界面。

## 🛠️ 技术栈

### 后端
- 🐍 Python 3.12+
- ⚡ FastAPI
- 🗄️ MySQL
- 🔒 JWT 认证
- 📝 Alembic 数据库迁移

### 前端
- ⚛️ React 18
- 🎨 Ant Design
- 📊 ECharts
- 🔄 Redux Toolkit

## 🚀 快速开始

### 使用 Nix 开发（推荐）

1. 📦 克隆项目并进入目录
```bash
git clone <repository-url>
cd meituan-seckill
```

2. 🔧 进入开发环境
```bash
nix develop
```

3. 🏃‍♂️ 启动后端服务
```bash
# 初始化数据库（首次运行需要）
python meituan_seckill_api/db_init.py

# 启动API服务
python -m meituan_seckill_api.startup
```

4. 🖥️ 启动前端开发服务器
```bash
cd meituan-seckill-admin
pnpm install
pnpm dev
```

### 使用 Nix 构建

1. 🔨 构建后端服务
```bash
# 构建API服务
nix build .#meituan-seckill-api

# 运行构建后的服务
./result/bin/meituan-seckill-api
```

2. 🏗️ 构建前端界面
```bash
# 构建管理后台
nix build .#meituan-seckill-admin

# 构建结果在 ./result 目录
```

### 环境变量配置

📝 后端服务需要以下环境变量：

- `MEITUAN_SECKILL_CONFIG`: 配置文件路径，默认为 `config.json`
- `MYSQL_HOST`: MySQL 主机地址
- `MYSQL_PORT`: MySQL 端口
- `MYSQL_USER`: MySQL 用户名
- `MYSQL_PASSWORD`: MySQL 密码
- `MYSQL_DATABASE`: MySQL 数据库名

## 🔧 开发指南

### 后端开发

1. 📁 目录结构
```
meituan_seckill_api/
├── app/              # 主应用目录
│   ├── core/        # 核心功能
│   ├── crud/        # 数据库操作
│   ├── models/      # 数据库模型
│   ├── schemas/     # Pydantic 模型
│   └── routers/     # API 路由
├── alembic/         # 数据库迁移
└── tests/           # 测试文件
```

2. 🔄 数据库迁移
```bash
# 创建迁移
alembic revision --autogenerate -m "migration message"

# 应用迁移
alembic upgrade head
```

### 前端开发

1. 📁 目录结构
```
meituan-seckill-admin/
├── src/
│   ├── components/  # React 组件
│   ├── pages/      # 页面组件
│   ├── services/   # API 服务
│   └── store/      # Redux store
└── public/         # 静态资源
```

## 📝 许可证

本项目采用 MIT 许可证

