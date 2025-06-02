// 美团外卖自动抢券工具
// 基本配置
const BASE_GET_URL = 'https://promotion.waimai.meituan.com/lottery/limitcouponcomponent/info?couponReferIds=';
// 设置API服务器地址
const API_SERVER_URL = 'http://192.168.31.186:8000';  //  需要https服务
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

// 新增页面秒杀模式相关配置和变量
const SECKILL_URL_PATTERN = 'rights-apigw.meituan.com/api/rights/activity/secKill/info?';
const SECKILL_GRAB_URL_DEFAULT = 'https://rights-apigw.meituan.com/api/rights/activity/secKill/grab?cType=mtiphone&fpPlatform=5&wx_openid=&appVersion=12.35.401&gdBs=0000&pageVersion=1748795021718&yodaReady=h5&csecplatform=4&csecversion=3.2.0';
let isPageSeckillEnabled = false; // 是否启用页面秒杀模式
let pageSecKillTasks = []; // 页面秒杀模式捕获到的任务
let networkRequests = []; // 存储捕获的网络请求

// 用于缓存API密钥验证结果
let lastVerifiedKey = '';
let lastVerifiedTime = 0;
const VERIFICATION_CACHE_TIME = 30 * 60 * 1000; // 30分钟缓存验证结果

// HTTP客户端 - 使用原生fetch替代axios
const httpClient = {
    async get(url, options = {}) {
        const fetchOptions = {
            method: 'GET',
            headers: options.headers || {},
            // 增加跨域相关设置
            mode: 'cors',
            credentials: 'omit' // 不发送cookies，避免某些CORS问题
        };

        try {
            addLog(`📡 发送GET请求: ${url.substring(0, 50)}...`, false, false, true);

            // 添加超时处理
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时')), 15000));

            // 竞争超时和实际请求
            const response = await Promise.race([
                fetch(url, fetchOptions),
                timeoutPromise
            ]);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '无错误详情');
                throw {
                    response: {
                        status: response.status,
                        data: { detail: errorText }
                    },
                    message: `请求失败: ${response.status} ${response.statusText}`
                };
            }

            // 解析JSON响应
            try {
                const data = await response.json();
                return { data, status: response.status };
            } catch (jsonError) {
                throw {
                    message: `无法解析响应数据: ${jsonError.message}`,
                    originalResponse: await response.text().catch(() => '无法获取原始响应')
                };
            }
        } catch (error) {
            // 详细记录错误
            console.error('GET请求详细错误:', error);

            // 更友好的错误信息
            const errorMessage = getDetailedErrorMessage(error);
            addLog(`⚠️ 请求失败详情: ${errorMessage}`, false, true);

            if (!error.response) {
                error.response = { data: { detail: error.message || '网络请求失败' } };
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
            body: JSON.stringify(data),
            // 修改跨域相关设置，允许发送cookie
            mode: 'cors',
            credentials: 'include' // 修改为include以发送cookie
        };

        // 调试输出
        console.log('POST请求配置:', { url, fetchOptions });

        try {
            addLog(`📡 发送POST请求: ${url.substring(0, 50)}...`, false, false, true);

            // 添加超时处理
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时')), 15000));

            // 竞争超时和实际请求
            const response = await Promise.race([
                fetch(url, fetchOptions),
                timeoutPromise
            ]);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '无错误详情');
                throw {
                    response: {
                        status: response.status,
                        data: { detail: errorText }
                    },
                    message: `请求失败: ${response.status} ${response.statusText}`
                };
            }

            // 解析JSON响应
            try {
                const data = await response.json();
                return { data, status: response.status };
            } catch (jsonError) {
                throw {
                    message: `无法解析响应数据: ${jsonError.message}`,
                    originalResponse: await response.text().catch(() => '无法获取原始响应')
                };
            }
        } catch (error) {
            // 详细记录错误
            console.error('POST请求详细错误:', error);

            // 更友好的错误信息
            const errorMessage = getDetailedErrorMessage(error);
            addLog(`⚠️ 请求失败详情: ${errorMessage}`, false, true);

            if (!error.response) {
                error.response = { data: { detail: error.message || '网络请求失败' } };
            }
            throw error;
        }
    }
};

// 辅助函数：获取详细错误信息
function getDetailedErrorMessage(error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        return '网络请求失败，可能是跨域问题或服务器不可达';
    }

    if (error.name === 'AbortError') {
        return '请求被中止';
    }

    if (error.message === '请求超时') {
        return '请求超时，服务器响应时间过长';
    }

    if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
            return 'API密钥无效或权限不足';
        }

        if (error.response.status === 404) {
            return 'API端点不存在';
        }

        if (error.response.status >= 500) {
            return '服务器内部错误，请稍后重试';
        }

        return `HTTP错误 ${error.response.status}: ${error.response.data?.detail || '未知错误'}`;
    }

    return error.message || '未知错误';
}

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

    // 处理不同类型的任务
    if (task.type === 'seckill') {
        // 如果是秒杀任务，调用专用的秒杀启动函数
        startSecKillTask(taskIndex);
        return;
    }

    // 以下是常规抢券任务逻辑
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

    // 根据任务类型选择测试方式
    if (task.type === 'seckill') {
        // 如果是秒杀类型任务，直接调用秒杀测试函数
        return testSecKillTask(taskIndex);
    }

    addLog(`📋 测试详情: 频率${task.frequency}ms, 时间${task.time}`, false, false, true);

    // 1. 从URL提取券ID - 在普通抢券模式下需要此步骤
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

                    // 调试输出完整请求头
                    console.log('完整请求配置:', config);
                    addLog(`🔍 Cookie信息: ${document.cookie.substring(0, 30)}...`, false, false, true);

                    // 发送一次POST请求
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
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 10px;
        width: 320px;
        max-width: 85vw;
        z-index: 99999;
        cursor: move;
        user-select: none;
    `;
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
            
            <!-- 新增：秒杀模式控制区域 -->
            <div class="section">
                <h3><span class="section-icon">🎯</span> 秒杀模式</h3>
                <div class="seckill-mode-container">
                    <div class="seckill-mode-description">
                        监听网络请求，自动发现秒杀活动并创建抢购任务
                    </div>
                    <div class="seckill-mode-actions">
                        <button id="start-capture-btn" class="small-btn primary-btn">开始捕获</button>
                        <button id="stop-capture-btn" class="small-btn danger-btn" disabled>停止捕获</button>
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
            
            <!-- 新增：秒杀任务列表区域 -->
            <div class="section">
                <div class="section-header collapsible" data-target="seckill-tasks-container">
                    <h3><span class="section-icon">🎯</span> 秒杀任务列表</h3>
                    <span class="toggle-icon">▼</span>
                </div>
                <div id="seckill-tasks-container" class="tasks-container collapsible-content"></div>
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

    // 创建悬浮显示按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'seckill-toggle-btn';
    toggleBtn.innerHTML = '🔥';
    toggleBtn.title = '显示/隐藏抢券工具';
    toggleBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 10px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 25px;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        z-index: 99998;
        display: none;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        touch-action: manipulation;
    `;
    document.body.appendChild(toggleBtn);

    // 创建秒杀任务配置弹窗
    const seckillConfigModal = document.createElement('div');
    seckillConfigModal.id = 'seckill-config-modal';
    seckillConfigModal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎯 秒杀任务配置</h3>
                <button class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="seckill-task-info">
                    <div class="task-preview">
                        <div class="task-preview-name">任务名称将在这里显示</div>
                        <div class="task-preview-details">任务详情将在这里显示</div>
                    </div>
                </div>
                
                <div class="config-section">
                    <h4>⏰ 执行时间配置</h4>
                    <div class="flex-row">
                        <div class="flex-col">
                            <label for="seckill-start-time">开始时间:</label>
                            <input type="time" id="seckill-start-time" step="1">
                        </div>
                        <div class="flex-col">
                            <label for="seckill-start-ms">毫秒:</label>
                            <input type="number" id="seckill-start-ms" value="0" min="0" max="999" step="1">
                        </div>
                    </div>
                    <div class="time-adjust-options">
                        <label>
                            <input type="radio" name="time-mode" value="original" checked>
                            使用原始时间
                        </label>
                        <label>
                            <input type="radio" name="time-mode" value="advance">
                            提前开始
                        </label>
                        <label>
                            <input type="radio" name="time-mode" value="custom">
                            自定义时间
                        </label>
                    </div>
                    <div class="advance-time-input" style="display: none;">
                        <label for="advance-milliseconds">提前毫秒数:</label>
                        <input type="number" id="advance-milliseconds" value="500" min="0" max="10000" step="100">
                    </div>
                </div>
                
                <div class="config-section">
                    <h4>⚡ 执行参数配置</h4>
                    <div class="flex-row">
                        <div class="flex-col">
                            <label for="seckill-frequency">请求频率(ms):</label>
                            <input type="number" id="seckill-frequency" value="50" min="10" max="1000" step="10">
                        </div>
                        <div class="flex-col">
                            <label for="seckill-request-count">请求次数:</label>
                            <input type="number" id="seckill-request-count" value="5" min="1" max="50" step="1">
                        </div>
                    </div>
                    <div class="flex-row">
                        <div class="flex-col">
                            <label for="seckill-priority">任务优先级:</label>
                            <select id="seckill-priority">
                                <option value="1">低优先级</option>
                                <option value="3">普通优先级</option>
                                <option value="5" selected>高优先级</option>
                                <option value="10">最高优先级</option>
                            </select>
                        </div>
                        <div class="flex-col">
                            <label for="seckill-auto-start">自动启动:</label>
                            <input type="checkbox" id="seckill-auto-start" checked>
                        </div>
                    </div>
                </div>
                
                <div class="config-section">
                    <h4>📝 任务名称</h4>
                    <div class="input-container">
                        <input type="text" id="seckill-custom-name" placeholder="自定义任务名称(可选)">
                    </div>
                    <div class="name-suggestions">
                        <small>留空将使用默认名称，或点击建议名称：</small>
                        <div class="name-suggestion-buttons"></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="seckill-config-confirm" class="small-btn primary-btn">确认添加</button>
                <button id="seckill-config-cancel" class="small-btn">取消</button>
            </div>
        </div>
    `;

    document.body.appendChild(seckillConfigModal);

    // 添加CSS样式
    const styleId = 'seckill-styles';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        #seckill-container {
            position: fixed;
            top: 20px;
            right: 10px;
            width: 320px;
            max-width: 85vw;
            background: linear-gradient(145deg, #ffffff, #f8f9fa);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 99999;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(255,255,255,0.8);
            max-height: 85vh;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            cursor: move;
            user-select: none;
        }
        
        /* 手机端专用样式 */
        @media (max-width: 768px) {
            #seckill-container {
                width: 300px;
                max-width: 80vw;
                top: 15px;
                right: 8px;
                border-radius: 16px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
            }
            
            .seckill-header {
                padding: 14px 16px;
                cursor: grab;
            }
            
            .seckill-header:active {
                cursor: grabbing;
            }
        }
        
        /* 容器状态变化 */
        #seckill-container.minimized {
            width: 60px;
            height: 60px;
            border-radius: 30px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            right: 10px;
            top: 80px;
        }
        
        #seckill-container.minimized .seckill-header {
            padding: 15px;
            justify-content: center;
        }
        
        #seckill-container.minimized .header-logo h1,
        #seckill-container.minimized .header-buttons {
            display: none;
        }
        
        #seckill-container.minimized .header-icon {
            font-size: 24px;
            margin: 0;
        }
        
        #seckill-container.collapsed {
            height: auto;
        }
        
        #seckill-container.collapsed .seckill-body {
            display: none;
        }
        
        #seckill-container.hidden {
            transform: translateX(calc(100% + 20px));
            opacity: 0;
            pointer-events: none;
        }
        
        /* 悬浮显示按钮 */
        #seckill-toggle-btn {
            position: fixed;
            top: 20px;
            right: 10px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 25px;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            z-index: 99998;
            display: none;
            align-items: center;
            justify-content: center;
        }
        
        .seckill-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: none;
            position: relative;
            overflow: hidden;
        }
        
        .seckill-header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
            0%, 100% { opacity: 0.3; transform: translateX(-100%); }
            50% { opacity: 0.8; transform: translateX(100%); }
        }
        
        .header-logo {
            display: flex;
            align-items: center;
            position: relative;
            z-index: 2;
        }
        
        .header-icon {
            font-size: 22px;
            margin-right: 10px;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .seckill-header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            letter-spacing: -0.5px;
            position: relative;
            z-index: 2;
        }
        
        .header-buttons {
            display: flex;
            gap: 8px;
            position: relative;
            z-index: 2;
        }
        
        /* 更大的触摸按钮 */
        .circle-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 0;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }
        
        .circle-btn:hover, .circle-btn:active {
            background: rgba(255,255,255,0.25);
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        #close-btn:hover, #close-btn:active {
            background: rgba(255, 59, 48, 0.8);
        }
        
        /* 主体内容区域 */
        .seckill-body {
            padding: 16px;
            max-height: calc(90vh - 70px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: rgba(0,0,0,0.2) transparent;
        }
        
        .seckill-body::-webkit-scrollbar {
            width: 4px;
        }
        
        .seckill-body::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .seckill-body::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.2);
            border-radius: 2px;
        }
        
        /* 卡片式区块设计 */
        .section {
            margin-bottom: 16px;
            background: rgba(255,255,255,0.9);
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            border: 1px solid rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .section:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .section-icon {
            margin-right: 8px;
            font-size: 18px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding: 8px 0;
            margin: 0;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .section-header:hover {
            background: rgba(102, 126, 234, 0.05);
            padding: 8px 12px;
        }
        
        .toggle-icon {
            font-size: 14px;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: #667eea;
        }
        
        .section-header.active .toggle-icon {
            transform: rotate(180deg);
        }
        
        .collapsible-content {
            overflow: hidden;
            max-height: 1000px;
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .collapsible-content.collapsed {
            max-height: 0;
        }
        
        h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            color: #2d3748;
            display: flex;
            align-items: center;
        }
        
        /* 响应式布局 */
        .flex-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .flex-col {
            flex: 1;
            min-width: 0;
        }
        
        @media (max-width: 480px) {
            .flex-row {
                flex-direction: column;
                gap: 12px;
            }
        }
        
        /* 现代化时间选择按钮 */
        .time-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .time-btn {
            padding: 16px 12px;
            border: 2px solid transparent;
            background: linear-gradient(white, white) padding-box,
                        linear-gradient(135deg, #667eea, #764ba2) border-box;
            border-radius: 12px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            color: #4a5568;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            text-align: center;
        }
        
        .time-btn:hover, .time-btn:active {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
        }
        
        .time-btn.selected {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-color: transparent;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
            transform: translateY(-2px);
        }
        
        /* 优化输入框样式 */
        .custom-time-input {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
            padding: 16px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.1);
        }
        
        .custom-time-input label {
            font-size: 14px;
            font-weight: 500;
            color: #4a5568;
        }
        
        .custom-time-input input {
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .custom-time-input input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            outline: none;
        }
        
        /* 现代化按钮样式 */
        .small-btn {
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            text-align: center;
            min-height: 44px;
        }
        
        .small-btn:hover, .small-btn:active {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .small-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .danger-btn {
            background: linear-gradient(135deg, #f56565, #e53e3e);
            box-shadow: 0 4px 12px rgba(245, 101, 101, 0.3);
        }
        
        .danger-btn:hover, .danger-btn:active {
            box-shadow: 0 6px 20px rgba(245, 101, 101, 0.4);
        }
        
        .secondary-btn {
            background: linear-gradient(135deg, #4299e1, #3182ce);
            box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
        }
        
        .secondary-btn:hover, .secondary-btn:active {
            box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
        }
        
        /* 输入框组件 */
        .input-container {
            position: relative;
            margin-bottom: 12px;
        }
        
        .input-container textarea, 
        .input-container input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-family: inherit;
            font-size: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255,255,255,0.9);
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
            box-sizing: border-box;
            -webkit-appearance: none;
            min-height: 52px;
        }
        
        .input-container textarea:focus, 
        .input-container input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            outline: none;
            background: white;
        }
        
        .input-container textarea {
            height: 100px;
            resize: vertical;
            min-height: 100px;
        }
        
        /* 状态区域 */
        .status-section {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            border: 2px solid rgba(102, 126, 234, 0.2);
        }
        
        .status-info {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 20px;
        }
        
        .status-badge {
            background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
            color: #4a5568;
            padding: 12px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .status-badge.running {
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            animation: pulse-success 2s ease-in-out infinite;
        }
        
        @keyframes pulse-success {
            0%, 100% { box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3); }
            50% { box-shadow: 0 4px 16px rgba(72, 187, 120, 0.5); }
        }
        
        .status-badge.stopped {
            background: linear-gradient(135deg, #f56565, #e53e3e);
            color: white;
        }
        
        .time-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .time-item {
            background: rgba(255,255,255,0.8);
            padding: 12px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        
        .time-label {
            display: block;
            color: #718096;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .time-value {
            display: block;
            font-weight: 700;
            font-size: 16px;
            color: #2d3748;
        }
        
        /* 操作按钮组 */
        .button-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
        }
        
        .action-btn {
            padding: 16px 20px;
            border: 2px solid #e2e8f0;
            background: rgba(255,255,255,0.9);
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: #4a5568;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            min-height: 52px;
        }
        
        .action-btn:hover, .action-btn:active {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
            border-color: #667eea;
        }
        
        .btn-icon {
            margin-right: 8px;
            font-size: 16px;
        }
        
        .primary-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-color: transparent;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .primary-btn:hover, .primary-btn:active {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        /* 统计栏 */
        .statistics-bar {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            border-radius: 16px;
            padding: 16px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
            border: 1px solid rgba(102, 126, 234, 0.2);
        }
        
        .stat-item {
            background: rgba(255,255,255,0.8);
            padding: 12px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .stat-icon {
            display: block;
            font-size: 20px;
            margin-bottom: 4px;
        }
        
        .stat-label {
            display: block;
            color: #718096;
            font-size: 11px;
            font-weight: 500;
            margin-bottom: 2px;
        }
        
        .stat-value {
            display: block;
            font-weight: 700;
            font-size: 18px;
            color: #2d3748;
        }
        
        /* 设置网格 */
        .settings-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .setting-item {
            background: rgba(255,255,255,0.7);
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        
        .setting-item label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #4a5568;
            margin-bottom: 8px;
        }
        
        .setting-item input,
        .setting-item select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 16px;
            background: white;
            transition: all 0.3s ease;
            min-height: 44px;
        }
        
        .setting-item input:focus,
        .setting-item select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            outline: none;
        }
        
        .setting-item input[type="checkbox"] {
            width: 20px;
            height: 20px;
            margin: 12px 0;
            accent-color: #667eea;
        }
        
        .settings-actions {
            display: flex;
            gap: 12px;
        }
        
        /* 任务容器 */
        .tasks-container {
            max-height: 300px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        .task-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: rgba(255,255,255,0.9);
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(0,0,0,0.06);
        }
        
        .task-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        
        .task-item-info {
            flex: 1;
            min-width: 0;
        }
        
        .task-item-name {
            font-weight: 600;
            margin-bottom: 6px;
            color: #2d3748;
            font-size: 15px;
            line-height: 1.3;
        }
        
        .task-item-time {
            color: #718096;
            font-size: 13px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .task-item-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }
        
        .task-item-actions button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            transition: all 0.3s ease;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            min-height: 36px;
        }
        
        .task-item-actions button:hover, .task-item-actions button:active {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        /* 日志容器 */
        .logs-container {
            height: 200px;
            overflow-y: auto;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 12px;
            padding: 12px;
            font-size: 13px;
            border: 1px solid #e2e8f0;
            -webkit-overflow-scrolling: touch;
        }
        
        .log-item {
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: flex-start;
            line-height: 1.4;
        }
        
        .log-time {
            color: #94a3b8;
            font-size: 11px;
            margin-right: 8px;
            flex-shrink: 0;
        }
        
        .log-emoji {
            margin-right: 6px;
        }
        
        .log-success {
            color: #059669;
        }
        
        .log-error {
            color: #dc2626;
        }
        
        .log-info {
            color: #2563eb;
        }
        
        .empty-tasks {
            color: #94a3b8;
            text-align: center;
            padding: 32px 16px;
            font-style: italic;
            background: rgba(248, 250, 252, 0.5);
            border-radius: 12px;
            border: 2px dashed #e2e8f0;
        }
        
        /* API密钥相关样式 */
        .api-key-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .api-key-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .api-server-setting {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        
        .api-server-actions {
            margin-top: 12px;
        }
        
        /* 秒杀模式样式 */
        .seckill-mode-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .seckill-mode-description {
            font-size: 14px;
            color: #64748b;
            line-height: 1.5;
            padding: 12px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .seckill-mode-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        /* 优先级和状态标签 */
        .priority-badge {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 8px;
            margin-left: 8px;
            font-weight: 500;
        }
        
        .countdown {
            background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 11px;
            color: #4a5568;
            font-weight: 500;
        }
        
        .status-active {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .stock-info {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
        }
        
        .running-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 8px;
            margin-left: 8px;
            font-weight: 500;
            animation: pulse-running 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse-running {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .seckill-task-item {
            border-left: 4px solid #667eea;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
        }
        
        /* 工具提示 */
        .tooltip {
            position: relative;
        }
        
        .tooltip:hover::after {
            content: attr(title);
            position: absolute;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            animation: tooltipFadeIn 0.3s forwards;
            z-index: 1000;
        }
        
        @keyframes tooltipFadeIn {
            to {
                opacity: 1;
            }
        }
        
        /* 滚动条样式 */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.05);
            border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.3);
            border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(102, 126, 234, 0.5);
        }
        
        /* 加载动画 */
        .loading {
            opacity: 0.7;
            pointer-events: none;
            position: relative;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            border: 2px solid rgba(102, 126, 234, 0.2);
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        /* 手机端特殊优化 */
        @media (max-width: 480px) {
            .seckill-header {
                padding: 14px 16px;
            }
            
            .seckill-header h1 {
                font-size: 16px;
            }
            
            .circle-btn {
                width: 32px;
                height: 32px;
                font-size: 14px;
            }
            
            .seckill-body {
                padding: 12px;
            }
            
            .section {
                padding: 12px;
                margin-bottom: 12px;
                border-radius: 12px;
            }
            
            .time-buttons {
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .time-btn {
                padding: 14px 10px;
                font-size: 14px;
            }
            
            .button-group {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            
            .statistics-bar {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            
            .stat-item {
                padding: 8px;
            }
            
            .task-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
            }
            
            .task-item-actions {
                width: 100%;
                justify-content: space-between;
            }
        }
        
        /* 深色模式支持 */
        @media (prefers-color-scheme: dark) {
            #seckill-container {
                background: linear-gradient(145deg, #1a202c, #2d3748);
                border-color: rgba(255,255,255,0.1);
            }
            
            .section {
                background: rgba(45, 55, 72, 0.8);
                border-color: rgba(255,255,255,0.1);
                color: #e2e8f0;
            }
            
            .input-container textarea, 
            .input-container input {
                background: rgba(45, 55, 72, 0.8);
                border-color: rgba(255,255,255,0.2);
                color: #e2e8f0;
            }
            
            .logs-container {
                background: rgba(26, 32, 44, 0.8);
                border-color: rgba(255,255,255,0.1);
                color: #e2e8f0;
            }
        }
    `;

    // 设置拖动功能
    makeDraggable(container);

    // 在API密钥输入区域后添加API服务器地址设置
    const apiKeySection = document.querySelector('.section:nth-child(1)');
    if (apiKeySection) {
        const apiServerSettingDiv = document.createElement('div');
        apiServerSettingDiv.className = 'api-server-setting';
        apiServerSettingDiv.innerHTML = `
            <div class="input-container">
                <input type="text" id="api-server-input" placeholder="API服务器地址" value="${API_SERVER_URL}">
            </div>
            <div class="api-server-actions">
                <button id="save-api-server-btn" class="small-btn">保存服务器地址</button>
            </div>
        `;
        apiKeySection.appendChild(apiServerSettingDiv);
    }

    // 添加隐藏/显示功能
    function toggleContainerVisibility() {
        const isHidden = container.style.display === 'none';
        if (isHidden) {
            container.style.display = 'block';
            container.style.transform = 'translateX(0)';
            toggleBtn.style.display = 'none';
            addLog('🔥 抢券工具已显示', false, false, true);
        } else {
            container.style.transform = 'translateX(calc(100% + 20px))';
            setTimeout(() => {
                container.style.display = 'none';
                toggleBtn.style.display = 'flex';
            }, 300);
            addLog('🔽 抢券工具已隐藏', false, false, true);
        }
    }

    // 绑定悬浮按钮事件
    toggleBtn.addEventListener('click', toggleContainerVisibility);

    // 双击容器标题栏隐藏
    const header = container.querySelector('.seckill-header');
    if (header) {
        let clickCount = 0;
        let touchStartTime = 0;
        let longPressTimer = null;

        // 鼠标双击事件
        header.addEventListener('click', () => {
            clickCount++;
            setTimeout(() => {
                if (clickCount === 2) {
                    toggleContainerVisibility();
                }
                clickCount = 0;
            }, 300);
        });

        // 触摸长按事件
        header.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            longPressTimer = setTimeout(() => {
                // 长按1秒触发隐藏
                if (Date.now() - touchStartTime >= 1000) {
                    navigator.vibrate && navigator.vibrate(100); // 震动反馈
                    toggleContainerVisibility();
                }
            }, 1000);
        });

        header.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        header.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });
    }
}

// 实现拖动功能
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
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
        isDragging = true;
        // 获取鼠标初始位置
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // 移动时调用elementDrag函数
        document.onmousemove = elementDrag;
        // 添加拖动样式
        element.style.transition = 'none';
        element.style.cursor = 'grabbing';
    }

    function dragTouchStart(e) {
        e = e || window.event;
        // 防止页面滚动
        e.preventDefault();
        isDragging = true;
        // 获取触摸初始位置
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.ontouchend = closeTouchDragElement;
        document.ontouchmove = elementTouchDrag;
        // 添加拖动样式
        element.style.transition = 'none';
        element.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
        if (!isDragging) return;
        e = e || window.event;
        e.preventDefault();
        // 计算新位置
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        updatePosition();
    }

    function elementTouchDrag(e) {
        if (!isDragging) return;
        e = e || window.event;
        const touch = e.touches[0];

        // 计算新位置
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;

        updatePosition();
    }

    function updatePosition() {
        // 设置元素新位置
        const newTop = (element.offsetTop - pos2);
        const newLeft = (element.offsetLeft - pos1);

        // 确保不会拖出屏幕（留出边距）
        const margin = 20;
        const maxTop = window.innerHeight - element.offsetHeight - margin;
        const maxLeft = window.innerWidth - element.offsetWidth - margin;
        const minTop = margin;
        const minLeft = margin;

        const clampedTop = Math.min(Math.max(minTop, newTop), maxTop);
        const clampedLeft = Math.min(Math.max(minLeft, newLeft), maxLeft);

        element.style.top = clampedTop + "px";
        element.style.left = clampedLeft + "px";
        element.style.right = "auto"; // 重置right值，避免冲突
    }

    function closeDragElement() {
        // 停止移动
        isDragging = false;
        document.onmouseup = null;
        document.onmousemove = null;
        // 恢复样式
        element.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.cursor = 'move';
    }

    function closeTouchDragElement() {
        // 停止触摸移动
        isDragging = false;
        document.ontouchend = null;
        document.ontouchmove = null;
        // 恢复样式
        element.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.cursor = 'move';
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
        // 如果是秒杀任务，添加特殊样式
        if (task.type === 'seckill') {
            taskItem.classList.add('seckill-task-item');
        }

        // 准备任务类型标识
        const typeLabel = task.type === 'seckill' ?
            '<span class="priority-badge">秒杀模式</span>' :
            (task.priority > 0 ? `<span class="priority-badge">优先级 ${task.priority}</span>` : '');

        taskItem.innerHTML = `
            <div class="task-item-info">
                <div class="task-item-name">
                    ${task.name}
                    ${typeLabel}
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

    // 时间选择按钮事件
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 移除其他按钮的选中状态
            timeButtons.forEach(b => b.classList.remove('selected'));
            // 添加当前按钮的选中状态
            e.target.classList.add('selected');

            const timeStr = e.target.getAttribute('data-time');
            updateTargetTimeDisplay(timeStr);
            addLog(`⏰ 已选择时间: ${timeStr.split(':').slice(0, 2).join(':')}`, false, false, true);
        });
    });

    // 自定义时间设置
    const setCustomTimeBtn = document.getElementById('set-custom-time-btn');
    const customTimeInput = document.getElementById('custom-time');
    const customTimeMsInput = document.getElementById('custom-time-ms');

    if (setCustomTimeBtn && customTimeInput) {
        setCustomTimeBtn.addEventListener('click', () => {
            const timeValue = customTimeInput.value;
            const msValue = customTimeMsInput.value || '000';

            if (!timeValue) {
                addLog('❌ 请选择自定义时间', false, true);
                return;
            }

            // 移除其他按钮的选中状态
            timeButtons.forEach(b => b.classList.remove('selected'));

            const timeStr = `${timeValue}:${msValue.padStart(3, '0')}`;
            updateTargetTimeDisplay(timeStr);
            addLog(`⏰ 已设置自定义时间: ${timeValue}`, false, false, true);
        });
    }

    // 添加任务按钮
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const postUrlInput = document.getElementById('post-url-input');
            const taskNameInput = document.getElementById('task-name-input');
            const frequencyInput = document.getElementById('frequency-input');
            const requestsCountInput = document.getElementById('requests-count-input');
            const targetTimeDisplay = document.getElementById('target-time-display');

            // 验证输入
            if (!postUrlInput.value.trim()) {
                addLog('❌ 请输入POST URL', false, true);
                postUrlInput.focus();
                return;
            }

            if (!taskNameInput.value.trim()) {
                addLog('❌ 请输入任务名称', false, true);
                taskNameInput.focus();
                return;
            }

            if (targetTimeDisplay.textContent === '未设置') {
                addLog('❌ 请先选择目标时间', false, true);
                return;
            }

            // 创建新任务
            const newTask = {
                name: taskNameInput.value.trim(),
                time: targetTimeDisplay.textContent,
                postUrl: postUrlInput.value.trim(),
                frequency: parseInt(frequencyInput.value) || 100,
                requestsPerTask: parseInt(requestsCountInput.value) || 3,
                priority: 0,
                running: false
            };

            taskConfigs.push(newTask);
            updateTasksList();

            // 清空输入
            postUrlInput.value = '';
            taskNameInput.value = '';

            addLog(`✅ 已添加任务: ${newTask.name}`, true);
        });
    }

    // 启动抢券按钮
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (taskConfigs.length === 0) {
                addLog('❌ 没有可执行的任务', false, true);
                return;
            }

            currentStatus = '运行中';
            updateStatusDisplay();

            // 启动所有任务的定时器
            taskConfigs.forEach((task, index) => {
                if (!task.running) {
                    const timeToStart = calculateNextRunTime(task.time);

                    if (timeToStart <= 0) {
                        // 立即启动
                        addLog(`🚀 立即启动任务: ${task.name}`, false, false, true);
                        start(index);
                    } else {
                        // 定时启动
                        const startTime = new Date(Date.now() + timeToStart);
                        addLog(`⏰ 任务 "${task.name}" 将在 ${startTime.toTimeString().slice(0, 8)} 启动`, false, false, true);

                        setTimeout(() => {
                            if (!task.running) {
                                addLog(`🚀 定时启动任务: ${task.name}`, false, false, true);
                                start(index);
                            }
                        }, timeToStart);
                    }
                }
            });

            addLog('🎯 所有任务已安排启动', true);
        });
    }

    // 测试配置按钮
    const testBtn = document.getElementById('test-btn');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            if (taskConfigs.length === 0) {
                addLog('❌ 没有可测试的任务', false, true);
                return;
            }

            testBtn.disabled = true;
            testBtn.textContent = '测试中...';

            try {
                // 测试最后一个任务（最新添加的）
                const lastTaskIndex = taskConfigs.length - 1;
                await testTask(lastTaskIndex);
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = '✓ 测试配置';
            }
        });
    }

    // 头部按钮事件
    const minimizeBtn = document.getElementById('minimize-btn');
    const collapseBtn = document.getElementById('collapse-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            const container = document.getElementById('seckill-container');
            container.classList.toggle('minimized');
        });
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            const container = document.getElementById('seckill-container');
            container.classList.toggle('collapsed');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const container = document.getElementById('seckill-container');
            container.style.display = 'none';
        });
    }

    // 折叠区域事件
    const collapsibleHeaders = document.querySelectorAll('.collapsible');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const target = header.getAttribute('data-target');
            const content = document.getElementById(target);

            if (content) {
                content.classList.toggle('collapsed');
                header.classList.toggle('active');
            }
        });
    });

    // 高级设置 - 自动同步任务选项
    const autoSyncCheckbox = document.getElementById('auto-sync-tasks');
    if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = advancedConfig.autoSyncTasks;
    }

    // 高级设置保存按钮
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            // 保存高级配置
            const preStartTimeInput = document.getElementById('pre-start-time');
            const logDirectionSelect = document.getElementById('log-direction');
            const displayModeSelect = document.getElementById('display-mode');
            const autoSyncCheckbox = document.getElementById('auto-sync-tasks');
            const syncIntervalInput = document.getElementById('sync-interval');

            if (preStartTimeInput) {
                advancedConfig.preStartMilliseconds = parseInt(preStartTimeInput.value) || 500;
            }

            if (logDirectionSelect) {
                advancedConfig.logDirection = logDirectionSelect.value;
            }

            if (displayModeSelect) {
                const container = document.getElementById('seckill-container');
                container.className = container.className.replace(/\s*(compact|mini)-mode/g, '');
                if (displayModeSelect.value !== 'normal') {
                    container.classList.add(displayModeSelect.value + '-mode');
                }
            }

            if (autoSyncCheckbox) {
                advancedConfig.autoSyncTasks = autoSyncCheckbox.checked;
            }

            if (syncIntervalInput) {
                const interval = parseInt(syncIntervalInput.value);
                if (interval >= 1 && interval <= 60) {
                    advancedConfig.syncInterval = interval * 60 * 1000;
                }
            }

            // 保存到本地存储
            localStorage.setItem('seckill_advanced_config', JSON.stringify(advancedConfig));

            // 启动或停止任务同步
            startTaskSync();

            addLog('✅ 高级设置已保存', true);
        });
    }

    // 重置设置按钮
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            // 重置为默认配置
            advancedConfig = {
                requestsPerTask: 3,
                preStartMilliseconds: 500,
                logDirection: 'bottom',
                autoSyncTasks: false,
                syncInterval: 5 * 60 * 1000,
            };

            // 更新界面
            const preStartTimeInput = document.getElementById('pre-start-time');
            const logDirectionSelect = document.getElementById('log-direction');
            const displayModeSelect = document.getElementById('display-mode');
            const autoSyncCheckbox = document.getElementById('auto-sync-tasks');
            const syncIntervalInput = document.getElementById('sync-interval');

            if (preStartTimeInput) preStartTimeInput.value = '500';
            if (logDirectionSelect) logDirectionSelect.value = 'bottom';
            if (displayModeSelect) displayModeSelect.value = 'normal';
            if (autoSyncCheckbox) autoSyncCheckbox.checked = false;
            if (syncIntervalInput) syncIntervalInput.value = '5';

            // 清除本地存储
            localStorage.removeItem('seckill_advanced_config');

            addLog('✅ 设置已重置为默认值', true);
        });
    }

    // API服务器地址保存按钮
    const saveApiServerBtn = document.getElementById('save-api-server-btn');
    const apiServerInput = document.getElementById('api-server-input');

    if (saveApiServerBtn && apiServerInput) {
        // 从本地存储加载之前保存的服务器地址
        const savedApiServer = localStorage.getItem('seckill_api_server');
        if (savedApiServer) {
            API_SERVER_URL = savedApiServer;
            apiServerInput.value = savedApiServer;
            addLog(`ℹ️ 已从本地加载API服务器地址: ${savedApiServer}`, false, false, true);
        }

        saveApiServerBtn.addEventListener('click', () => {
            const newApiServer = apiServerInput.value.trim();
            if (!newApiServer) {
                addLog('❌ API服务器地址不能为空', false, true);
                return;
            }

            // 验证URL格式
            try {
                new URL(newApiServer);
            } catch (e) {
                addLog('❌ 无效的URL格式', false, true);
                return;
            }

            API_SERVER_URL = newApiServer;
            localStorage.setItem('seckill_api_server', newApiServer);
            addLog(`✅ API服务器地址已保存: ${newApiServer}`, true);

            // 重置验证缓存，因为服务器变了
            lastVerifiedKey = '';
            lastVerifiedTime = 0;
        });
    }

    // 新增：秒杀模式相关事件
    const startCaptureBtn = document.getElementById('start-capture-btn');
    const stopCaptureBtn = document.getElementById('stop-capture-btn');

    if (startCaptureBtn && stopCaptureBtn) {
        startCaptureBtn.addEventListener('click', () => {
            startNetworkCapture();
            startCaptureBtn.disabled = true;
            stopCaptureBtn.disabled = false;
            addLog('🎯 已开启秒杀模式网络捕获', true);
        });

        stopCaptureBtn.addEventListener('click', () => {
            stopNetworkCapture();
            startCaptureBtn.disabled = false;
            stopCaptureBtn.disabled = true;
            addLog('🛑 已停止秒杀模式网络捕获', false, false, true);
        });
    }

    // 加载保存的高级配置
    loadAdvancedConfig();
}

// 新增：加载高级配置
function loadAdvancedConfig() {
    const savedConfig = localStorage.getItem('seckill_advanced_config');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            Object.assign(advancedConfig, config);

            // 更新界面
            const preStartTimeInput = document.getElementById('pre-start-time');
            const logDirectionSelect = document.getElementById('log-direction');
            const autoSyncCheckbox = document.getElementById('auto-sync-tasks');
            const syncIntervalInput = document.getElementById('sync-interval');

            if (preStartTimeInput) preStartTimeInput.value = advancedConfig.preStartMilliseconds;
            if (logDirectionSelect) logDirectionSelect.value = advancedConfig.logDirection;
            if (autoSyncCheckbox) autoSyncCheckbox.checked = advancedConfig.autoSyncTasks;
            if (syncIntervalInput) syncIntervalInput.value = advancedConfig.syncInterval / 60000;

            addLog('ℹ️ 已加载保存的高级配置', false, false, true);
        } catch (e) {
            console.error('加载高级配置失败:', e);
        }
    }
}

// 新增：更新目标时间显示
function updateTargetTimeDisplay(timeStr) {
    const targetTimeDisplay = document.getElementById('target-time-display');
    if (targetTimeDisplay) {
        const displayTime = timeStr.split(':').slice(0, 2).join(':');
        targetTimeDisplay.textContent = displayTime;
    }
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

    // 启动秒杀任务倒计时
    startSecKillCountdown();
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

        /* 秒杀模式相关样式 */
        .seckill-mode-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .seckill-mode-description {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
            margin-bottom: 5px;
        }

        .seckill-mode-actions {
            display: flex;
            justify-content: flex-start;
            gap: 10px;
        }

        .seckill-task-item {
            border-left: 3px solid #ff7e5f;
        }

        .countdown {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 10px;
            margin: 0 5px;
            font-size: 11px;
            color: #333;
        }

        .status-active {
            background: #4CAF50;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
        }
        
        .stock-info {
            font-size: 11px;
            color: #666;
            margin-left: 5px;
        }
        
        .running-badge {
            background: #4CAF50;
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 8px;
        }

        /* 秒杀任务配置弹窗样式 */
        #seckill-config-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
            display: none;
        }

        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow: hidden;
            font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }

        .modal-header {
            background: linear-gradient(135deg, #ff7e5f, #feb47b);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .modal-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s ease;
        }

        .modal-close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
            padding: 20px;
            max-height: calc(90vh - 140px);
            overflow-y: auto;
        }

        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .config-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }

        .config-section h4 {
            margin: 0 0 15px 0;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            display: flex;
            align-items: center;
        }

        .task-preview {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }

        .task-preview-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .task-preview-details {
            font-size: 13px;
            opacity: 0.9;
        }

        .time-adjust-options {
            display: flex;
            gap: 15px;
            margin: 10px 0;
        }

        .time-adjust-options label {
            display: flex;
            align-items: center;
            font-size: 14px;
            cursor: pointer;
        }

        .time-adjust-options input[type="radio"] {
            margin-right: 5px;
        }

        .advance-time-input {
            margin-top: 10px;
            padding: 10px;
            background: rgba(255, 126, 95, 0.1);
            border-radius: 6px;
        }

        .advance-time-input label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            color: #666;
        }

        .advance-time-input input {
            width: 100%;
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
        }

        .config-section .flex-row {
            gap: 10px;
            margin-bottom: 10px;
        }

        .config-section .flex-col label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            color: #666;
            font-weight: 500;
        }

        .config-section .flex-col input,
        .config-section .flex-col select {
            width: 100%;
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            background: white;
        }

        .config-section .flex-col input[type="checkbox"] {
            width: auto;
            margin: 5px 0;
        }

        .name-suggestions {
            margin-top: 10px;
        }

        .name-suggestions small {
            color: #666;
            font-size: 12px;
        }

        .name-suggestion-buttons {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }

        .name-suggestion-btn {
            padding: 4px 8px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .name-suggestion-btn:hover {
            background: #e0e0e0;
            border-color: #ccc;
        }

        /* 移动端弹窗适配 */
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                max-height: 95vh;
            }

            .modal-body {
                padding: 15px;
                max-height: calc(95vh - 120px);
            }

            .config-section .flex-row {
                flex-direction: column;
                gap: 10px;
            }

            .time-adjust-options {
                flex-direction: column;
                gap: 8px;
            }
        }

        /* 加载状态样式 */
        .loading {
            opacity: 0.6;
            pointer-events: none;
            position: relative;
        }

        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #ff7e5f;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* 配置任务按钮样式 */
        .config-seckill-task-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .config-seckill-task-btn:hover {
            background: linear-gradient(135deg, #5a6fd8, #6a3093);
            transform: translateY(-1px);
        }

        /* 秒杀任务配置弹窗样式 - 手机端优化 */
        #seckill-config-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
            display: none;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }

        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, #ffffff, #f8f9fa);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 94%;
            max-width: 480px;
            max-height: 90vh;
            overflow: hidden;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            overflow: hidden;
        }

        .modal-header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 4s ease-in-out infinite;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            position: relative;
            z-index: 2;
        }

        .modal-close-btn {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            z-index: 2;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }

        .modal-close-btn:hover, .modal-close-btn:active {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .modal-body {
            padding: 24px;
            max-height: calc(90vh - 160px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
        }

        .modal-body::-webkit-scrollbar {
            width: 4px;
        }

        .modal-body::-webkit-scrollbar-track {
            background: transparent;
        }

        .modal-body::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.3);
            border-radius: 2px;
        }

        .modal-footer {
            padding: 20px 24px;
            border-top: 1px solid rgba(102, 126, 234, 0.1);
            background: rgba(248, 250, 252, 0.8);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .config-section {
            margin-bottom: 24px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 16px;
            border: 1px solid rgba(102, 126, 234, 0.1);
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            backdrop-filter: blur(10px);
        }

        .config-section h4 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: #2d3748;
            display: flex;
            align-items: center;
            padding-bottom: 8px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.1);
        }

        .task-preview {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 16px;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
        }

        .task-preview::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
            animation: shimmer 3s ease-in-out infinite reverse;
        }

        .task-preview-name {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
            position: relative;
            z-index: 2;
        }

        .task-preview-details {
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.5;
            position: relative;
            z-index: 2;
        }

        .time-adjust-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 16px 0;
            padding: 16px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .time-adjust-options label {
            display: flex;
            align-items: center;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 10px;
            transition: all 0.3s ease;
            border: 2px solid transparent;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }

        .time-adjust-options label:hover {
            background: rgba(255, 255, 255, 1);
            border-color: rgba(102, 126, 234, 0.3);
            transform: translateY(-1px);
        }

        .time-adjust-options input[type="radio"] {
            margin-right: 12px;
            width: 18px;
            height: 18px;
            accent-color: #667eea;
        }

        .time-adjust-options input[type="radio"]:checked + span {
            color: #667eea;
            font-weight: 600;
        }

        .advance-time-input {
            margin-top: 16px;
            padding: 16px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            border-radius: 12px;
            border: 2px solid rgba(102, 126, 234, 0.2);
        }

        .advance-time-input label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #4a5568;
        }

        .advance-time-input input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 16px;
            background: white;
            transition: all 0.3s ease;
            min-height: 48px;
        }

        .advance-time-input input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            outline: none;
        }

        .config-section .flex-row {
            gap: 16px;
            margin-bottom: 16px;
        }

        .config-section .flex-col {
            flex: 1;
        }

        .config-section .flex-col label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #4a5568;
        }

        .config-section .flex-col input,
        .config-section .flex-col select {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 16px;
            background: white;
            transition: all 0.3s ease;
            min-height: 48px;
            -webkit-appearance: none;
        }

        .config-section .flex-col input:focus,
        .config-section .flex-col select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            outline: none;
        }

        .config-section .flex-col input[type="checkbox"] {
            width: 20px;
            height: 20px;
            margin: 14px 0;
            accent-color: #667eea;
            min-height: auto;
        }

        .name-suggestions {
            margin-top: 16px;
            padding: 16px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }

        .name-suggestions small {
            color: #64748b;
            font-size: 13px;
            font-weight: 500;
            display: block;
            margin-bottom: 12px;
        }

        .name-suggestion-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .name-suggestion-btn {
            padding: 8px 16px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            border: 2px solid rgba(102, 126, 234, 0.2);
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: #4a5568;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }

        .name-suggestion-btn:hover, .name-suggestion-btn:active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-color: transparent;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        /* 配置任务按钮样式 */
        .config-seckill-task-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            min-height: 36px;
        }

        .config-seckill-task-btn:hover, .config-seckill-task-btn:active {
            background: linear-gradient(135deg, #5a6fd8, #6a3093);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        /* 手机端弹窗特殊适配 */
        @media (max-width: 768px) {
            .modal-content {
                width: 96%;
                max-height: 92vh;
                border-radius: 16px;
            }

            .modal-header {
                padding: 16px 20px;
            }

            .modal-header h3 {
                font-size: 16px;
            }

            .modal-close-btn {
                width: 32px;
                height: 32px;
                font-size: 18px;
            }

            .modal-body {
                padding: 20px;
                max-height: calc(92vh - 140px);
            }

            .modal-footer {
                padding: 16px 20px;
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .config-section {
                padding: 16px;
                margin-bottom: 20px;
            }

            .config-section h4 {
                font-size: 15px;
                margin-bottom: 12px;
            }

            .config-section .flex-row {
                flex-direction: column;
                gap: 12px;
            }

            .time-adjust-options {
                gap: 8px;
                padding: 12px;
            }

            .time-adjust-options label {
                padding: 10px 12px;
                font-size: 14px;
            }

            .task-preview {
                padding: 16px;
            }

            .task-preview-name {
                font-size: 16px;
            }

            .task-preview-details {
                font-size: 13px;
            }
        }

        @media (max-width: 480px) {
            .modal-content {
                width: 98%;
                border-radius: 12px;
            }

            .modal-header {
                padding: 14px 16px;
            }

            .modal-body {
                padding: 16px;
            }

            .modal-footer {
                padding: 14px 16px;
            }

            .config-section {
                padding: 12px;
                border-radius: 12px;
            }

            .name-suggestion-buttons {
                flex-direction: column;
            }

            .name-suggestion-btn {
                text-align: center;
                padding: 12px;
            }
        }

        /* 深色模式适配 */
        @media (prefers-color-scheme: dark) {
            .modal-content {
                background: linear-gradient(145deg, #1a202c, #2d3748);
                border-color: rgba(255,255,255,0.1);
            }

            .config-section {
                background: rgba(45, 55, 72, 0.8);
                border-color: rgba(255,255,255,0.1);
                color: #e2e8f0;
            }

            .config-section .flex-col input,
            .config-section .flex-col select,
            .advance-time-input input {
                background: rgba(45, 55, 72, 0.8);
                border-color: rgba(255,255,255,0.2);
                color: #e2e8f0;
            }

            .name-suggestions {
                background: rgba(26, 32, 44, 0.8);
                border-color: rgba(255,255,255,0.1);
            }

            .time-adjust-options label {
                background: rgba(45, 55, 72, 0.8);
                color: #e2e8f0;
            }

            .modal-footer {
                background: rgba(26, 32, 44, 0.8);
            }
        }

        /* 增强的触摸反馈 */
        .modal-content * {
            -webkit-tap-highlight-color: transparent;
        }

        .config-section .flex-col input,
        .config-section .flex-col select,
        .advance-time-input input {
            -webkit-user-select: text;
            user-select: text;
        }

        /* 改善滚动性能 */
        .modal-body {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
            will-change: scroll-position;
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

    // 添加API端点测试逻辑
    try {
        // 首先测试API服务器连通性
        const testUrl = `${API_SERVER_URL}/api/health`;
        try {
            await fetch(testUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                timeout: 5000,
                headers: { 'Accept': 'application/json' }
            });
            addLog('✅ API服务器连接正常', false, false, true);
        } catch (healthError) {
            addLog(`⚠️ API服务器连接测试失败，将继续尝试: ${healthError.message}`, false, false, true);
            // 不中断操作，继续尝试
        }

        // 使用备用直接URL构建方式，避免可能的URL对象兼容问题
        const apiUrl = API_SERVER_URL + '/api/tasks/api/active';
        addLog(`🔗 请求URL: ${apiUrl}`, false, false, true);

        // 尝试不同的请求方式
        let response;
        try {
            response = await httpClient.get(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest' // 某些服务器需要这个来识别Ajax请求
                }
            });
        } catch (firstError) {
            addLog(`⚠️ 第一次请求失败: ${firstError.message}，尝试备用方法...`, false, false, true);

            // 尝试使用原生fetch作为备份方案
            const rawResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'omit'
            });

            if (!rawResponse.ok) {
                throw new Error(`HTTP错误 ${rawResponse.status}`);
            }

            const data = await rawResponse.json();
            response = { data, status: rawResponse.status };
        }

        console.log('API响应完整数据:', response);

        // 适配新的API响应格式
        let tasksData = response.data;

        // 检查返回的格式，包括更详细的日志
        if (!tasksData) {
            addLog('❌ API返回空数据', false, true);
            return false;
        }

        console.log('解析前的原始数据:', JSON.stringify(tasksData).substring(0, 200) + '...');

        // 检查返回的格式是否是完整的响应格式
        if (Array.isArray(tasksData)) {
            // 直接返回了任务数组
            addLog(`🔍 检测到API直接返回了任务数组，包含 ${tasksData.length} 个任务`, false, false, true);
        } else if (tasksData.items && Array.isArray(tasksData.items)) {
            // 返回了带items的格式 {items: [...], total: x, page: y, size: z}
            addLog(`🔍 检测到API返回了带分页的任务列表，包含 ${tasksData.items.length} 个任务`, false, false, true);
            tasksData = tasksData.items;
        } else if (tasksData.data) {
            // 数据可能嵌套在data字段中
            addLog(`🔍 检测到数据在data字段中`, false, false, true);
            if (Array.isArray(tasksData.data)) {
                addLog(`🔍 检测到任务数组在data字段中，包含 ${tasksData.data.length} 个任务`, false, false, true);
                tasksData = tasksData.data;
            } else if (tasksData.data.items && Array.isArray(tasksData.data.items)) {
                addLog(`🔍 检测到任务数组在data.items中，包含 ${tasksData.data.items.length} 个任务`, false, false, true);
                tasksData = tasksData.data.items;
            } else {
                // 尝试更通用的解析方式
                addLog(`⚠️ data字段中未找到标准任务数组，尝试智能解析...`, false, false, true);
                const possibleArrays = findArraysInObject(tasksData);
                if (possibleArrays.length > 0) {
                    // 使用找到的第一个数组
                    addLog(`🔍 找到可能的任务数组，包含 ${possibleArrays[0].length} 个项目`, false, false, true);
                    tasksData = possibleArrays[0];
                } else {
                    addLog('❌ 未找到有效的任务数组', false, true);
                    return false;
                }
            }
        } else {
            // 尝试通用方法找出任何数组
            addLog(`⚠️ 未识别的任务数据格式，尝试智能解析...`, false, false, true);
            const possibleArrays = findArraysInObject(tasksData);
            if (possibleArrays.length > 0) {
                // 使用找到的第一个数组
                addLog(`🔍 找到可能的任务数组，包含 ${possibleArrays[0].length} 个项目`, false, false, true);
                tasksData = possibleArrays[0];
            } else {
                addLog('❌ 未识别的任务数据格式，无法解析', false, true);
                console.error('未识别的响应格式:', response);
                return false;
            }
        }

        if (!Array.isArray(tasksData) || tasksData.length === 0) {
            addLog('ℹ️ 远程服务器没有可用的任务配置', false, false, true);
            return false;
        }

        // 打印第一个任务的示例，帮助调试
        if (tasksData.length > 0) {
            console.log('任务示例:', tasksData[0]);
        }

        // 将远程任务转换为本地任务格式
        const newTasks = tasksData.filter(task => task.is_active !== false).map(task => {
            // 解析时间字符串
            const timeMatch = task.execution_time?.match(/(\d{2}):(\d{2})(?::(\d{2}))?(?::(\d{3}))?/);
            let timeStr = task.execution_time || "00:00:00:000";

            if (timeMatch) {
                const hours = timeMatch[1];
                const minutes = timeMatch[2];
                const seconds = timeMatch[3] || '00';
                const milliseconds = timeMatch[4] || '000';
                timeStr = `${hours}:${minutes}:${seconds}:${milliseconds}`;
            }

            return {
                name: task.name || '未命名任务',
                time: timeStr,
                postUrl: task.post_url || '',
                frequency: task.frequency || 100,
                requestsPerTask: task.requests_per_task || advancedConfig.requestsPerTask,
                priority: task.priority || 0,
                running: false
            };
        });

        // 过滤掉无效的任务
        const validTasks = newTasks.filter(task => task.postUrl && task.name);

        if (validTasks.length < newTasks.length) {
            addLog(`⚠️ 过滤掉了 ${newTasks.length - validTasks.length} 个无效任务`, false, false, true);
        }

        if (validTasks.length === 0) {
            addLog('❌ 没有有效的任务配置', false, true);
            return false;
        }

        // 根据优先级排序
        validTasks.sort((a, b) => b.priority - a.priority);

        // 清空当前任务列表并用远程任务替换
        taskConfigs = validTasks;
        updateTasksList();

        addLog(`✅ 已从远程加载 ${validTasks.length} 个任务`, true);
        return true;
    } catch (error) {
        console.error('获取任务详细错误:', error);
        const errorMessage = error.response?.data?.detail || error.message || '未知错误';
        addLog(`❌ 获取远程任务失败: ${errorMessage}`, false, true);
        return false;
    }
}

// 辅助函数：递归查找对象中的数组
function findArraysInObject(obj, minLength = 1) {
    const arrays = [];

    function search(current) {
        if (Array.isArray(current) && current.length >= minLength) {
            arrays.push(current);
            return;
        }

        if (current && typeof current === 'object') {
            for (const key in current) {
                search(current[key]);
            }
        }
    }

    search(obj);
    return arrays;
}

// 验证API密钥有效性
async function validateApiKey(key, forceValidate = false) {
    // 如果密钥为空，直接返回失败
    if (!key) {
        addLog('❌ API密钥不能为空', false, true);
        return false;
    }

    // 检查缓存
    const now = Date.now();
    if (!forceValidate && key === lastVerifiedKey && (now - lastVerifiedTime) < VERIFICATION_CACHE_TIME) {
        addLog(`✅ 使用已验证的API密钥 (缓存有效)`, true);
        return true;
    }

    addLog('🔄 正在验证API密钥...', false, false, true);

    try {
        // 尝试先用verify-key专用接口验证
        let isValid = false;

        try {
            const apiUrl = `${API_SERVER_URL}/api/auth/verify-key`;
            const response = await httpClient.get(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200) {
                const keyInfo = response.data;
                const keyName = keyInfo.name || '未命名密钥';
                const usageInfo = keyInfo.current_usage !== undefined ?
                    `已使用 ${keyInfo.current_usage}/${keyInfo.max_usage === -1 ? '无限制' : keyInfo.max_usage}` : '';

                addLog(`✅ API密钥验证成功! 密钥名称: ${keyName} ${usageInfo}`, true);
                isValid = true;
            }
        } catch (firstAttemptError) {
            console.log('第一次验证尝试失败，尝试备用方法', firstAttemptError);
            addLog('⚠️ 主验证方法失败，尝试备用方法...', false, false, true);

            // 备用方案：尝试获取任务来验证密钥
            try {
                const backupUrl = `${API_SERVER_URL}/api/tasks/api/active`;
                const backupResponse = await httpClient.get(backupUrl, {
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Accept': 'application/json'
                    }
                });

                if (backupResponse.status === 200) {
                    addLog(`✅ API密钥验证成功 (通过任务接口)`, true);
                    isValid = true;
                }
            } catch (secondAttemptError) {
                console.log('备用验证也失败', secondAttemptError);
                // 两次尝试都失败，密钥可能无效
                isValid = false;
            }
        }

        if (isValid) {
            // 更新缓存
            lastVerifiedKey = key;
            lastVerifiedTime = now;
            return true;
        }

        addLog(`❌ API密钥验证失败`, false, true);
        return false;
    } catch (error) {
        console.error('验证API密钥详细错误:', error);

        // 如果服务器返回了401或403，则密钥无效
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            addLog(`❌ API密钥无效或已被禁用`, false, true);
        } else {
            const errorMessage = error.response?.data?.detail || error.message || '未知错误';
            addLog(`❌ API密钥验证失败: ${errorMessage}`, false, true);
        }

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

// 新增：页面秒杀模式功能 - 开始网络请求捕获
function startNetworkCapture() {
    if (isPageSeckillEnabled) {
        addLog('⚠️ 网络请求捕获已经在运行中', false, false, true);
        return;
    }

    isPageSeckillEnabled = true;
    addLog('🔍 开始捕获网络请求，寻找秒杀活动...', false, false, true);

    // 实现XHR拦截
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._requestMethod = method;
        this._requestUrl = url;
        return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;
        const originalOnReadyStateChange = xhr.onreadystatechange;

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                try {
                    // 检查URL是否匹配秒杀API模式
                    if (xhr._requestUrl && xhr._requestUrl.includes(SECKILL_URL_PATTERN)) {
                        processSecKillRequest(xhr._requestUrl, xhr.responseText);
                    }
                } catch (e) {
                    console.error('处理XHR响应时出错:', e);
                }
            }

            if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(xhr, arguments);
            }
        };

        return originalXhrSend.apply(this, arguments);
    };

    // 实现Fetch拦截
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
        const url = (typeof input === 'string') ? input : input.url;
        const response = await originalFetch.apply(this, arguments);

        try {
            if (url && url.includes(SECKILL_URL_PATTERN)) {
                // 克隆响应以便可以多次读取响应体
                const responseClone = response.clone();
                const responseText = await responseClone.text();
                processSecKillRequest(url, responseText);
            }
        } catch (e) {
            console.error('处理Fetch响应时出错:', e);
        }

        return response;
    };

    addLog('✅ 网络请求捕获已启动', true);
}

// 停止网络请求捕获
function stopNetworkCapture() {
    if (!isPageSeckillEnabled) {
        addLog('⚠️ 网络请求捕获未在运行', false, false, true);
        return;
    }

    // 恢复原始XHR和Fetch
    XMLHttpRequest.prototype.open = window.XMLHttpRequest.prototype.originalOpen || XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.send = window.XMLHttpRequest.prototype.originalSend || XMLHttpRequest.prototype.send;
    window.fetch = window.originalFetch || window.fetch;

    isPageSeckillEnabled = false;
    addLog('🛑 网络请求捕获已停止', false, false, true);
}

// 处理捕获到的秒杀请求
function processSecKillRequest(url, responseText) {
    try {
        // 解析URL参数
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const activityId = params.get('activityId');
        const gdId = params.get('gdId');
        const pageId = params.get('pageId');
        const instanceId = params.get('instanceId');

        if (!activityId || !gdId || !pageId || !instanceId) {
            console.log('秒杀URL参数不完整:', url);
            return;
        }

        // 解析响应体
        let responseData = null;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error('解析响应JSON失败:', e);
            return;
        }

        // 验证响应数据格式
        if (!responseData || responseData.code !== 1 || responseData.msg !== '成功' || !responseData.data) {
            console.log('秒杀响应无效或状态不正确:', responseData);
            return;
        }

        const data = responseData.data;

        // 获取当前可抢券信息
        const currentGrabInfo = data.currentGrabCouponInfo;
        if (!currentGrabInfo || !currentGrabInfo.token || !currentGrabInfo.roundCode) {
            console.log('无有效的当前可抢券信息:', data);
            return;
        }

        // 获取可用券列表
        const coupons = currentGrabInfo.coupon;
        if (!coupons || !Array.isArray(coupons) || coupons.length === 0) {
            console.log('无有效的券信息:', currentGrabInfo);
            return;
        }

        // 遍历券，创建秒杀任务
        for (const coupon of coupons) {
            if (!coupon.rightCode || coupon.residueStock <= 0) continue;

            // 创建标准任务格式
            const couponName = coupon.couponName || '未命名优惠券';
            const couponAmount = coupon.couponAmount || 0;
            const startTimestamp = currentGrabInfo.startDate * 1000;
            const endTimestamp = currentGrabInfo.endDate * 1000;

            // 计算开始时间字符串 (HH:MM:SS:mmm)
            const startDate = new Date(startTimestamp);
            const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}:${String(startDate.getSeconds()).padStart(2, '0')}:${String(startDate.getMilliseconds()).padStart(3, '0')}`;

            // 构建任务
            const task = {
                id: `seckill_${activityId}_${coupon.rightCode}`,
                name: `${couponAmount}元${couponName}`,
                type: 'seckill',
                time: startTimeStr,
                postUrl: SECKILL_GRAB_URL_DEFAULT,
                frequency: 100,
                requestsPerTask: advancedConfig.requestsPerTask,
                priority: 5, // 默认给页面捕获的任务高优先级
                running: false,
                // 秒杀特有参数
                seckill: {
                    activityId,
                    gdId,
                    pageId,
                    instanceId,
                    rightCode: coupon.rightCode,
                    roundCode: currentGrabInfo.roundCode,
                    grabToken: currentGrabInfo.token,
                    startTime: startTimestamp,
                    endTime: endTimestamp,
                    couponData: coupon
                }
            };

            // 避免重复添加相同任务
            const existingTaskIndex = pageSecKillTasks.findIndex(t => t.id === task.id);
            if (existingTaskIndex >= 0) {
                // 更新已有任务
                pageSecKillTasks[existingTaskIndex] = task;
                addLog(`🔄 更新秒杀任务: ${task.name}, 开始时间 ${startTimeStr}`, false, false, true);
            } else {
                // 添加新任务
                pageSecKillTasks.push(task);
                addLog(`🎯 发现新秒杀任务: ${task.name}, 开始时间 ${startTimeStr}`, true);
            }
        }

        // 更新任务列表显示
        updateSecKillTasksList();

    } catch (e) {
        console.error('处理秒杀请求时出错:', e);
    }
}

// 更新秒杀任务列表
function updateSecKillTasksList() {
    const container = document.getElementById('seckill-tasks-container');
    if (!container) return;

    container.innerHTML = '';

    if (pageSecKillTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">暂未发现任何秒杀任务，请访问秒杀活动页面...</div>';
        return;
    }

    // 按开始时间排序
    pageSecKillTasks.sort((a, b) => a.seckill.startTime - b.seckill.startTime);

    pageSecKillTasks.forEach((task, index) => {
        // 计算倒计时
        const now = Date.now();
        const timeLeft = task.seckill.startTime - now;
        const timeLeftStr = timeLeft > 0 ?
            formatTimeLeft(timeLeft) :
            '<span class="status-active">进行中</span>';

        const coupon = task.seckill.couponData;
        const stockInfo = coupon ?
            `${coupon.residueStock || 0}/${coupon.totalStock || '?'}` :
            '未知/未知';

        const taskItem = document.createElement('div');
        taskItem.className = 'task-item seckill-task-item';
        taskItem.innerHTML = `
            <div class="task-item-info">
                <div class="task-item-name">
                    ${task.name}
                    <span class="priority-badge">秒杀模式</span>
                </div>
                <div class="task-item-time">
                    <span class="time-icon">⏰</span> ${task.time.split(':').slice(0, 2).join(':')}
                    <span class="countdown">${timeLeftStr}</span>
                    <span class="stock-info">库存: ${stockInfo}</span>
                    ${task.running ? '<span class="running-badge">运行中</span>' : ''}
                </div>
            </div>
            <div class="task-item-actions">
                <button class="config-seckill-task-btn" data-index="${index}" title="配置任务">配置</button>
                <button class="test-seckill-task-btn" data-index="${index}" title="测试">测试</button>
            </div>
        `;
        container.appendChild(taskItem);
    });

    // 绑定按钮事件
    document.querySelectorAll('.config-seckill-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            showSecKillConfigModal(index);
        });
    });

    document.querySelectorAll('.test-seckill-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            e.target.classList.add('loading');
            testSecKillTask(index).finally(() => {
                setTimeout(() => {
                    e.target.classList.remove('loading');
                }, 500);
            });
        });
    });
}

// 新增：显示秒杀任务配置弹窗
function showSecKillConfigModal(taskIndex) {
    const task = pageSecKillTasks[taskIndex];
    if (!task) return;

    const modal = document.getElementById('seckill-config-modal');
    if (!modal) return;

    // 填充任务预览信息
    const taskPreviewName = modal.querySelector('.task-preview-name');
    const taskPreviewDetails = modal.querySelector('.task-preview-details');

    if (taskPreviewName) {
        taskPreviewName.textContent = task.name;
    }

    if (taskPreviewDetails) {
        const startTime = new Date(task.seckill.startTime);
        const endTime = new Date(task.seckill.endTime);
        const coupon = task.seckill.couponData;

        taskPreviewDetails.innerHTML = `
            开始时间: ${startTime.toLocaleString()}<br>
            结束时间: ${endTime.toLocaleString()}<br>
            库存: ${coupon?.residueStock || 0}/${coupon?.totalStock || '?'}<br>
            券类型: ${coupon?.couponName || '未知'}
        `;
    }

    // 设置默认值
    const startTimeInput = modal.querySelector('#seckill-start-time');
    const startMsInput = modal.querySelector('#seckill-start-ms');
    const frequencyInput = modal.querySelector('#seckill-frequency');
    const requestCountInput = modal.querySelector('#seckill-request-count');
    const prioritySelect = modal.querySelector('#seckill-priority');
    const autoStartCheckbox = modal.querySelector('#seckill-auto-start');
    const customNameInput = modal.querySelector('#seckill-custom-name');

    const originalStartTime = new Date(task.seckill.startTime);
    const timeStr = `${String(originalStartTime.getHours()).padStart(2, '0')}:${String(originalStartTime.getMinutes()).padStart(2, '0')}:${String(originalStartTime.getSeconds()).padStart(2, '0')}`;

    if (startTimeInput) startTimeInput.value = timeStr;
    if (startMsInput) startMsInput.value = originalStartTime.getMilliseconds();
    if (frequencyInput) frequencyInput.value = task.frequency || 50;
    if (requestCountInput) requestCountInput.value = task.requestsPerTask || 5;
    if (prioritySelect) prioritySelect.value = task.priority || 5;
    if (autoStartCheckbox) autoStartCheckbox.checked = true;
    if (customNameInput) customNameInput.value = '';

    // 设置建议的任务名称
    updateNameSuggestions(task);

    // 绑定时间模式切换
    setupTimeModeSwitching(task);

    // 绑定确认和取消按钮
    setupModalButtons(taskIndex);

    // 显示弹窗
    modal.style.display = 'block';
}

// 新增：设置时间模式切换
function setupTimeModeSwitching(task) {
    const modal = document.getElementById('seckill-config-modal');
    const timeModeRadios = modal.querySelectorAll('input[name="time-mode"]');
    const advanceTimeInput = modal.querySelector('.advance-time-input');
    const customTimeInput = modal.querySelector('#seckill-start-time');
    const customMsInput = modal.querySelector('#seckill-start-ms');

    timeModeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedMode = radio.value;

            if (selectedMode === 'advance') {
                advanceTimeInput.style.display = 'block';
                customTimeInput.disabled = true;
                customMsInput.disabled = true;
            } else if (selectedMode === 'custom') {
                advanceTimeInput.style.display = 'none';
                customTimeInput.disabled = false;
                customMsInput.disabled = false;
            } else {
                // original mode
                advanceTimeInput.style.display = 'none';
                customTimeInput.disabled = true;
                customMsInput.disabled = true;

                // 重置为原始时间
                const originalStartTime = new Date(task.seckill.startTime);
                const timeStr = `${String(originalStartTime.getHours()).padStart(2, '0')}:${String(originalStartTime.getMinutes()).padStart(2, '0')}:${String(originalStartTime.getSeconds()).padStart(2, '0')}`;
                customTimeInput.value = timeStr;
                customMsInput.value = originalStartTime.getMilliseconds();
            }
        });
    });
}

// 新增：更新任务名称建议
function updateNameSuggestions(task) {
    const modal = document.getElementById('seckill-config-modal');
    const suggestionsContainer = modal.querySelector('.name-suggestion-buttons');
    const customNameInput = modal.querySelector('#seckill-custom-name');

    if (!suggestionsContainer || !customNameInput) return;

    // 清空现有建议
    suggestionsContainer.innerHTML = '';

    const coupon = task.seckill.couponData;
    const couponAmount = coupon?.couponAmount || 0;
    const originalStartTime = new Date(task.seckill.startTime);
    const timeStr = `${originalStartTime.getHours()}:${String(originalStartTime.getMinutes()).padStart(2, '0')}`;

    // 生成建议名称
    const suggestions = [
        task.name, // 原始名称
        `${timeStr}-${couponAmount}元券`,
        `秒杀${couponAmount}元优惠券`,
        `${timeStr}秒杀`,
        `${couponAmount}元秒杀券`,
        `优先抢购-${couponAmount}元`
    ];

    // 去重并创建按钮
    [...new Set(suggestions)].forEach(suggestion => {
        const btn = document.createElement('button');
        btn.className = 'name-suggestion-btn';
        btn.textContent = suggestion;
        btn.addEventListener('click', () => {
            customNameInput.value = suggestion;
        });
        suggestionsContainer.appendChild(btn);
    });
}

// 新增：设置弹窗按钮事件
function setupModalButtons(taskIndex) {
    const modal = document.getElementById('seckill-config-modal');
    const confirmBtn = modal.querySelector('#seckill-config-confirm');
    const cancelBtn = modal.querySelector('#seckill-config-cancel');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const overlay = modal.querySelector('.modal-overlay');

    // 移除旧的事件监听器
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);

    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    // 关闭弹窗的函数
    const closeModal = () => {
        modal.style.display = 'none';
    };

    // 绑定新的事件监听器
    newConfirmBtn.addEventListener('click', () => {
        addConfiguredSecKillTask(taskIndex);
        closeModal();
    });

    newCancelBtn.addEventListener('click', closeModal);
    newCloseBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

// 新增：添加配置好的秒杀任务
function addConfiguredSecKillTask(taskIndex) {
    const originalTask = pageSecKillTasks[taskIndex];
    if (!originalTask) {
        addLog('❌ 任务不存在', false, true);
        return;
    }

    const modal = document.getElementById('seckill-config-modal');

    // 获取配置值
    const timeMode = modal.querySelector('input[name="time-mode"]:checked')?.value || 'original';
    const customTimeInput = modal.querySelector('#seckill-start-time');
    const customMsInput = modal.querySelector('#seckill-start-ms');
    const advanceInput = modal.querySelector('#advance-milliseconds');
    const frequencyInput = modal.querySelector('#seckill-frequency');
    const requestCountInput = modal.querySelector('#seckill-request-count');
    const prioritySelect = modal.querySelector('#seckill-priority');
    const autoStartCheckbox = modal.querySelector('#seckill-auto-start');
    const customNameInput = modal.querySelector('#seckill-custom-name');

    // 计算最终执行时间
    let finalStartTime = originalTask.seckill.startTime;
    let finalTimeStr = originalTask.time;

    if (timeMode === 'advance') {
        const advanceMs = parseInt(advanceInput.value) || 500;
        finalStartTime = originalTask.seckill.startTime - advanceMs;
        const adjustedTime = new Date(finalStartTime);
        finalTimeStr = `${String(adjustedTime.getHours()).padStart(2, '0')}:${String(adjustedTime.getMinutes()).padStart(2, '0')}:${String(adjustedTime.getSeconds()).padStart(2, '0')}:${String(adjustedTime.getMilliseconds()).padStart(3, '0')}`;
    } else if (timeMode === 'custom') {
        const timeValue = customTimeInput.value;
        const msValue = parseInt(customMsInput.value) || 0;

        if (timeValue) {
            const [hours, minutes, seconds] = timeValue.split(':').map(Number);
            const customTime = new Date();
            customTime.setHours(hours, minutes, seconds || 0, msValue);

            // 如果自定义时间是明天
            if (customTime.getTime() <= Date.now()) {
                customTime.setDate(customTime.getDate() + 1);
            }

            finalStartTime = customTime.getTime();
            finalTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}:${String(msValue).padStart(3, '0')}`;
        }
    }

    // 创建新任务
    const configuredTask = {
        ...originalTask,
        name: customNameInput.value.trim() || originalTask.name,
        time: finalTimeStr,
        frequency: parseInt(frequencyInput.value) || 50,
        requestsPerTask: parseInt(requestCountInput.value) || 5,
        priority: parseInt(prioritySelect.value) || 5,
        seckill: {
            ...originalTask.seckill,
            startTime: finalStartTime,
            configuredTime: finalTimeStr
        }
    };

    // 检查重复添加
    const existingTaskIndex = taskConfigs.findIndex(t =>
        t.type === 'seckill' && t.id === configuredTask.id);

    if (existingTaskIndex >= 0) {
        // 更新已有任务
        taskConfigs[existingTaskIndex] = configuredTask;
        addLog(`🔄 已更新秒杀任务配置: ${configuredTask.name}`, false, false, true);
    } else {
        // 添加新任务
        taskConfigs.push(configuredTask);
        addLog(`✅ 已添加配置的秒杀任务: ${configuredTask.name}`, true);
    }

    // 如果设置了自动启动，立即启动任务
    if (autoStartCheckbox.checked) {
        const timeToStart = finalStartTime - Date.now();
        const taskIndex = taskConfigs.length - 1;

        if (timeToStart <= 0) {
            // 立即启动
            addLog(`🚀 立即启动秒杀任务: ${configuredTask.name}`, false, false, true);
            start(taskIndex);
        } else {
            // 定时启动
            const startTime = new Date(finalStartTime);
            addLog(`⏰ 秒杀任务 "${configuredTask.name}" 将在 ${startTime.toTimeString().slice(0, 8)} 启动`, false, false, true);

            setTimeout(() => {
                if (!configuredTask.running) {
                    addLog(`🚀 定时启动秒杀任务: ${configuredTask.name}`, false, false, true);
                    start(taskIndex);
                }
            }, timeToStart);
        }
    }

    // 更新任务列表显示
    updateTasksList();
}

// 测试秒杀任务
async function testSecKillTask(index) {
    const task = pageSecKillTasks[index];
    if (!task) {
        addLog('❌ 任务不存在', false, true);
        return;
    }

    // 测试开始日志
    addLog(`🧪 开始测试秒杀任务: "${task.name}"`, false, false, true);
    addLog(`📋 测试详情: ${JSON.stringify(task.seckill).substring(0, 100)}...`, false, false, true);

    // 生成指纹
    addLog(`🔐 开始生成请求指纹...`, false, false, true);
    let mtF = "";
    try {
        mtF = window.H5guard.getfp();
        addLog(`✅ 成功生成指纹 (长度: ${mtF.length})`, true);
    } catch (e) {
        addLog(`❌ 生成指纹失败: ${e.message}`, false, true);
        return;
    }

    // 配置请求头
    const config = {
        headers: {
            Cookie: document.cookie // 去掉多余的引号
        }
    };

    // 准备POST请求数据
    addLog(`📝 准备秒杀POST请求数据...`, false, false, true);
    const seckillData = {
        "activityId": task.seckill.activityId,
        "gdId": parseInt(task.seckill.gdId),
        "pageId": parseInt(task.seckill.pageId),
        "instanceId": task.seckill.instanceId,
        "rightCode": task.seckill.rightCode,
        "roundCode": task.seckill.roundCode,
        "grabToken": task.seckill.grabToken,
        "mtFingerprint": mtF
    };

    // 准备请求对象
    let req = {
        "url": task.postUrl,
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "content-type": "application/json",
            "content-encoding": "",
            "Cookie": document.cookie // 去掉多余的引号
        },
        "data": seckillData
    };

    // 测试签名生成
    addLog(`🔏 生成请求签名...`, false, false, true);
    try {
        const signRes = await window.H5guard.sign(req);
        const mtgsig = signRes.headers.mtgsig;
        config.headers.mtgsig = mtgsig;
        addLog(`✅ 成功生成签名`, true);
        addLog(`🍪 Cookie长度: ${config}`, false, false, true);

        // 发送一次POST请求
        addLog(`📤 发送POST请求(仅一次)...`, false, false, true);
        const postRes = await httpClient.post(task.postUrl, req.data, config);

        // 输出POST响应结果
        if (postRes.data) {
            addLog(`📨 收到响应: ${JSON.stringify(postRes.data).substring(0, 100)}...`, false, false, true);

            if (postRes.data.code === 0 || postRes.data.msg === '成功') {
                addLog(`🎉 模拟秒杀成功! ${postRes.data.msg}`, true);
            } else if (postRes.data.msg === '时间验证失败') {
                addLog(`⏰ 时间验证失败 - 实际秒杀时会持续重试`, false, false, true);
            } else {
                addLog(`ℹ️ 秒杀结果: ${postRes.data.msg}`, false, false, true);
            }
        } else {
            addLog(`❓ 收到空响应`, false, true);
        }

        // 总结测试结果
        addLog(`📑 测试完成! 秒杀任务有效`, true);
        const timeLeft = task.seckill.startTime - Date.now();
        if (timeLeft > 0) {
            addLog(`⏰ 秒杀将在${formatTimeLeft(timeLeft)}后开始`, false, false, true);
        } else {
            addLog(`⏰ 秒杀已经开始! 可以立即运行`, false, false, true);
        }
    } catch (err) {
        addLog(`❌ 签名或POST请求失败: ${err.message || '未知错误'}`, false, true);
    }
}

// 进行秒杀请求
async function sendSecKillRequest(task, config, taskIndex) {
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

    // 准备秒杀请求数据
    const seckillData = {
        "activityId": task.seckill.activityId,
        "gdId": parseInt(task.seckill.gdId),
        "pageId": parseInt(task.seckill.pageId),
        "instanceId": task.seckill.instanceId,
        "rightCode": task.seckill.rightCode,
        "roundCode": task.seckill.roundCode,
        "grabToken": task.seckill.grabToken,
        "mtFingerprint": mtF
    };

    // 准备请求
    let req = {
        "url": task.postUrl,
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "content-type": "application/json",
            "content-encoding": "",
            "Cookie": document.cookie // 去掉多余的引号
        },
        "data": seckillData
    };

    try {
        // 生成签名
        const signRes = await window.H5guard.sign(req);
        const mtgsig = signRes.headers.mtgsig;
        config.headers.mtgsig = mtgsig;

        // 发送post请求
        const res = await httpClient.post(task.postUrl, req.data, config);

        // 处理响应
        if (res.data.msg === '时间验证失败') {
            addLog('时间验证失败，继续尝试...', false, false, true);
        } else {
            if (res.data.code === 0 || res.data.msg === '成功') {
                addLog('🎉 秒杀成功! ' + res.data.msg, true);
                successRequests++;
                priorityRequests++;
                taskConfigs[taskIndex].running = false;
            } else {
                addLog('秒杀结果: ' + res.data.msg, false, false, true);
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

// 开始秒杀任务
async function startSecKillTask(taskIndex) {
    const task = taskConfigs[taskIndex];
    if (!task || task.type !== 'seckill') return;

    task.running = true;

    // 配置请求头
    const config = {
        headers: {
            Cookie: document.cookie // 去掉多余的引号
        }
    };

    addLog(`🚀 开始秒杀任务: ${task.name}`, false, false, true);

    // 设置请求计数器
    let requestCount = 0;
    const maxRequests = task.requestsPerTask || advancedConfig.requestsPerTask;

    // 启动定期发送请求
    const interval = setInterval(() => {
        if (!task.running) {
            clearInterval(interval);
            addLog(`⏹️ 停止秒杀任务: ${task.name}`, false, false, true);
            return;
        }

        // 检查请求次数限制
        if (maxRequests > 0 && requestCount >= maxRequests) {
            clearInterval(interval);
            addLog(`⏹️ 任务 ${task.name} 已完成 ${maxRequests} 次请求，任务结束`, false, false, true);
            task.running = false;
            return;
        }

        sendSecKillRequest(task, config, taskIndex);
        requestCount++;
    }, task.frequency);
}

// 启动定时更新秒杀任务倒计时显示
function startSecKillCountdown() {
    // 每秒更新倒计时
    setInterval(() => {
        if (pageSecKillTasks.length > 0) {
            updateSecKillTasksList();
        }
    }, 1000);
}

// 格式化倒计时显示
function formatTimeLeft(milliseconds) {
    if (milliseconds < 0) return '已开始';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
        return `${minutes}分${seconds}秒`;
    } else {
        return `${seconds}秒`;
    }
}

// 添加秒杀任务到主任务列表
function addSecKillTask(index) {
    const task = pageSecKillTasks[index];
    if (!task) {
        addLog('❌ 任务不存在', false, true);
        return;
    }

    // 检查重复添加
    const existingTaskIndex = taskConfigs.findIndex(t =>
        t.type === 'seckill' && t.id === task.id);

    if (existingTaskIndex >= 0) {
        addLog(`⚠️ 该秒杀任务已经添加到任务列表`, false, false, true);
        return;
    }

    // 克隆任务并添加到主任务配置
    const newTask = { ...task };
    taskConfigs.push(newTask);

    // 更新任务列表显示
    updateTasksList();
    addLog(`✅ 已添加秒杀任务: ${task.name}`, true);
}