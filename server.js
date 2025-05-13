const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_PORT_ATTEMPTS = 10; // 最多尝试10个端口

// 启用CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 美团抢券脚本路由
app.get('/mt.js', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'sekill-js', 'mt.js');
    console.log(`尝试提供脚本文件: ${filePath}`);

    if (fs.existsSync(filePath)) {
      console.log('文件存在，准备发送');
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('文件流读取错误:', err);
        res.status(500).send('读取脚本文件出错');
      });

      fileStream.pipe(res);
    } else {
      console.error(`文件不存在: ${filePath}`);
      // 尝试列出目录内容以便调试
      const dirPath = path.join(__dirname, 'sekill-js');
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.log(`sekill-js目录内容: ${files.join(', ')}`);
      } else {
        console.error(`目录不存在: ${dirPath}`);
      }

      res.status(404).send('脚本文件未找到');
    }
  } catch (error) {
    console.error('提供脚本时出错:', error);
    res.status(500).send('服务器错误');
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// 首页路由
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>美团抢券工具</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        h1 {
          color: #FF6B01;
        }
        pre {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          overflow: auto;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .copy-btn {
          background: #FF6B01;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .copy-btn:hover {
          background: #E55D00;
        }
      </style>
    </head>
    <body>
      <h1>美团抢券工具</h1>
      <div class="card">
        <h2>使用方法</h2>
        <p>复制下面的代码，在美团外卖页面的开发者控制台中执行：</p>
        <pre><code>var script = document.createElement('script');
script.src = '${req.protocol}://${req.get('host')}/mt.js';
document.body.appendChild(script);</code></pre>
        <button class="copy-btn" onclick="copyCode()">复制代码</button>
      </div>
      
      <div class="card">
        <h2>工具说明</h2>
        <p>这是一个帮助用户在美团外卖平台抢购优惠券的辅助工具。</p>
        <p>当前脚本版本支持以下功能：</p>
        <ul>
          <li>自动拦截并修改优惠券状态</li>
          <li>自定义抢券时间点</li>
          <li>详细的操作日志</li>
          <li>可折叠和最小化的界面</li>
        </ul>
      </div>

      <script>
        function copyCode() {
          const code = document.querySelector('pre code').textContent;
          navigator.clipboard.writeText(code).then(() => {
            alert('代码已复制到剪贴板');
          }).catch(err => {
            console.error('复制失败:', err);
          });
        }
      </script>
    </body>
    </html>
  `);
});

// 添加静态文件目录
app.use('/scripts', express.static(path.join(__dirname, 'sekill-js')));

// 查看服务器信息的路由
app.get('/server-info', (req, res) => {
  const info = {
    nodeVersion: process.version,
    platform: process.platform,
    workingDirectory: process.cwd(),
    scriptPath: path.join(__dirname, 'sekill-js', 'mt.js'),
    scriptExists: fs.existsSync(path.join(__dirname, 'sekill-js', 'mt.js')),
    directoryContents: fs.existsSync(path.join(__dirname, 'sekill-js')) ?
      fs.readdirSync(path.join(__dirname, 'sekill-js')) : 'Directory not found'
  };

  res.json(info);
});

// 尝试启动服务器在不同端口
function startServer(port, attempt = 0) {
  const server = http.createServer(app);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}...`);
      if (attempt < MAX_PORT_ATTEMPTS) {
        startServer(port + 1, attempt + 1);
      } else {
        console.error(`尝试了 ${MAX_PORT_ATTEMPTS} 个端口后仍无法启动服务器。`);
        process.exit(1);
      }
    } else {
      console.error('启动服务器时发生错误:', error);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log(`脚本访问地址: http://localhost:${port}/mt.js`);
    console.log(`备用脚本访问地址: http://localhost:${port}/scripts/mt.js`);
  });
}

// 启动服务器
startServer(PORT); 