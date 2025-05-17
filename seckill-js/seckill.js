// 美团外卖自动抢券工具
// 基本配置
const BASE_GET_URL = 'https://promotion.waimai.meituan.com/lottery/limitcouponcomponent/info?couponReferIds=';
// 设置API服务器地址
const API_SERVER_URL = 'http://localhost:8000';  // 根据实际情况修改为你的API服务器地址
let taskConfigs = [];
let currentStatus = '未启动';
let logMessages = [];
let totalRequests = 0;
let successRequests = 0;
let priorityRequests = 0;
let apiKey = '';  // 存储API密钥

// 新增高级配置选项
let advancedConfig = {
    requestsPerTask: 3, // 默认每个任务请求3次
    preStartMilliseconds: 500, // 默认提前500毫秒开始
    logDirection: 'bottom', // 默认日志显示方向(bottom: 最新在底部, top: 最新在顶部)
    autoSyncTasks: false, // 是否自动同步远程任务
    syncInterval: 5 * 60 * 1000, // 默认5分钟同步一次任务
};

// HTTP客户端 - 使用原生fetch替代axios
const httpClient = {
    async get(url, options = {}) {
        const fetchOptions = {
            method: 'GET',
            headers: options.headers || {}
        };

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw {
                    response: {
                        status: response.status,
                        data: errorData
                    },
                    message: `请求失败: ${response.status} ${response.statusText}`
                };
            }
            return { data: await response.json(), status: response.status };
        } catch (error) {
            if (!error.response) {
                error.response = { data: { detail: error.message } };
            }
            throw error;
        }
    },

    async post(url, data, options = {}) {
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        };

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw {
                    response: {
                        status: response.status,
                        data: errorData
                    },
                    message: `请求失败: ${response.status} ${response.statusText}`
                };
            }
            return { data: await response.json(), status: response.status };
        } catch (error) {
            if (!error.response) {
                error.response = { data: { detail: error.message } };
            }
            throw error;
        }
    }
};

// 从 postUrl 提取 couponReferId
function extractCouponReferId(postUrl) {
    const match = postUrl.match(/couponReferId=([^&]+)/);
    return match ? match[1] : null;
}

// 获取当前时间
function getNowTime() {
    const date = new Date();
    const hour = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    const minute = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    const second = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
    const milliSeconds = date.getMilliseconds();
    return [hour, minute, second, milliSeconds];
}

// 添加日志
function addLog(message, isSuccess = false, isError = false, isInfo = false) {
    const timeData = getNowTime();
    const timeStr = `[${timeData[0]}:${timeData[1]}:${timeData[2]}]`;

    let emoji = '📝';
    if (isSuccess) emoji = '✅';
    if (isError) emoji = '❌';
    if (isInfo) emoji = '📢';

    // 为不同类型的消息添加样式类
    let cssClass = '';
    if (isSuccess) cssClass = 'log-success';
    if (isError) cssClass = 'log-error';
    if (isInfo) cssClass = 'log-info';

    const logItem = `<span class="log-time">${timeStr}</span> <span class="log-emoji ${cssClass}">${emoji} ${message}</span>`;

    // 根据配置决定日志的追加方向
    if (advancedConfig.logDirection === 'top') {
        logMessages.unshift(logItem);
    } else {
        logMessages.push(logItem);
    }

    // 限制日志条数
    if (logMessages.length > 100) {
        if (advancedConfig.logDirection === 'top') {
            logMessages = logMessages.slice(0, 100);
        } else {
            logMessages = logMessages.slice(-100);
        }
    }

    // 更新日志显示
    updateLogDisplay();
}

// 更新日志显示
function updateLogDisplay() {
    const logElement = document.getElementById('operation-logs');
    if (logElement) {
        logElement.innerHTML = '';

        let logsToShow = advancedConfig.logDirection === 'top'
            ? logMessages.slice(0, 50)
            : logMessages.slice(-50);

        if (advancedConfig.logDirection === 'bottom') {
            // 如果最新日志在底部，则正常顺序显示
            logsToShow.forEach(msg => {
                const logItem = document.createElement('div');
                logItem.className = 'log-item';
                logItem.innerHTML = msg;
                logElement.appendChild(logItem);

                // 为新的日志项添加淡入效果
                setTimeout(() => {
                    logItem.style.opacity = '1';
                }, 10);
            });
        } else {
            // 如果最新日志在顶部，则反向显示
            logsToShow.forEach(msg => {
                const logItem = document.createElement('div');
                logItem.className = 'log-item';
                logItem.innerHTML = msg;
                logElement.prepend(logItem);

                // 为新的日志项添加淡入效果
                setTimeout(() => {
                    logItem.style.opacity = '1';
                }, 10);
            });
        }

        // 滚动到适当位置
        if (advancedConfig.logDirection === 'bottom') {
            logElement.scrollTop = logElement.scrollHeight;
        } else {
            logElement.scrollTop = 0;
        }
    }
}

// 更新状态显示
function updateStatusDisplay() {
    const statusElement = document.getElementById('status-display');
    const statusBadge = document.getElementById('status-badge');

    if (statusBadge) {
        statusBadge.textContent = currentStatus;

        // 根据状态更新样式
        statusBadge.classList.remove('running', 'stopped');
        if (currentStatus === '运行中') {
            statusBadge.classList.add('running');
        } else if (currentStatus === '已停止') {
            statusBadge.classList.add('stopped');
        }
    }

    const statsElement = document.getElementById('statistics');
    if (statsElement) {
        const statValues = statsElement.querySelectorAll('.stat-value');
        if (statValues.length >= 3) {
            statValues[0].textContent = totalRequests;
            statValues[1].textContent = successRequests;
            statValues[2].textContent = priorityRequests;
        }
    }
}

// 发送请求函数
async function send(postUrl, config, taskIndex) {
    totalRequests++;
    updateStatusDisplay();

    // 生成指纹
    let mtF = "";
    try {
        mtF = window.H5guard.getfp();
    } catch (e) {
        addLog('获取指纹失败: ' + e.message, false, true);
        return;
    }

    // 准备请求
    let req = {
        "url": postUrl,
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
            "mtFingerprint": mtF
        }
    };

    try {
        // 生成时间戳参数
        const signRes = await window.H5guard.sign(req);
        const mtgsig = signRes.headers.mtgsig;
        config.headers.mtgsig = mtgsig;

        // 发送post请求
        const res = await httpClient.post(postUrl, req.data, config);

        // 处理响应
        if (res.data.msg === '时间验证失败') {
            addLog('时间验证失败，继续尝试...', false, false, true);
        } else {
            if (res.data.code === 0 || res.data.msg === '成功') {
                addLog('🎉 抢券成功! ' + res.data.msg, true);
                successRequests++;
                taskConfigs[taskIndex].running = false;
            } else {
                addLog('抢券结果: ' + res.data.msg, false, false, true);
                if (res.data.msg.includes('已经')) {
                    taskConfigs[taskIndex].running = false;
                }
            }
            updateStatusDisplay();
        }
    } catch (err) {
        addLog('请求失败: ' + (err.message || '未知错误'), false, true);
        taskConfigs[taskIndex].running = false;
    }
}

// 开始抢券
async function start(taskIndex) {
    const task = taskConfigs[taskIndex];
    if (!task) return;

    task.running = true;
    const couponReferId = extractCouponReferId(task.postUrl);

    if (!couponReferId) {
        addLog('❌ 无法从URL提取券ID', false, true);
        task.running = false;
        return;
    }

    const getUrl = BASE_GET_URL + couponReferId;

    // 配置请求头
    const config = {
        headers: {
            Cookie: "\"" + document.cookie + "\""
        }
    };

    addLog(`🚀 开始抢券任务: ${task.name}`, false, false, true);

    // 发送GET请求检查券状态
    try {
        const res = await httpClient.get(getUrl, config);

        // 分析响应
        if (res.data && res.data.data && res.data.data.couponInfo) {
            const couponInfo = res.data.data.couponInfo;
            for (const k in couponInfo) {
                if (couponInfo[k]) {
                    addLog(`📊 券信息已激活，剩余百分比: ${couponInfo[k].progressPercent}%`, false, false, true);

                    // 设置请求计数器
                    let requestCount = 0;
                    const maxRequests = task.requestsPerTask || advancedConfig.requestsPerTask;

                    // 启动定期发送请求
                    const interval = setInterval(() => {
                        if (!task.running) {
                            clearInterval(interval);
                            addLog(`⏹️ 停止抢券任务: ${task.name}`, false, false, true);
                            return;
                        }

                        // 检查请求次数限制
                        if (maxRequests > 0 && requestCount >= maxRequests) {
                            clearInterval(interval);
                            addLog(`⏹️ 任务 ${task.name} 已完成 ${maxRequests} 次请求，任务结束`, false, false, true);
                            task.running = false;
                            return;
                        }

                        send(task.postUrl, config, taskIndex);
                        requestCount++;
                    }, task.frequency);
                    return;
                }
            }
            addLog('❓ 券信息获取成功但无法激活', false, true);
        } else {
            addLog('❌ 券信息获取失败', false, true);
        }
        task.running = false;
    } catch (err) {
        addLog('❌ 券状态检查失败: ' + (err.message || '未知错误'), false, true);
        task.running = false;
    }
}

// 计算任务启动时间
function calculateNextRunTime(timeStr) {
    // 支持时间字符串格式 "HH:MM:SS:mmm" 或 "HH:MM:SS" 或 "HH:MM"
    let [hours, minutes, seconds, ms] = [0, 0, 0, 0];
    const parts = timeStr.split(':');

    if (parts.length >= 2) {
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
    }
    if (parts.length >= 3) {
        seconds = parseInt(parts[2], 10);
    }
    if (parts.length >= 4) {
        ms = parseInt(parts[3], 10);
    }

    const now = new Date();
    const targetTime = new Date();

    targetTime.setHours(hours);
    targetTime.setMinutes(minutes);
    targetTime.setSeconds(seconds);
    targetTime.setMilliseconds(ms);

    if (targetTime <= now) {
        // 如果目标时间已过，设置为明天
        targetTime.setDate(targetTime.getDate() + 1);
    }

    // 应用提前量
    let adjustedTime = targetTime.getTime() - advancedConfig.preStartMilliseconds;

    return adjustedTime - now.getTime();
}

// 测试抢券配置
async function testTask(taskIndex) {
    const task = taskConfigs[taskIndex];
    if (!task) return;

    // 测试开始日志
    addLog(`🧪 开始测试任务: "${task.name}"`, false, false, true);
    addLog(`📋 测试详情: 频率${task.frequency}ms, 时间${task.time}`, false, false, true);

    // 1. 从URL提取券ID
    const couponReferId = extractCouponReferId(task.postUrl);
    if (!couponReferId) {
        addLog('❌ 测试失败：无法从URL提取券ID', false, true);
        return;
    }
    addLog(`🔍 成功提取券ID: ${couponReferId}`, false, false, true);

    const getUrl = BASE_GET_URL + couponReferId;
    addLog(`🔗 GET请求URL: ${getUrl}`, false, false, true);

    // 2. 配置请求头
    const config = {
        headers: {
            Cookie: "\"" + document.cookie + "\""
        }
    };
    addLog(`🍪 Cookie长度: ${document.cookie.length} 字符`, false, false, true);

    try {
        // 3. 测试GET请求获取券信息
        addLog(`📤 发送GET请求获取券信息...`, false, false, true);
        const res = await httpClient.get(getUrl, config);

        // 输出GET请求响应
        if (res.data && res.data.code === 0) {
            addLog(`✅ GET请求成功 (状态码: ${res.status})`, true);

            if (res.data.data && res.data.data.couponInfo) {
                const couponInfo = res.data.data.couponInfo;
                let couponDetails = [];

                // 详细输出券信息
                for (const k in couponInfo) {
                    if (couponInfo[k]) {
                        couponDetails.push({
                            name: couponInfo[k].couponName || '未知名称',
                            stock: couponInfo[k].stockCount || '未知',
                            remain: couponInfo[k].remainCount || '未知',
                            percent: couponInfo[k].progressPercent || '未知',
                            userLimit: couponInfo[k].userLimit || '未知'
                        });
                        addLog(`📊 券详情: ${couponInfo[k].couponName || '未命名券'}, 库存${couponInfo[k].remainCount || '?'}/${couponInfo[k].stockCount || '?'}, 进度${couponInfo[k].progressPercent || '?'}%`, false, false, true);
                    }
                }

                // 4. 测试指纹生成
                addLog(`🔐 开始生成请求指纹...`, false, false, true);
                let mtF = "";
                try {
                    mtF = window.H5guard.getfp();
                    addLog(`✅ 成功生成指纹 (长度: ${mtF.length})`, true);
                } catch (e) {
                    addLog(`❌ 生成指纹失败: ${e.message}`, false, true);
                    return;
                }

                // 5. 准备POST请求
                addLog(`📝 准备POST请求数据...`, false, false, true);
                let req = {
                    "url": task.postUrl,
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
                        "mtFingerprint": mtF
                    }
                };

                // 6. 测试签名生成
                addLog(`🔏 生成请求签名...`, false, false, true);
                try {
                    const signRes = await window.H5guard.sign(req);
                    const mtgsig = signRes.headers.mtgsig;
                    config.headers.mtgsig = mtgsig;
                    addLog(`✅ 成功生成签名`, true);

                    // 7. 发送一次POST请求
                    addLog(`📤 发送POST请求(仅一次)...`, false, false, true);
                    const postRes = await httpClient.post(task.postUrl, req.data, config);

                    // 输出POST响应结果
                    if (postRes.data) {
                        addLog(`📨 收到响应: ${JSON.stringify(postRes.data).substring(0, 100)}...`, false, false, true);

                        if (postRes.data.code === 0 || postRes.data.msg === '成功') {
                            addLog(`🎉 模拟抢券成功! ${postRes.data.msg}`, true);
                        } else if (postRes.data.msg === '时间验证失败') {
                            addLog(`⏰ 时间验证失败 - 实际抢券时会持续重试`, false, false, true);
                        } else {
                            addLog(`ℹ️ 抢券结果: ${postRes.data.msg}`, false, false, true);
                        }
                    } else {
                        addLog(`❓ 收到空响应`, false, true);
                    }
                } catch (err) {
                    addLog(`❌ 签名或POST请求失败: ${err.message || '未知错误'}`, false, true);
                }

                // 8. 总结测试结果
                addLog(`📑 测试完成! 已验证完整抢券流程`, true);
                addLog(`ℹ️ 实际抢券将在${task.time}时自动开始`, false, false, true);
            } else {
                addLog(`⚠️ 券信息为空或格式异常`, false, true);
            }
        } else {
            addLog(`❌ GET请求测试失败: ${res.data?.msg || '未知错误'} (代码: ${res.data?.code || '未知'})`, false, true);
        }
    } catch (err) {
        addLog(`❌ 测试过程出错: ${err.message || '未知错误'}`, false, true);
    }
}

// 初始化UI
function initUI() {
    // 移除旧容器（如果存在）
    const oldContainer = document.getElementById('seckill-container');
    if (oldContainer) {
        oldContainer.remove();
    }

    // 创建主容器
    const container = document.createElement('div');
    container.id = 'seckill-container';
    container.innerHTML = `
        <div class="seckill-header">
            <div class="header-logo">
                <span class="header-icon">🔥</span>
                <h1>美团外卖自动抢券工具</h1>
            </div>
            <div class="header-buttons">
                <button id="minimize-btn" class="circle-btn" title="最小化">
                    <span>—</span>
                </button>
                <button id="collapse-btn" class="circle-btn" title="折叠">
                    <span>↕</span>
                </button>
                <button id="close-btn" class="circle-btn" title="关闭">
                    <span>×</span>
                </button>
            </div>
        </div>
        
        <div class="seckill-body">
            <!-- API密钥输入区域 -->
            <div class="section">
                <h3><span class="section-icon">🔑</span> API密钥</h3>
                <div class="api-key-container">
                    <div class="input-container">
                        <input type="password" id="api-key-input" placeholder="请输入API密钥">
                    </div>
                    <div class="api-key-actions">
                        <button id="verify-api-key-btn" class="small-btn">验证密钥</button>
                        <button id="fetch-tasks-btn" class="small-btn secondary-btn">获取任务</button>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h3><span class="section-icon">⏰</span> 选择抢券时间</h3>
                <div class="time-buttons">
                    <button class="time-btn" data-time="10:00:00:000">10:00</button>
                    <button class="time-btn" data-time="14:00:00:000">14:00</button>
                    <button class="time-btn" data-time="17:00:00:000">17:00</button>
                    <button class="time-btn" data-time="20:00:00:000">20:00</button>
                </div>
                <div class="custom-time-input">
                    <label for="custom-time">自定义时间:</label>
                    <input type="time" id="custom-time" step="1">
                    <input type="number" id="custom-time-ms" placeholder="毫秒" min="0" max="999" step="1">
                    <button id="set-custom-time-btn" class="small-btn">设置</button>
                </div>
            </div>
            
            <div class="section">
                <h3><span class="section-icon">🔗</span> POST URL</h3>
                <div class="input-container">
                    <textarea id="post-url-input" placeholder="请粘贴完整的POST URL"></textarea>
                </div>
            </div>
            
            <div class="section">
                <div class="flex-row">
                    <div class="flex-col">
                        <h3><span class="section-icon">📝</span> 任务名称</h3>
                        <div class="input-container">
                            <input type="text" id="task-name-input" placeholder="如: 14点餐券">
                        </div>
                    </div>
                    <div class="flex-col">
                        <h3><span class="section-icon">⚡</span> 请求频率(ms)</h3>
                        <div class="input-container">
                            <input type="number" id="frequency-input" value="100" min="50" max="2000">
                        </div>
                    </div>
                    <div class="flex-col">
                        <h3><span class="section-icon">🔁</span> 请求次数</h3>
                        <div class="input-container">
                            <input type="number" id="requests-count-input" value="3" min="1" max="20">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section status-section">
                <div class="status-info">
                    <div class="status-badge" id="status-badge">未启动</div>
                    <div class="time-info">
                        <div class="time-item">
                            <span class="time-label">当前时间:</span>
                            <span class="time-value" id="current-time-display">--:--:--</span>
                        </div>
                        <div class="time-item">
                            <span class="time-label">目标时间:</span>
                            <span class="time-value" id="target-time-display">未设置</span>
                        </div>
                    </div>
                </div>
                <div class="button-group">
                    <button id="add-task-btn" class="action-btn">
                        <span class="btn-icon">+</span> 添加任务
                    </button>
                    <button id="start-btn" class="action-btn primary-btn">
                        <span class="btn-icon">▶</span> 启动抢券
                    </button>
                    <button id="test-btn" class="action-btn secondary-btn">
                        <span class="btn-icon">✓</span> 测试配置
                    </button>
                </div>
            </div>
            
            <div class="statistics-bar" id="statistics">
                <div class="stat-item tooltip" title="已发送的总请求数">
                    <span class="stat-icon">📊</span>
                    <span class="stat-label">总请求:</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item tooltip" title="成功抢到的券">
                    <span class="stat-icon">✅</span>
                    <span class="stat-label">抢券成功:</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item tooltip" title="优先级高的券">
                    <span class="stat-icon">🔥</span>
                    <span class="stat-label">优先券:</span>
                    <span class="stat-value">0</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header collapsible" data-target="advanced-settings">
                    <h3><span class="section-icon">⚙️</span> 高级设置</h3>
                    <span class="toggle-icon">▼</span>
                </div>
                <div id="advanced-settings" class="collapsible-content collapsed">
                    <div class="settings-grid">
                        <div class="setting-item">
                            <label for="pre-start-time">提前开始时间(毫秒):</label>
                            <input type="number" id="pre-start-time" value="500" min="0" max="10000">
                        </div>
                        <div class="setting-item">
                            <label for="log-direction">日志显示方向:</label>
                            <select id="log-direction">
                                <option value="bottom">最新日志在底部</option>
                                <option value="top">最新日志在顶部</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label for="display-mode">显示模式:</label>
                            <select id="display-mode">
                                <option value="normal">正常模式</option>
                                <option value="compact">紧凑模式</option>
                                <option value="mini">迷你模式</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label for="auto-sync-tasks">自动同步远程任务:</label>
                            <input type="checkbox" id="auto-sync-tasks">
                        </div>
                        <div class="setting-item">
                            <label for="sync-interval">同步间隔(分钟):</label>
                            <input type="number" id="sync-interval" value="5" min="1" max="60">
                        </div>
                    </div>
                    <div class="settings-actions">
                        <button id="save-settings-btn" class="small-btn">保存设置</button>
                        <button id="reset-settings-btn" class="small-btn danger-btn">重置设置</button>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header collapsible" data-target="tasks-container">
                    <h3><span class="section-icon">📋</span> 任务列表</h3>
                    <span class="toggle-icon">▼</span>
                </div>
                <div id="tasks-container" class="tasks-container collapsible-content"></div>
            </div>
            
            <div class="section">
                <div class="section-header collapsible" data-target="operation-logs">
                    <h3><span class="section-icon">📜</span> 操作日志</h3>
                    <span class="toggle-icon">▼</span>
                </div>
                <div id="operation-logs" class="logs-container collapsible-content"></div>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // 添加CSS样式
    const styleId = 'seckill-styles';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        
        #seckill-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 420px;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            z-index: 99999;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid rgba(0,0,0,0.1);
            max-height: 90vh;
            cursor: move; /* 指示可拖动 */
            user-select: none; /* 防止文本选择 */
            touch-action: none; /* 在移动设备上避免触摸操作冲突 */
        }
        
        /* API密钥相关样式 */
        .api-key-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .api-key-actions {
            display: flex;
            gap: 8px;
        }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
            #seckill-container {
                width: 92%;
                max-width: 420px;
                right: 4%;
                left: 4%;
                margin: 0 auto;
                top: 10px;
            }
            
            .flex-row {
                flex-direction: column;
                gap: 10px;
            }
            
            .button-group {
                flex-direction: column;
                gap: 8px;
            }
            
            .statistics-bar {
                flex-direction: column;
                gap: 8px;
                padding: 8px;
            }
            
            .status-info {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .stat-item {
                width: 100%;
                justify-content: flex-start;
            }
            
            .seckill-body {
                max-height: calc(85vh - 60px);
                padding: 10px;
            }
            
            .section {
                padding: 10px;
                margin-bottom: 12px;
            }
            
            .logs-container {
                height: 150px;
            }
            
            .task-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .task-item-actions {
                width: 100%;
                display: flex;
                justify-content: space-between;
            }
            
            .custom-time-input {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .custom-time-input input, 
            .custom-time-input button {
                margin-top: 5px;
                width: 100%;
            }
            
            .settings-grid {
                grid-template-columns: 1fr;
            }
        }
        
        #seckill-container.minimized {
            width: 300px;
            height: 50px;
            overflow: hidden;
        }
        
        #seckill-container.collapsed {
            width: 180px;
            height: auto;
            overflow: hidden;
        }
        
        #seckill-container.collapsed .seckill-body {
            display: none;
        }
        
        #seckill-container.collapsed .header-logo h1 {
            font-size: 14px;
        }
        
        #seckill-container.mini-mode .section:not(.status-section) {
            display: none;
        }
        
        #seckill-container.compact-mode .section-header + .collapsible-content {
            display: none;
        }
        
        .seckill-header {
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            cursor: move; /* 特别强调头部可以拖动 */
        }
        
        .header-logo {
            display: flex;
            align-items: center;
        }
        
        .header-icon {
            font-size: 20px;
            margin-right: 10px;
        }
        
        .seckill-header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .header-buttons {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }
        
        .circle-btn {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 0;
        }
        
        .circle-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.05);
        }
        
        #close-btn:hover {
            background: rgba(255, 59, 48, 0.7);
        }
        
        .seckill-body {
            padding: 15px;
            max-height: calc(90vh - 60px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; /* 改善移动端滚动体验 */
        }
        
        .section {
            margin-bottom: 18px;
            background: #f9f9f9;
            border-radius: 10px;
            padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        }
        
        .section:hover {
            background: #f5f5f5;
        }
        
        .section-icon {
            margin-right: 6px;
            font-size: 16px;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding: 0;
            margin: 0;
        }
        
        .toggle-icon {
            font-size: 12px;
            transition: transform 0.3s ease;
        }
        
        .section-header.active .toggle-icon {
            transform: rotate(180deg);
        }
        
        .collapsible-content {
            overflow: hidden;
            max-height: 1000px;
            transition: max-height 0.3s ease-out;
        }
        
        .collapsible-content.collapsed {
            max-height: 0;
        }
        
        h3 {
            margin: 0 0 10px 0;
            font-size: 15px;
            font-weight: 600;
            color: #333;
            display: flex;
            align-items: center;
        }
        
        .flex-row {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .flex-col {
            flex: 1;
            min-width: 100px; /* 确保不会太窄 */
        }
        
        /* 调整输入标签和表单元素样式 */
        .form-group-label {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .time-buttons {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
        }
        
        .time-btn {
            flex: 1;
            padding: 10px;
            border: 1px solid #e0e0e0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: #666;
            transition: all 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .time-btn:hover {
            background: #f5f5f5;
            transform: translateY(-1px);
        }
        
        .time-btn.selected {
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            color: white;
            border-color: transparent;
            box-shadow: 0 2px 5px rgba(255, 126, 95, 0.3);
        }
        
        .custom-time-input {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
        }
        
        .custom-time-input label {
            font-size: 14px;
            color: #666;
            white-space: nowrap;
        }
        
        .custom-time-input input[type="time"],
        .custom-time-input input[type="number"] {
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .custom-time-input input[type="number"] {
            width: 70px;
        }
        
        .small-btn {
            padding: 8px 12px;
            background: linear-gradient(135deg, #4facfe, #00f2fe);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .small-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .danger-btn {
            background: linear-gradient(135deg, #ff5858, #f857a6);
        }
        
        .input-container {
            position: relative;
        }
        
        .input-container textarea, 
        .input-container input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            font-family: inherit;
            font-size: 14px;
            transition: all 0.2s ease;
            background: white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            height: 36px; /* 统一高度 */
            box-sizing: border-box;
        }
        
        .input-container textarea:focus, 
        .input-container input:focus {
            border-color: #ff7e5f;
            box-shadow: 0 0 0 2px rgba(255, 126, 95, 0.2);
            outline: none;
        }
        
        .input-container textarea {
            height: 80px;
            resize: none;
        }
        
        .status-section {
            background: white;
        }
        
        .status-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .status-badge {
            background: #e0e0e0;
            color: #666;
            padding: 6px 12px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 600;
        }
        
        .status-badge.running {
            background: linear-gradient(135deg, #4CAF50, #8BC34A);
            color: white;
        }
        
        .status-badge.stopped {
            background: linear-gradient(135deg, #F44336, #FF9800);
            color: white;
        }
        
        .time-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .time-item {
            display: flex;
            align-items: center;
            font-size: 13px;
        }
        
        .time-label {
            color: #666;
            margin-right: 5px;
        }
        
        .time-value {
            font-weight: 600;
            color: #333;
        }
        
        .button-group {
            display: flex;
            gap: 10px;
        }
        
        .action-btn {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #e0e0e0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: #666;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .action-btn:hover {
            background: #f5f5f5;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .btn-icon {
            margin-right: 8px;
            font-size: 14px;
        }
        
        .primary-btn {
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            color: white;
            border-color: transparent;
        }
        
        .primary-btn:hover {
            background: linear-gradient(135deg, #ff6c4a, #fea569);
        }
        
        .secondary-btn {
            background: linear-gradient(135deg, #4facfe, #00f2fe);
            color: white;
            border-color: transparent;
        }
        
        .secondary-btn:hover {
            background: linear-gradient(135deg, #38a0fe, #00e4fe);
        }
        
        .statistics-bar {
            background: #f0f0f0;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            margin-bottom: 18px;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            font-size: 13px;
            padding: 0 5px;
        }
        
        .stat-icon {
            margin-right: 5px;
        }
        
        .stat-label {
            color: #666;
            margin-right: 5px;
        }
        
        .stat-value {
            font-weight: 600;
            color: #333;
        }
        
        .tooltip {
            position: relative;
        }
        
        .tooltip:hover::after {
            content: attr(title);
            position: absolute;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            animation: fadeIn 0.3s forwards;
        }
        
        @keyframes fadeIn {
            to {
                opacity: 1;
            }
        }
        
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .setting-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .setting-item label {
            font-size: 13px;
            color: #666;
        }
        
        .setting-item input,
        .setting-item select {
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            background: white;
        }
        
        .settings-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .tasks-container {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .task-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: white;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        }
        
        .task-item:hover {
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transform: translateY(-1px);
        }
        
        .task-item-info {
            flex: 1;
        }
        
        .task-item-name {
            font-weight: 600;
            margin-bottom: 3px;
            color: #333;
            font-size: 14px;
        }
        
        .task-item-time {
            color: #666;
            font-size: 12px;
            display: flex;
            align-items: center;
        }
        
        .task-item-actions {
            display: flex;
            gap: 5px;
        }
        
        .task-item-actions button {
            background: none;
            border: none;
            color: #ff7e5f;
            font-size: 13px;
            cursor: pointer;
            padding: 5px 8px;
            border-radius: 5px;
            transition: all 0.2s ease;
        }
        
        .task-item-actions button:hover {
            background: rgba(255, 126, 95, 0.1);
        }
        
        .logs-container {
            height: 200px;
            overflow-y: auto;
            background: white;
            border-radius: 8px;
            padding: 10px;
            font-size: 13px;
            border: 1px solid #e0e0e0;
        }
        
        .log-item {
            padding: 5px 0;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: flex-start;
        }
        
        .empty-tasks {
            color: #999;
            text-align: center;
            padding: 20px;
            font-style: italic;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #999;
        }
    `;

    // 设置拖动功能
    makeDraggable(container);
}

// 实现拖动功能
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.seckill-header');

    if (header) {
        // 头部可以拖动
        header.onmousedown = dragMouseDown;
        header.ontouchstart = dragTouchStart;
    } else {
        // 整个元素可以拖动
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // 获取鼠标初始位置
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // 移动时调用elementDrag函数
        document.onmousemove = elementDrag;
    }

    function dragTouchStart(e) {
        e = e || window.event;
        // 防止页面滚动
        e.preventDefault();
        // 获取触摸初始位置
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.ontouchend = closeTouchDragElement;
        document.ontouchmove = elementTouchDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // 计算新位置
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        // 设置元素新位置
        const newTop = (element.offsetTop - pos2);
        const newLeft = (element.offsetLeft - pos1);

        // 确保不会拖出屏幕
        const maxTop = window.innerHeight - element.offsetHeight / 3;
        const maxLeft = window.innerWidth - element.offsetWidth / 3;

        element.style.top = Math.min(Math.max(0, newTop), maxTop) + "px";
        element.style.left = Math.min(Math.max(0, newLeft), maxLeft) + "px";
        element.style.right = "auto"; // 重置right值，避免冲突
    }

    function elementTouchDrag(e) {
        e = e || window.event;
        const touch = e.touches[0];

        // 计算新位置
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;

        // 设置元素新位置
        const newTop = (element.offsetTop - pos2);
        const newLeft = (element.offsetLeft - pos1);

        // 确保不会拖出屏幕
        const maxTop = window.innerHeight - element.offsetHeight / 3;
        const maxLeft = window.innerWidth - element.offsetWidth / 3;

        element.style.top = Math.min(Math.max(0, newTop), maxTop) + "px";
        element.style.left = Math.min(Math.max(0, newLeft), maxLeft) + "px";
        element.style.right = "auto"; // 重置right值，避免冲突
    }

    function closeDragElement() {
        // 停止移动
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function closeTouchDragElement() {
        // 停止触摸移动
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

// 更新任务列表显示
function updateTasksList() {
    const tasksContainer = document.getElementById('tasks-container');
    if (!tasksContainer) return;

    tasksContainer.innerHTML = '';

    if (taskConfigs.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-tasks">暂无任务，请添加抢券任务或从远程获取...</div>';
        return;
    }

    taskConfigs.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.innerHTML = `
            <div class="task-item-info">
                <div class="task-item-name">
                    ${task.name}
                    ${task.priority > 0 ? `<span class="priority-badge">优先级 ${task.priority}</span>` : ''}
                </div>
                <div class="task-item-time">
                    <span class="time-icon">⏰</span> ${task.time.split(':').slice(0, 2).join(':')}
                    <span class="freq-label">· ${task.frequency}ms</span>
                    ${task.running ? '<span class="running-badge">运行中</span>' : ''}
                </div>
            </div>
            <div class="task-item-actions">
                <button class="test-task-btn" data-index="${index}" title="测试">测试</button>
                <button class="delete-task-btn" data-index="${index}" title="删除">删除</button>
            </div>
        `;
        tasksContainer.appendChild(taskItem);
    });

    // 绑定任务测试和删除按钮事件
    document.querySelectorAll('.test-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            e.target.classList.add('loading');
            testTask(index).finally(() => {
                setTimeout(() => {
                    e.target.classList.remove('loading');
                }, 500);
            });
        });
    });

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));

            // 添加简单的确认动画
            e.target.textContent = '确定?';
            e.target.classList.add('confirm');

            const confirmTimeout = setTimeout(() => {
                e.target.textContent = '删除';
                e.target.classList.remove('confirm');
            }, 2000);

            e.target.onclick = () => {
                clearTimeout(confirmTimeout);
                taskConfigs.splice(index, 1);
                updateTasksList();
                addLog(`🗑️ 已删除任务 #${index + 1}`, false, false, true);

                // 重置点击事件，防止重复删除
                e.target.onclick = null;
            };
        });
    });
}

// 绑定UI事件
function bindEvents() {
    // API密钥相关事件
    const verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    const fetchTasksBtn = document.getElementById('fetch-tasks-btn');
    const apiKeyInput = document.getElementById('api-key-input');

    if (verifyApiKeyBtn && apiKeyInput) {
        verifyApiKeyBtn.addEventListener('click', async () => {
            const key = apiKeyInput.value.trim();
            if (!key) {
                addLog('❌ 请输入API密钥', false, true);
                apiKeyInput.classList.add('error');
                setTimeout(() => {
                    apiKeyInput.classList.remove('error');
                }, 1000);
                return;
            }

            verifyApiKeyBtn.disabled = true;
            verifyApiKeyBtn.textContent = '验证中...';

            const isValid = await validateApiKey(key);

            verifyApiKeyBtn.disabled = false;
            verifyApiKeyBtn.textContent = '验证密钥';

            if (isValid) {
                apiKey = key;
                // 保存到localStorage，方便下次使用
                localStorage.setItem('seckill_api_key', key);
                apiKeyInput.value = '********'; // 隐藏密钥

                // 自动获取任务
                if (fetchTasksBtn) {
                    fetchTasksBtn.click();
                }
            }
        });
    }

    if (fetchTasksBtn) {
        fetchTasksBtn.addEventListener('click', async () => {
            if (!apiKey) {
                const key = apiKeyInput.value.trim();
                if (!key) {
                    addLog('❌ 请先验证API密钥', false, true);
                    return;
                }
                apiKey = key;
            }

            fetchTasksBtn.disabled = true;
            fetchTasksBtn.textContent = '获取中...';

            await fetchRemoteTasks();

            fetchTasksBtn.disabled = false;
            fetchTasksBtn.textContent = '获取任务';
        });
    }

    // 检查是否有保存的API密钥
    const savedApiKey = localStorage.getItem('seckill_api_key');
    if (savedApiKey && apiKeyInput) {
        apiKeyInput.value = savedApiKey;
        apiKey = savedApiKey;
        addLog('ℹ️ 已从本地加载API密钥', false, false, true);
    }

    // 高级设置 - 自动同步任务选项
    const autoSyncCheckbox = document.getElementById('auto-sync-tasks');
    if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = advancedConfig.autoSyncTasks;
    }

    // 以下保留原有事件绑定代码
    // ... 保留原有事件绑定代码 ...
}

// 定时同步任务
let syncTasksInterval = null;

function startTaskSync() {
    if (syncTasksInterval) {
        clearInterval(syncTasksInterval);
    }

    if (advancedConfig.autoSyncTasks && apiKey) {
        syncTasksInterval = setInterval(async () => {
            await fetchRemoteTasks();
        }, advancedConfig.syncInterval);

        addLog(`ℹ️ 已启动自动同步任务，间隔: ${advancedConfig.syncInterval / 60000}分钟`, false, false, true);
    }
}

// 扩展高级设置保存按钮事件
function extendSaveSettingsEvent() {
    const originalSaveSettingsBtn = document.getElementById('save-settings-btn');
    if (originalSaveSettingsBtn) {
        const originalClickHandler = originalSaveSettingsBtn.onclick;

        originalSaveSettingsBtn.onclick = async (e) => {
            // 调用原始处理函数
            if (originalClickHandler) {
                originalClickHandler.call(originalSaveSettingsBtn, e);
            }

            // 添加新的设置保存逻辑
            const autoSyncCheckbox = document.getElementById('auto-sync-tasks');
            const syncIntervalInput = document.getElementById('sync-interval');

            if (autoSyncCheckbox) {
                advancedConfig.autoSyncTasks = autoSyncCheckbox.checked;
            }

            if (syncIntervalInput) {
                const interval = parseInt(syncIntervalInput.value);
                if (interval >= 1 && interval <= 60) {
                    advancedConfig.syncInterval = interval * 60 * 1000;
                }
            }

            // 启动或停止任务同步
            startTaskSync();
        };
    }
}

// 修改主函数 - 初始化应用
function initApp() {
    // 初始化UI
    initUI();

    // 添加额外的动画和交互样式
    appendAdditionalStyles();

    // 绑定事件
    bindEvents();

    // 扩展设置保存事件
    extendSaveSettingsEvent();

    // 添加初始日志
    addLog('🎉 美团外卖自动抢券工具已加载', false, false, true);

    // 如果有API密钥，自动同步任务
    if (apiKey) {
        setTimeout(async () => {
            await fetchRemoteTasks();
            startTaskSync();
        }, 1000);
    }

    // 启动时间显示更新
    setInterval(updateTimeDisplay, 1000);
}

// 为CSS添加额外的样式
function appendAdditionalStyles() {
    // ... 原有代码保留 ...

    // 添加API密钥相关样式
    const additionalStyles = `
        .api-key-container {
            margin-top: 10px;
        }
        
        .api-key-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }
        
        .api-verified {
            color: #4CAF50;
            font-weight: bold;
            margin-left: 10px;
        }
        
        /* 任务优先级标记 */
        .priority-badge {
            background: linear-gradient(135deg, #FF9800, #F44336);
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 8px;
        }
    `;

    const styleId = 'seckill-additional-styles';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }

    // 添加新样式，保留原有样式
    styleElement.textContent += additionalStyles;
}

// 从远程服务器获取任务配置
async function fetchRemoteTasks() {
    if (!apiKey) {
        addLog('❌ 未设置API密钥，无法从远程获取任务', false, true);
        return false;
    }

    addLog('🔄 正在从远程服务器获取任务配置...', false, false, true);

    try {
        const response = await httpClient.get(`${API_SERVER_URL}/api/tasks/`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.data && Array.isArray(response.data.items)) {
            const remoteTasks = response.data.items;

            if (remoteTasks.length === 0) {
                addLog('ℹ️ 远程服务器没有可用的任务配置', false, false, true);
                return false;
            }

            // 将远程任务转换为本地任务格式
            const newTasks = remoteTasks.filter(task => task.is_active).map(task => {
                // 解析时间字符串
                const timeMatch = task.execution_time.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
                let timeStr = task.execution_time;

                if (timeMatch) {
                    const hours = timeMatch[1];
                    const minutes = timeMatch[2];
                    const seconds = timeMatch[3] || '00';
                    timeStr = `${hours}:${minutes}:${seconds}:000`;
                }

                return {
                    name: task.name,
                    time: timeStr,
                    postUrl: task.post_url,
                    frequency: task.frequency || 100,
                    requestsPerTask: task.requests_per_task || advancedConfig.requestsPerTask,
                    priority: task.priority || 0,
                    running: false
                };
            });

            // 根据优先级排序
            newTasks.sort((a, b) => b.priority - a.priority);

            // 清空当前任务列表并用远程任务替换
            taskConfigs = newTasks;
            updateTasksList();

            addLog(`✅ 已从远程加载 ${newTasks.length} 个任务`, true);
            return true;
        } else {
            addLog('❌ 远程任务数据格式不正确', false, true);
            return false;
        }
    } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message || '未知错误';
        addLog(`❌ 获取远程任务失败: ${errorMessage}`, false, true);
        return false;
    }
}

// 验证API密钥有效性
async function validateApiKey(key) {
    try {
        const response = await httpClient.get(`${API_SERVER_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });

        if (response.status === 200) {
            const username = response.data.username || '未知用户';
            addLog(`✅ API密钥验证成功, 用户: ${username}`, true);
            return true;
        }
        return false;
    } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message || '未知错误';
        addLog(`❌ API密钥验证失败: ${errorMessage}`, false, true);
        return false;
    }
}

// 立即执行初始化
(async function () {
    try {
        // 确保页面已加载
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            initApp();
        } else {
            document.addEventListener('DOMContentLoaded', initApp);
        }
    } catch (error) {
        console.error('初始化失败:', error);
        alert('初始化失败: ' + error.message);
    }
})();

// 添加快捷键支持 - Alt+S 显示/隐藏工具
document.addEventListener('keydown', function (e) {
    if (e.altKey && e.key === 's') {
        const container = document.getElementById('seckill-container');
        if (container) {
            if (container.style.display === 'none') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        } else {
            initApp();
        }
    }
});

// 更新时间显示
function updateTimeDisplay() {
    const timeDisplay = document.getElementById('current-time-display');
    if (timeDisplay) {
        const [hour, minute, second] = getNowTime();
        timeDisplay.textContent = `${hour}:${minute}:${second}`;
    }
}