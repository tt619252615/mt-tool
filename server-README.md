# 美团抢券工具服务器

这是一个简单的Node.js服务器，用于提供美团抢券工具脚本。

## 功能

- 提供美团抢券工具的JavaScript脚本
- 包含简单的Web界面，方便用户获取使用代码
- 支持CORS，允许跨域访问脚本

## 安装

### 前提条件

- Node.js (推荐v14或更高版本)
- pnpm包管理器

### 安装步骤

1. 克隆仓库：

```bash
git clone <仓库地址>
cd meituan-seckill
```

2. 安装依赖：

```bash
pnpm install
```

## 使用方法

### 启动服务器

开发模式（自动重启）：

```bash
pnpm dev
```

生产模式：

```bash
pnpm start
```

服务器默认在3000端口启动，可通过设置环境变量PORT更改端口号：

```bash
PORT=8080 pnpm start
```

### 访问服务

- 主页: `http://localhost:3000/`
- 脚本直接访问: `http://localhost:3000/mt.js`
- 健康检查: `http://localhost:3000/health`

## 如何在美团外卖页面使用

在美团外卖页面打开浏览器开发者工具控制台，复制粘贴以下代码：

```javascript
var script = document.createElement('script');
script.src = 'http://localhost:3000/mt.js';
document.body.appendChild(script);
```

如果服务器部署在其他地址，请相应更改URL。

## 部署

### 使用PM2部署

1. 安装PM2：

```bash
pnpm install -g pm2
```

2. 启动服务：

```bash
pm2 start server.js --name "meituan-seckill"
```

### Docker部署

创建Dockerfile后构建镜像：

```bash
docker build -t meituan-seckill .
docker run -p 3000:3000 meituan-seckill
```

## 注意事项

- 此工具仅用于学习和研究目的
- 请勿用于商业用途
- 使用此工具请遵守相关平台的使用条款 