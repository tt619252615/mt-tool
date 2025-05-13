//==============================全局配置==============================
let isDebug = true; // 调试模式开关
let isRunning = false; // 运行状态
let targetHours = [10, 14, 17, 20]; // 默认抢券时间点
let selectedTime = null; // 用户选择的时间点
let selectedTimeObj = null; // 用户选择的时间对象
let totalRequests = 0; // 请求计数器
let successfulRequests = 0; // 成功请求计数
let targetUrls = []; // 秒杀目标URL列表
let theme = { // UI主题配置
    primary: '#FF6B01', // 美团橙色
    secondary: '#FFE9D9',
    text: '#333',
    light: '#FFFFFF',
    border: '#FFCCA5',
    success: '#4CAF50',
    info: '#2196F3',
    warning: '#FF9800',
    error: '#f44336',
    gray: '#F5F5F5'
};
let isMinimized = false; // 是否处于最小化状态
let isCollapsed = false; // 是否处于折叠状态
let isMobile = window.innerWidth < 768; // 判断是否为移动设备
let usePostMode = true; // 是否使用美团POST模式

// 加载axios库
async function loadAxios() {
    return new Promise((resolve, reject) => {
        if (window.axios) {
            resolve(window.axios);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
        script.onload = () => {
            logMessage(`✅ axios库加载成功`, true);
            resolve(window.axios);
        };
        script.onerror = () => {
            const error = new Error('加载axios库失败');
            logMessage(`❌ ${error.message}`, true);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

// 安全的日志记录函数
function logMessage(message, isImportant = false) {
    try {
        if (!isDebug && !isImportant) return;

        let logEl = document.getElementById('mt-log');
        if (!logEl) return;

        let now = new Date();
        let timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        let logItem = document.createElement('div');
        logItem.style.marginBottom = isMobile ? '3px' : '5px';
        logItem.style.padding = isMobile ? '1px 0' : '2px 0';
        logItem.style.borderBottom = '1px dashed #eee';
        logItem.style.color = isImportant ? theme.primary : '#666';
        logItem.style.fontWeight = isImportant ? '500' : 'normal';
        logItem.style.fontSize = isMobile ? '10px' : 'inherit';
        logItem.style.lineHeight = isMobile ? '1.3' : '1.4';
        logItem.innerHTML = `<span style="color: #999; font-size: ${isMobile ? '9px' : '0.85em'};">[${timeStr}]</span> ${message}`;

        logEl.appendChild(logItem);
        logEl.scrollTop = logEl.scrollHeight;

        // 限制日志条数
        while (logEl.children.length > 100) {
            logEl.removeChild(logEl.firstChild);
        }

        // 同时输出到控制台
        console.log(`[${timeStr}] ${message}`);
    } catch (e) {
        // 出错时至少尝试输出到控制台
        console.log(`[LOG ERROR] ${e.message}`);
        console.log(message);
    }
}

//==============================UI功能==============================
// 创建UI界面
function createUI() {
    try {
        console.log("开始创建UI...");

        // 检测设备类型
        isMobile = window.innerWidth < 768;

        // 创建主容器
        let container = document.createElement('div');
        container.id = 'mt-tool-container';
        container.style.cssText = `
            position: fixed;
            bottom: ${isMobile ? '5px' : '20px'};
            right: ${isMobile ? '5px' : '20px'};
            ${isMobile ? 'left: 5px;' : 'width: 320px;'}
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
            overflow: hidden;
            border: 1px solid ${theme.border};
            transition: all 0.3s ease;
            max-height: ${isMobile ? '80vh' : '600px'};
            font-size: ${isMobile ? '12px' : '14px'};
        `;

        // 创建头部
        let header = document.createElement('div');
        header.style.cssText = `
            padding: ${isMobile ? '10px 12px' : '12px 15px'};
            background: ${theme.primary};
            color: white;
            font-weight: bold;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        `;
        header.innerHTML = `
            <span>${isMobile ? '美团抢券工具' : '美团外卖自动抢券工具'}</span>
            <div style="display: flex; gap: 5px;">
                <button id="mt-collapse-btn" title="折叠工具" style="background: none; border: none; cursor: pointer; color: white; font-size: 14px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button id="mt-min-btn" title="最小化" style="background: none; border: none; cursor: pointer; color: white; font-size: 14px;">−</button>
                <button id="mt-close-btn" title="关闭" style="background: none; border: none; cursor: pointer; color: white; font-size: 14px;">×</button>
            </div>
        `;

        // 创建内容区
        let content = document.createElement('div');
        content.id = 'mt-content';
        content.style.cssText = `
            padding: ${isMobile ? '10px' : '15px'};
            max-height: ${isMobile ? '70vh' : '530px'};
            overflow-y: auto;
        `;

        // 创建最小化后的浮动按钮
        let floatBtn = document.createElement('div');
        floatBtn.id = 'mt-float-btn';
        floatBtn.style.cssText = `
            display: none;
            position: fixed;
            bottom: ${isMobile ? '10px' : '20px'};
            right: ${isMobile ? '10px' : '20px'};
            width: ${isMobile ? '40px' : '48px'};
            height: ${isMobile ? '40px' : '48px'};
            border-radius: 50%;
            background: ${theme.primary};
            color: white;
            text-align: center;
            line-height: ${isMobile ? '40px' : '48px'};
            font-size: ${isMobile ? '16px' : '20px'};
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 999999;
            transition: all 0.3s ease;
        `;
        floatBtn.innerHTML = `<span style="font-size: ${isMobile ? '16px' : '20px'};">券</span>`;
        floatBtn.title = "打开抢券工具";

        // 新增：URL输入区域 - 支持GET和POST模式
        let urlInputDiv = document.createElement('div');
        urlInputDiv.style.cssText = 'margin-bottom: 15px;';

        // 添加模式切换按钮
        urlInputDiv.innerHTML = `
            <div style="display: flex; margin-bottom: 10px; justify-content: center;">
                <button id="mt-mode-standard" style="
                    flex: 1;
                    padding: 6px 0;
                    background: ${!usePostMode ? theme.primary : theme.gray};
                    color: ${!usePostMode ? 'white' : theme.text};
                    border: 1px solid ${theme.border};
                    border-radius: 6px 0 0 6px;
                    cursor: pointer;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">标准模式</button>
                <button id="mt-mode-post" style="
                    flex: 1;
                    padding: 6px 0;
                    background: ${usePostMode ? theme.primary : theme.gray};
                    color: ${usePostMode ? 'white' : theme.text};
                    border: 1px solid ${theme.border};
                    border-radius: 0 6px 6px 0;
                    cursor: pointer;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">美团POST模式</button>
            </div>
        `;

        // 标准模式输入区
        let standardInputDiv = document.createElement('div');
        standardInputDiv.id = 'mt-standard-input';
        standardInputDiv.style.display = usePostMode ? 'none' : 'block';
        standardInputDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: ${theme.text};">添加抢券URL:</label>
            <div style="margin-bottom: 8px;">
                <input type="text" id="mt-url-input" placeholder="输入优惠券链接地址" style="
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
            </div>
            <div style="margin-bottom: 8px;">
                <input type="text" id="mt-url-name" placeholder="优惠券名称（可选）" style="
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
                <select id="mt-url-method" style="
                    flex: 1;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    background: white;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                </select>
                <button id="mt-add-url-btn" style="
                    flex: 2;
                    padding: 8px 0;
                    background: ${theme.primary};
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">添加URL</button>
            </div>
        `;

        // 美团POST模式输入区
        let postInputDiv = document.createElement('div');
        postInputDiv.id = 'mt-post-input';
        postInputDiv.style.display = usePostMode ? 'block' : 'none';
        postInputDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: ${theme.text};">添加美团抢券URL:</label>
            <div style="margin-bottom: 8px;">
                <input type="text" id="mt-url-post-input" placeholder="输入POST URL (抢券请求链接)" style="
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
                <div style="font-size: 10px; color: #666; margin-top: 2px;">格式: https://...fetchcoupon?couponReferId=xxx&...</div>
            </div>
            <div style="margin-bottom: 8px;">
                <input type="text" id="mt-get-url-input" placeholder="GET URL (优惠券查询链接，可选)" style="
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
                <div style="font-size: 10px; color: #666; margin-top: 2px;">不填将自动生成</div>
            </div>
            <div style="margin-bottom: 8px;">
                <input type="text" id="mt-post-name-input" placeholder="优惠券名称（可选）" style="
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
                <input type="number" id="mt-post-freq-input" placeholder="请求频率(毫秒)" value="100" style="
                    flex: 1;
                    padding: 8px 10px;
                    border: 1px solid ${theme.border};
                    border-radius: 6px;
                    background: white;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">
                <button id="mt-add-post-url-btn" style="
                    flex: 2;
                    padding: 8px 0;
                    background: ${theme.primary};
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">添加URL</button>
            </div>
        `;

        urlInputDiv.appendChild(standardInputDiv);
        urlInputDiv.appendChild(postInputDiv);

        // 时间选择区域 - 移动端优化
        let timeSelectDiv = document.createElement('div');
        timeSelectDiv.style.cssText = 'margin-bottom: 15px; margin-top: 15px;';

        // 针对移动端的时间选择布局
        if (isMobile) {
            timeSelectDiv.innerHTML = `
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: ${theme.text};">选择抢券时间:</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">
                    ${targetHours.map(h => `
                        <button class="mt-time-btn" data-time="${h}" style="
                            padding: 8px 0;
                            background: ${theme.gray};
                            border: 1px solid ${theme.border};
                            border-radius: 6px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            font-size: 14px;
                        ">${h}:00</button>
                    `).join('')}
                </div>
            `;
        } else {
            timeSelectDiv.innerHTML = `
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: ${theme.text};">选择抢券时间:</label>
                <div style="display: flex; gap: 5px;">
                    ${targetHours.map(h => `
                        <button class="mt-time-btn" data-time="${h}" style="
                            flex: 1;
                            padding: 8px 0;
                            background: ${theme.gray};
                            border: 1px solid ${theme.border};
                            border-radius: 6px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">${h}:00</button>
                    `).join('')}
                </div>
            `;
        }

        // URL列表区域
        let urlListDiv = document.createElement('div');
        urlListDiv.style.cssText = 'margin-bottom: 15px;';
        urlListDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: ${theme.text}; display: flex; justify-content: space-between; align-items: center;">
                <span>抢券URL列表:</span>
                <span id="mt-url-count" style="font-size: 0.9em; color: #666;">0 个</span>
            </div>
            <div id="mt-url-list" style="
                max-height: ${isMobile ? '120px' : '150px'};
                overflow-y: auto;
                border: 1px solid ${theme.border};
                border-radius: 6px;
                padding: 5px;
                background: #FAFAFA;
            "></div>
        `;

        // 状态区域
        let statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: #FAFAFA; border-radius: 6px;';
        statusDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-weight: bold; color: ${theme.text};">状态:</span>
                    <span id="mt-status">未启动</span>
                </div>
                <button id="mt-toggle-btn" style="
                    padding: ${isMobile ? '6px 12px' : '8px 15px'};
                    background: ${theme.primary};
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s ease;
                    font-size: ${isMobile ? '12px' : '14px'};
                ">启动抢券</button>
            </div>
            <div id="mt-selected-time" style="
                margin-top: 5px; 
                font-size: ${isMobile ? '0.85em' : '0.9em'}; 
                color: #666;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            "></div>
            <div id="mt-stats" style="margin-top: 5px; font-size: 0.8em; color: #999;"></div>
        `;

        // 日志区域 - 添加复制功能
        let logDiv = document.createElement('div');
        logDiv.style.marginTop = '15px';
        logDiv.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; color: ${theme.text}; display: flex; justify-content: space-between; align-items: center;">
                <span>操作日志:</span>
                <div>
                    <button id="mt-copy-log" style="
                        background: none;
                        border: none;
                        color: #666;
                        font-size: ${isMobile ? '10px' : '0.8em'};
                        cursor: pointer;
                        padding: 0;
                        margin-right: 8px;
                        display: inline-flex;
                        align-items: center;
                    ">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style="margin-right: 3px;">
                            <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.41421C20 6.88378 19.7893 6.37507 19.4142 6L17 3.58579C16.6249 3.21071 16.1162 3 15.5858 3H10C8.89543 3 8 3.89543 8 5V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        复制
                    </button>
                    <button id="mt-clear-log" style="
                        background: none;
                        border: none;
                        color: #666;
                        font-size: ${isMobile ? '10px' : '0.8em'};
                        cursor: pointer;
                        padding: 0;
                        display: inline-flex;
                        align-items: center;
                    ">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style="margin-right: 3px;">
                            <path d="M19 6H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M14 5H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6 10V20C6 20.5523 6.44772 21 7 21H17C17.5523 21 18 20.5523 18 20V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        清空
                    </button>
                </div>
            </div>
            <div id="mt-log" style="
                height: ${isMobile ? '70px' : '120px'};
                overflow-y: auto;
                border: 1px solid ${theme.border};
                border-radius: 6px;
                padding: ${isMobile ? '4px' : '8px'};
                font-size: ${isMobile ? '10px' : '0.9em'};
                background: #FAFAFA;
                line-height: ${isMobile ? '1.2' : '1.4'};
            "></div>
        `;

        // 组装UI
        content.appendChild(urlInputDiv);
        content.appendChild(timeSelectDiv);
        content.appendChild(urlListDiv);
        content.appendChild(statusDiv);
        content.appendChild(logDiv);

        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);
        document.body.appendChild(floatBtn);

        console.log("UI创建完成，添加事件处理...");

        // 模式切换按钮事件
        document.getElementById('mt-mode-standard').addEventListener('click', function () {
            usePostMode = false;
            this.style.background = theme.primary;
            this.style.color = 'white';
            document.getElementById('mt-mode-post').style.background = theme.gray;
            document.getElementById('mt-mode-post').style.color = theme.text;
            document.getElementById('mt-standard-input').style.display = 'block';
            document.getElementById('mt-post-input').style.display = 'none';
            logMessage(`🔄 切换到标准模式`, true);
        });

        document.getElementById('mt-mode-post').addEventListener('click', function () {
            usePostMode = true;
            this.style.background = theme.primary;
            this.style.color = 'white';
            document.getElementById('mt-mode-standard').style.background = theme.gray;
            document.getElementById('mt-mode-standard').style.color = theme.text;
            document.getElementById('mt-standard-input').style.display = 'none';
            document.getElementById('mt-post-input').style.display = 'block';
            logMessage(`🔄 切换到美团POST模式`, true);
        });

        // 标准模式添加URL按钮事件
        document.getElementById('mt-add-url-btn').addEventListener('click', function () {
            const urlInput = document.getElementById('mt-url-input');
            const nameInput = document.getElementById('mt-url-name');
            const methodSelect = document.getElementById('mt-url-method');

            if (urlInput && urlInput.value) {
                const url = urlInput.value.trim();
                const name = nameInput ? nameInput.value.trim() : '';
                const method = methodSelect ? methodSelect.value : 'GET';

                if (addUrl(url, name, method)) {
                    // 清空输入框
                    urlInput.value = '';
                    if (nameInput) nameInput.value = '';
                }
            } else {
                alert('请输入有效的URL!');
            }
        });

        // 美团POST模式添加URL按钮事件
        document.getElementById('mt-add-post-url-btn').addEventListener('click', function () {
            const postUrlInput = document.getElementById('mt-url-post-input');
            const getUrlInput = document.getElementById('mt-get-url-input');
            const nameInput = document.getElementById('mt-post-name-input');
            const freqInput = document.getElementById('mt-post-freq-input');

            if (postUrlInput && postUrlInput.value) {
                const postUrl = postUrlInput.value.trim();
                const getUrl = getUrlInput ? getUrlInput.value.trim() : '';
                const name = nameInput ? nameInput.value.trim() : '';
                const freq = freqInput ? parseInt(freqInput.value) || 100 : 100;

                if (addUrl(postUrl, name, 'POST', getUrl, postUrl, freq)) {
                    // 清空输入框
                    postUrlInput.value = '';
                    if (getUrlInput) getUrlInput.value = '';
                    if (nameInput) nameInput.value = '';
                }
            } else {
                alert('请输入有效的POST URL!');
            }
        });

        // 时间选择按钮事件
        document.querySelectorAll('.mt-time-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.mt-time-btn').forEach(b => {
                    b.style.background = theme.gray;
                    b.style.color = theme.text;
                });
                this.style.background = theme.primary;
                this.style.color = theme.light;

                // 设置选择的时间
                let hour = parseInt(this.getAttribute('data-time'));
                setSelectedTime(hour);
            });
        });

        // 启动/停止按钮事件
        document.getElementById('mt-toggle-btn').addEventListener('click', function () {
            if (!selectedTimeObj) {
                alert("请先选择抢券时间!");
                return;
            }

            if (targetUrls.length === 0) {
                alert("请先添加抢券URL!");
                return;
            }

            isRunning = !isRunning;

            let statusEl = document.getElementById('mt-status');
            let toggleBtn = document.getElementById('mt-toggle-btn');

            if (isRunning) {
                statusEl.textContent = "运行中";
                statusEl.style.color = theme.success;
                toggleBtn.textContent = "停止抢券";
                toggleBtn.style.background = theme.warning;
                logMessage("🚀 抢券功能已启动，等待时间到达...", true);

                // 启动定时检查
                startScheduler();
            } else {
                statusEl.textContent = "未启动";
                statusEl.style.color = "";
                toggleBtn.textContent = "启动抢券";
                toggleBtn.style.background = theme.primary;
                logMessage("⏹️ 抢券功能已停止", true);

                // 停止定时检查
                stopScheduler();
            }
        });

        // 折叠按钮事件
        document.getElementById('mt-collapse-btn').addEventListener('click', function () {
            toggleCollapse();
        });

        // 最小化按钮事件
        document.getElementById('mt-min-btn').addEventListener('click', function () {
            toggleMinimize();
        });

        // 关闭按钮事件
        document.getElementById('mt-close-btn').addEventListener('click', function () {
            document.getElementById('mt-tool-container').remove();
            document.getElementById('mt-float-btn').remove();
        });

        // 浮动按钮事件
        document.getElementById('mt-float-btn').addEventListener('click', function () {
            toggleMinimize();
        });

        // 复制日志按钮事件
        document.getElementById('mt-copy-log').addEventListener('click', function () {
            copyLogs();
        });

        // 清空日志按钮事件
        document.getElementById('mt-clear-log').addEventListener('click', function () {
            document.getElementById('mt-log').innerHTML = '';
            logMessage("🧹 日志已清空");
        });

        // 拖动功能
        makeDraggable(container, header);

        // 监听窗口大小变化，自动适配
        window.addEventListener('resize', function () {
            updateDeviceStatus();
        });

        // 添加初始日志
        logMessage("🎮 美团抢券工具初始化完成，请添加抢券URL并选择时间", true);
        logMessage("ℹ️ 当前使用美团POST模式，适用于秒杀场景", true);

        // 初始化URL列表
        updateUrlList();

        // 定期更新统计信息
        setInterval(updateStats, 1000);
    } catch (e) {
        console.error("创建UI出错:", e);
        alert("创建界面出错: " + e.message);
    }
}

// 复制日志内容
function copyLogs() {
    let logEl = document.getElementById('mt-log');
    if (!logEl) return;

    // 提取纯文本日志内容
    let logText = '';
    Array.from(logEl.children).forEach(item => {
        logText += item.innerText + '\n';
    });

    // 使用navigator.clipboard API复制
    if (navigator.clipboard) {
        navigator.clipboard.writeText(logText)
            .then(() => {
                logMessage("📋 日志已复制到剪贴板", true);
            })
            .catch(err => {
                console.error('复制失败:', err);
                logMessage("❌ 复制失败，请手动复制", true);
            });
    } else {
        // 回退方法
        const textarea = document.createElement('textarea');
        textarea.value = logText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            logMessage("📋 日志已复制到剪贴板", true);
        } catch (err) {
            console.error('复制失败:', err);
            logMessage("❌ 复制失败，请手动复制", true);
        }

        document.body.removeChild(textarea);
    }
}

// 切换折叠状态
function toggleCollapse() {
    isCollapsed = !isCollapsed;

    let container = document.getElementById('mt-tool-container');
    let collapseBtn = document.getElementById('mt-collapse-btn');

    if (isCollapsed) {
        container.style.height = '40px';
        container.style.overflow = 'hidden';
        collapseBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        collapseBtn.title = "展开工具";
    } else {
        container.style.height = '';
        container.style.maxHeight = isMobile ? '80vh' : '500px';
        collapseBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13L12 20L5 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 5L12 12L5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        collapseBtn.title = "折叠工具";
    }
}

// 切换最小化状态
function toggleMinimize() {
    isMinimized = !isMinimized;

    let container = document.getElementById('mt-tool-container');
    let floatBtn = document.getElementById('mt-float-btn');

    if (isMinimized) {
        container.style.display = 'none';
        floatBtn.style.display = 'block';
    } else {
        container.style.display = 'block';
        floatBtn.style.display = 'none';
        // 如果之前是折叠状态，恢复到展开状态
        if (isCollapsed) {
            toggleCollapse();
        }
    }
}

// 更新设备状态
function updateDeviceStatus() {
    let oldIsMobile = isMobile;
    isMobile = window.innerWidth < 768;

    // 如果状态改变，重新创建UI
    if (oldIsMobile !== isMobile && document.getElementById('mt-tool-container')) {
        document.getElementById('mt-tool-container').remove();
        if (document.getElementById('mt-float-btn')) {
            document.getElementById('mt-float-btn').remove();
        }
        createUI();
    }
}

// 使元素可拖动
function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handle.style.cursor = 'move';

    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function dragTouchStart(e) {
        e = e || window.event;

        if (e.touches && e.touches[0]) {
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;

            document.ontouchend = closeTouchDrag;
            document.ontouchmove = elementTouchDrag;
        }
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        updateElementPosition();
    }

    function elementTouchDrag(e) {
        e = e || window.event;

        if (e.touches && e.touches[0]) {
            pos1 = pos3 - e.touches[0].clientX;
            pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;

            updateElementPosition();
        }
    }

    function updateElementPosition() {
        // 计算新位置
        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // 防止拖出视口
        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;
        if (newTop + element.offsetHeight > window.innerHeight) {
            newTop = window.innerHeight - element.offsetHeight;
        }
        if (newLeft + element.offsetWidth > window.innerWidth) {
            newLeft = window.innerWidth - element.offsetWidth;
        }

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
        element.style.right = "auto";
        element.style.bottom = "auto";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function closeTouchDrag() {
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

// 更新统计信息
function updateStats() {
    let statsEl = document.getElementById('mt-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <span title="总请求数">📊 总请求: ${totalRequests}</span> | 
            <span title="成功请求数" style="color:${theme.success};">✅ 成功请求: ${successfulRequests}</span> | 
            <span title="目标URL数">🔗 URL数量: ${targetUrls.length}</span>
        `;
    }
}

// 设置选择的时间
function setSelectedTime(hour, minute = 0) {
    try {
        let now = new Date();
        selectedTime = `${hour}:${minute.toString().padStart(2, '0')}`;

        selectedTimeObj = new Date();
        selectedTimeObj.setHours(hour, minute, 0, 0);

        // 如果选择的时间已过，则设置为明天
        if (selectedTimeObj < now) {
            selectedTimeObj.setDate(selectedTimeObj.getDate() + 1);
        }

        let selectedEl = document.getElementById('mt-selected-time');
        if (selectedEl) {
            selectedEl.textContent = `目标时间: ${selectedTimeObj.toLocaleString()}`;
        }

        logMessage(`已选择抢券时间: ${hour}:${minute.toString().padStart(2, '0')}`, true);
        console.log("选择时间:", selectedTimeObj);
    } catch (e) {
        console.error("设置时间出错:", e);
    }
}

//==============================初始化函数==============================
// 直接发送请求功能
async function sendRequest(url, method = 'GET', headers = {}, body = null) {
    try {
        logMessage(`🚀 发送请求: ${method} ${url.substring(0, 40)}...`, true);

        // 构建请求选项
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            credentials: 'include',  // 包含Cookie
            mode: 'cors',  // 允许跨域
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        totalRequests++;
        const response = await fetch(url, options);
        const responseText = await response.text();

        try {
            const data = JSON.parse(responseText);
            logMessage(`📥 请求成功: ${response.status} ${response.statusText}`, true);
            logMessage(`📄 响应内容: ${JSON.stringify(data).substring(0, 100)}...`, false);

            // 检查响应状态
            if (response.ok && data && (data.code === 0 || data.status === 0)) {
                successfulRequests++;
                logMessage(`✅ 请求成功，响应码: ${data.code || data.status}, 消息: ${data.msg || 'OK'}`, true);
                return { success: true, data: data };
            } else {
                logMessage(`⚠️ 请求返回错误: ${data.code || data.status || response.status}, 消息: ${data.msg || response.statusText}`, true);
                return { success: false, data: data, status: response.status };
            }
        } catch (e) {
            // 非JSON响应
            logMessage(`⚠️ 响应不是有效的JSON: ${e.message}`, true);
            logMessage(`📄 原始响应: ${responseText.substring(0, 100)}...`, false);
            return { success: false, text: responseText, status: response.status };
        }
    } catch (error) {
        logMessage(`❌ 请求发送失败: ${error.message}`, true);
        return { success: false, error: error.message };
    }
}

// 测试URL功能
async function testUrl(urlObj) {
    try {
        logMessage(`🧪 测试URL: ${urlObj.name || urlObj.url || urlObj.postUrl}`, true);

        if (usePostMode && urlObj.getUrl && urlObj.postUrl) {
            // 使用美团特殊请求格式
            logMessage(`🔍 使用美团POST模式测试...`, true);

            try {
                // 检查必要的API是否存在
                if (!window.H5guard || !window.H5guard.getfp || !window.H5guard.sign) {
                    logMessage(`❌ 缺少必要的美团API: H5guard`, true);
                    return { success: false, error: "缺少必要的美团API: H5guard" };
                }

                if (!window.axios) {
                    // 尝试加载axios
                    logMessage(`⚠️ 尝试加载axios库...`, true);
                    try {
                        await loadAxios();
                        logMessage(`✅ axios加载成功`, true);
                    } catch (error) {
                        logMessage(`❌ 加载axios失败，无法发送请求: ${error.message}`, true);
                        return { success: false, error: error.message };
                    }
                }

                // 配置文件
                const config = {
                    headers: {
                        "Cookie": "\"" + document.cookie + "\""
                    }
                };

                // 先发送GET请求
                try {
                    logMessage(`📤 发送GET激活请求: ${urlObj.getUrl.substring(0, 40)}...`, true);
                    const getResponse = await window.axios.get(urlObj.getUrl, config);

                    if (getResponse.data && getResponse.data.data && getResponse.data.data.couponInfo) {
                        logMessage(`✅ GET请求成功，优惠券信息获取成功`, true);
                    } else {
                        logMessage(`⚠️ GET请求未返回优惠券信息: ${JSON.stringify(getResponse.data).substring(0, 100)}...`, true);
                    }
                } catch (error) {
                    logMessage(`⚠️ GET请求失败: ${error.message}，继续尝试POST请求...`, true);
                }

                // 生成指纹
                let mtFingerprint = window.H5guard.getfp();
                logMessage(`🔑 生成指纹: ${mtFingerprint.substring(0, 15)}...`, true);

                // 构建请求数据
                const req = {
                    "url": urlObj.postUrl,
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json",
                        "content-type": "application/json",
                        "content-encoding": "",
                        "Cookie": "\"" + document.cookie + "\""
                    },
                    "data": {
                        "cType": "wx_wallet",
                        "fpPlatform": 13,
                        "wxOpenId": "",
                        "appVersion": "",
                        "mtFingerprint": mtFingerprint
                    }
                };

                // 生成签名
                logMessage(`🔐 正在通过H5guard生成签名...`, true);
                const signResult = await window.H5guard.sign(req);

                if (!signResult || !signResult.headers || !signResult.headers.mtgsig) {
                    logMessage(`❌ 签名生成失败`, true);
                    return { success: false, error: "签名生成失败" };
                }

                const mtgsig = signResult.headers.mtgsig;
                logMessage(`✅ 签名生成成功: ${mtgsig.substring(0, 15)}...`, true);

                // 添加签名到请求头
                config.headers.mtgsig = mtgsig;

                // 发送POST请求
                logMessage(`📤 发送POST请求: ${urlObj.postUrl.substring(0, 40)}...`, true);
                const postResponse = await window.axios.post(urlObj.postUrl, req.data, config);

                // 处理响应
                logMessage(`📥 POST请求响应: ${JSON.stringify(postResponse.data).substring(0, 100)}...`, true);

                if (postResponse.data && postResponse.data.msg) {
                    logMessage(`📄 响应消息: ${postResponse.data.msg}`, true);

                    if (postResponse.data.code === 0 || postResponse.data.msg.includes('成功')) {
                        logMessage(`🎉 抢券成功!`, true);
                        return { success: true, data: postResponse.data };
                    } else if (postResponse.data.msg.includes('时间验证失败')) {
                        logMessage(`⏰ 时间验证失败，请在指定时间点运行`, true);
                        return { success: false, data: postResponse.data };
                    } else {
                        logMessage(`⚠️ 请求失败: ${postResponse.data.msg}`, true);
                        return { success: false, data: postResponse.data };
                    }
                } else {
                    logMessage(`⚠️ 响应格式异常: ${JSON.stringify(postResponse.data).substring(0, 100)}...`, true);
                    return { success: false, data: postResponse.data };
                }
            } catch (error) {
                logMessage(`❌ 美团POST请求失败: ${error.message}`, true);
                return { success: false, error: error.message };
            }
        } else {
            // 使用普通请求
            const method = urlObj.method || 'GET';
            const url = urlObj.url || urlObj.getUrl;

            logMessage(`📤 发送${method}请求: ${url.substring(0, 40)}...`, true);
            const result = await sendRequest(url, method);

            if (result.success) {
                logMessage(`✅ URL测试成功！响应正常`, true);
            } else {
                logMessage(`❌ URL测试失败！请检查URL是否正确`, true);
            }
            return result;
        }
    } catch (error) {
        logMessage(`❌ URL测试出错: ${error.message}`, true);
        return { success: false, error: error.message };
    }
}

// 定时发送请求功能
async function scheduledRequest() {
    if (!isRunning || !selectedTimeObj || targetUrls.length === 0) return;

    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - selectedTimeObj.getTime());

    // 如果距离目标时间在30秒内，开始请求
    if (timeDiff <= 30000) {
        logMessage(`⏰ 定时触发！开始发送抢券请求...`, true);

        // 遍历所有URL
        for (const urlObj of targetUrls) {
            try {
                if (usePostMode && urlObj.getUrl && urlObj.postUrl) {
                    // 使用美团特殊请求格式
                    logMessage(`🚀 使用美团POST模式抢券: ${urlObj.name || urlObj.postUrl.substring(0, 20)}`, true);

                    // 检查必要的API是否存在
                    if (!window.H5guard || !window.H5guard.getfp || !window.H5guard.sign) {
                        logMessage(`❌ 缺少必要的美团API: H5guard`, true);
                        continue;
                    }

                    if (!window.axios) {
                        // 尝试加载axios
                        logMessage(`⚠️ 尝试加载axios库...`, true);
                        try {
                            await loadAxios();
                            logMessage(`✅ axios加载成功`, true);
                        } catch (error) {
                            logMessage(`❌ 加载axios失败，无法发送请求: ${error.message}`, true);
                            continue;
                        }
                    }

                    // 配置文件
                    const config = {
                        headers: {
                            "Cookie": "\"" + document.cookie + "\""
                        }
                    };

                    // 先发送GET请求
                    try {
                        logMessage(`📤 发送GET激活请求: ${urlObj.getUrl.substring(0, 40)}...`, true);
                        const getResponse = await window.axios.get(urlObj.getUrl, config);

                        if (getResponse.data && getResponse.data.data && getResponse.data.data.couponInfo) {
                            logMessage(`✅ GET请求成功，优惠券信息获取成功`, true);
                        } else {
                            logMessage(`⚠️ GET请求未返回优惠券信息: ${JSON.stringify(getResponse.data).substring(0, 100)}...`, true);
                        }
                    } catch (error) {
                        logMessage(`⚠️ GET请求失败: ${error.message}，继续尝试POST请求...`, true);
                    }

                    // 循环发送请求
                    const requestCount = 5; // 发送多次请求增加成功率
                    let successFlag = false;

                    for (let i = 0; i < requestCount && !successFlag; i++) {
                        try {
                            // 生成指纹
                            let mtFingerprint = window.H5guard.getfp();
                            logMessage(`🔄 第${i + 1}次尝试，生成指纹...`, true);

                            // 构建请求数据
                            const req = {
                                "url": urlObj.postUrl,
                                "method": "POST",
                                "headers": {
                                    "Content-Type": "application/json",
                                    "content-type": "application/json",
                                    "content-encoding": "",
                                    "Cookie": "\"" + document.cookie + "\""
                                },
                                "data": {
                                    "cType": "wx_wallet",
                                    "fpPlatform": 13,
                                    "wxOpenId": "",
                                    "appVersion": "",
                                    "mtFingerprint": mtFingerprint
                                }
                            };

                            // 生成签名
                            logMessage(`🔐 正在生成签名...`, i === 0); // 只记录第一次
                            const signResult = await window.H5guard.sign(req);

                            if (!signResult || !signResult.headers || !signResult.headers.mtgsig) {
                                logMessage(`❌ 签名生成失败`, true);
                                continue;
                            }

                            const mtgsig = signResult.headers.mtgsig;

                            // 添加签名到请求头
                            config.headers.mtgsig = mtgsig;

                            // 发送POST请求
                            logMessage(`📤 发送POST请求(${i + 1}/${requestCount})...`, i === 0);
                            const postResponse = await window.axios.post(urlObj.postUrl, req.data, config);

                            // 处理响应
                            if (postResponse.data && postResponse.data.msg) {
                                logMessage(`📥 响应: ${postResponse.data.msg}`, true);

                                if (postResponse.data.code === 0 || postResponse.data.msg.includes('成功')) {
                                    logMessage(`🎉 抢券成功! ${urlObj.name || urlObj.postUrl.substring(0, 20)}`, true);
                                    successfulRequests++;
                                    successFlag = true;
                                    break;
                                } else if (postResponse.data.msg.includes('时间验证失败')) {
                                    logMessage(`⏰ 时间验证失败，尝试重试...`, i === 0);
                                } else {
                                    logMessage(`⚠️ 请求失败: ${postResponse.data.msg}，尝试重试...`, i === 0);
                                }
                            } else {
                                logMessage(`⚠️ 响应格式异常，尝试重试...`, i === 0);
                            }

                            // 短暂延迟，避免请求过于频繁
                            await new Promise(r => setTimeout(r, urlObj.freq || 100));
                        } catch (error) {
                            logMessage(`❌ 请求失败: ${error.message}`, true);
                        }
                    }

                    if (!successFlag) {
                        logMessage(`❌ 该优惠券抢券失败，已尝试${requestCount}次`, true);
                    }
                } else {
                    // 使用普通请求
                    for (let i = 0; i < 3; i++) {
                        logMessage(`🔄 第${i + 1}次尝试: ${urlObj.name || urlObj.url.substring(0, 20)}...`, true);
                        const result = await sendRequest(urlObj.url, urlObj.method || 'GET');

                        if (result.success) {
                            logMessage(`🎉 抢券成功: ${urlObj.name || urlObj.url.substring(0, 20)}`, true);
                            break; // 成功一次即可停止当前URL的尝试
                        } else {
                            logMessage(`❌ 抢券失败，尝试再次请求`, true);
                        }

                        // 短暂延迟，避免请求过于频繁
                        await new Promise(r => setTimeout(r, 200));
                    }
                }
            } catch (error) {
                logMessage(`❌ 抢券请求出错: ${error.message}`, true);
            }
        }

        // 抢券完成后，停止定时器
        isRunning = false;
        const statusEl = document.getElementById('mt-status');
        const toggleBtn = document.getElementById('mt-toggle-btn');
        if (statusEl) statusEl.textContent = "已完成";
        if (toggleBtn) {
            toggleBtn.textContent = "启动抢券";
            toggleBtn.style.background = theme.primary;
        }

        logMessage(`🏁 抢券任务已完成！`, true);

        // 停止定时检查
        stopScheduler();
    }
}

// URL操作管理
function addUrl(url, name = '', method = 'GET', getUrl = '', postUrl = '', freq = 100) {
    try {
        if (usePostMode) {
            // POST模式需要同时提供get和post URL
            if (!getUrl && !postUrl) {
                if (!url) {
                    logMessage(`⚠️ URL不能为空`, true);
                    return false;
                }

                // 如果用户只提供了一个URL，尝试推断是get还是post
                if (url.includes('fetchcoupon')) {
                    postUrl = url;
                    // 尝试从postUrl构造getUrl
                    const match = url.match(/couponReferId=([^&]+)/);
                    if (match && match[1]) {
                        getUrl = `https://promotion.waimai.meituan.com/lottery/limitcouponcomponent/info?couponReferIds=${match[1]}`;
                        logMessage(`🔍 从POST URL自动生成GET URL: ${getUrl}`, true);
                    } else {
                        logMessage(`⚠️ 无法从POST URL生成GET URL，请手动填写`, true);
                        return false;
                    }
                } else if (url.includes('info') && url.includes('couponReferIds')) {
                    getUrl = url;
                    // 尝试从getUrl构造postUrl
                    const match = url.match(/couponReferIds=([^&]+)/);
                    if (match && match[1]) {
                        const timestamp = new Date().getTime();
                        postUrl = `https://promotion.waimai.meituan.com/lottery/rights/limitcouponcomponent/fetchcoupon?couponReferId=${match[1]}&componentId=17468461083160.830296731880672&geoType=2&version=1&instanceId=17468461083160.830296731880672&clientTime=${timestamp}&ctype=mtiphone&gdPageId=597895&pageId=613795&gdBs=0000&pageVersion=1746846147555&utmMedium=iphone&csecplatform=4&csecversion=3.1.0`;
                        logMessage(`🔍 从GET URL自动生成POST URL: ${postUrl}`, true);
                    } else {
                        logMessage(`⚠️ 无法从GET URL生成POST URL，请手动填写`, true);
                        return false;
                    }
                } else {
                    // 不清楚是什么格式，优先尝试作为postUrl
                    logMessage(`⚠️ 无法识别URL类型，请确保输入正确的URL格式`, true);
                    return false;
                }
            }

            // 检查URL是否已存在
            if (targetUrls.some(item => item.postUrl === postUrl)) {
                logMessage(`⚠️ 该优惠券URL已存在: ${postUrl}`, true);
                return false;
            }

            // 添加新URL
            targetUrls.push({
                getUrl,
                postUrl,
                name: name || `优惠券${targetUrls.length + 1}`,
                freq: freq || 100
            });

            logMessage(`➕ 添加抢券URL: ${name || postUrl}`, true);
        } else {
            // 标准模式
            if (!url) {
                logMessage(`⚠️ URL不能为空`, true);
                return false;
            }

            // 检查URL是否已存在
            if (targetUrls.some(item => item.url === url)) {
                logMessage(`⚠️ URL已存在: ${url}`, true);
                return false;
            }

            // 添加新URL
            targetUrls.push({
                url,
                name: name || `优惠券${targetUrls.length + 1}`,
                method
            });

            logMessage(`➕ 添加抢券URL: ${name || url}`, true);
        }

        // 更新URL列表UI
        updateUrlList();
        return true;
    } catch (error) {
        logMessage(`❌ 添加URL出错: ${error.message}`, true);
        return false;
    }
}

function removeUrl(index) {
    if (index >= 0 && index < targetUrls.length) {
        const removed = targetUrls.splice(index, 1)[0];
        logMessage(`➖ 移除抢券URL: ${removed.name || removed.url}`, true);

        // 更新URL列表UI
        updateUrlList();
        return true;
    }
    return false;
}

function updateUrlList() {
    const listEl = document.getElementById('mt-url-list');
    const countEl = document.getElementById('mt-url-count');
    if (!listEl || !countEl) return;

    countEl.textContent = `${targetUrls.length} 个`;

    if (targetUrls.length === 0) {
        listEl.innerHTML = '<div style="padding: 10px; color: #999; text-align: center;">请添加抢券URL</div>';
        return;
    }

    let html = '';
    targetUrls.forEach((urlObj, index) => {
        html += `
            <div style="
                padding: 10px;
                margin-bottom: 5px;
                border-radius: 6px;
                background: ${theme.light};
                border: 1px solid ${theme.border};
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            ">
                <div style="width: 100%; margin-bottom: 5px; word-break: break-all;">
                    <div style="font-weight: bold; color: ${theme.text};">${urlObj.name}</div>
                    <div style="font-size: 0.9em; color: #666; word-break: break-all;">${urlObj.url.substring(0, 50)}${urlObj.url.length > 50 ? '...' : ''}</div>
                </div>
                <div style="width: 100%; display: flex; justify-content: space-between; margin-top: 5px;">
                    <div style="color: #666; font-size: 0.85em;">
                        ${urlObj.method || 'GET'}
                    </div>
                    <div>
                        <button class="mt-test-btn" data-index="${index}" style="
                            padding: 3px 6px;
                            margin-right: 5px;
                            background: ${theme.info};
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.85em;
                        ">测试</button>
                        <button class="mt-remove-btn" data-index="${index}" style="
                            padding: 3px 6px;
                            background: ${theme.error};
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.85em;
                        ">删除</button>
                    </div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;

    // 添加事件监听
    document.querySelectorAll('.mt-test-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-index'));
            if (index >= 0 && index < targetUrls.length) {
                testUrl(targetUrls[index]);
            }
        });
    });

    document.querySelectorAll('.mt-remove-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-index'));
            removeUrl(index);
        });
    });
}

// 启动定时任务
let schedulerInterval = null;
function startScheduler() {
    // 每秒检查一次
    schedulerInterval = setInterval(scheduledRequest, 1000);
    logMessage(`⏰ 定时器已启动，等待时间到达: ${selectedTimeObj.toLocaleTimeString()}`, true);
}

function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        logMessage(`⏹️ 定时器已停止`, true);
    }
}

// 初始化函数
function init() {
    try {
        console.log("美团抢券工具初始化...");
        logMessage("🚀 美团抢券工具正在初始化...", true);

        // 延迟创建UI，等待页面完全加载
        setTimeout(function () {
            createUI();
            logMessage("✨ 界面创建完成", true);
            logMessage("💡 请先添加抢券URL，然后选择抢券时间并启动", true);
        }, 1000);

        // 添加页面错误处理
        window.addEventListener('error', function (e) {
            logMessage(`⚠️ 页面错误: ${e.message}`, true);
        });

        console.log("初始化完成");
    } catch (e) {
        console.error("初始化出错:", e);
        alert("初始化出错: " + e.message);
    }
}

// 启动工具
console.log("美团抢券工具脚本加载...");
init();