import axios from 'axios'
import { message } from 'antd'

// 创建axios实例
const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
            console.log('发送请求:', config.method?.toUpperCase(), config.url, '附带认证令牌')
        } else {
            console.log('发送请求:', config.method?.toUpperCase(), config.url, '无认证令牌')
        }
        return config
    },
    (error) => {
        console.error('请求拦截器错误:', error)
        return Promise.reject(error)
    }
)

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        // 输出API响应信息用于调试
        console.log('API响应成功:', response.config.method?.toUpperCase(), response.config.url, response.status)
        // 直接返回响应数据
        return response.data
    },
    (error) => {
        // 处理响应错误
        if (error.response) {
            const { status, data, config } = error.response
            console.error('API响应错误:', config.method.toUpperCase(), config.url, status, data)

            // 处理未授权错误
            if (status === 401) {
                localStorage.removeItem('token')
                // 如果当前不在登录页，才跳转和显示消息
                if (window.location.pathname !== '/login') {
                    message.error('登录已过期，请重新登录')
                    window.location.href = '/login'
                }
            }
            // 处理其他错误
            else {
                const errorMsg = data?.msg || '请求失败，请稍后再试'
                message.error(errorMsg)
            }
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error('请求无响应:', error.request)
            message.error('服务器无响应，请检查网络连接或联系管理员')
        } else {
            // 设置请求时发生错误
            console.error('请求错误:', error.message)
            message.error('请求错误: ' + error.message)
        }

        return Promise.reject(error)
    }
)

// 重新定义callApi函数，添加更详细的日志和错误处理
export const callApi = async (method: string, url: string, data?: any, config?: any) => {
    console.log(`[API调用] ${method.toUpperCase()} ${url}`, data ? `数据: ${JSON.stringify(data)}` : '');

    try {
        let response;

        switch (method.toLowerCase()) {
            case 'get':
                response = await api.get(url, config);
                break;
            case 'post':
                response = await api.post(url, data, config);
                break;
            case 'put':
                response = await api.put(url, data, config);
                break;
            case 'delete':
                response = await api.delete(url, config);
                break;
            case 'patch':
                response = await api.patch(url, data, config);
                break;
            default:
                throw new Error(`不支持的HTTP方法: ${method}`);
        }

        console.log(`[API响应] ${method.toUpperCase()} ${url} 状态码: ${response.status}`);

        // 处理响应统一格式
        if (response && typeof response === 'object') {
            // 适配API响应: 将直接返回的数据包装成预期的格式
            const responseObj = response as any; // 使用any类型处理动态属性
            if (!responseObj.data && (
                responseObj.items !== undefined ||
                responseObj.total !== undefined ||
                responseObj.page !== undefined
            )) {
                console.log(`[API适配] ${method.toUpperCase()} ${url} 响应格式调整: 添加data字段`);
                // 创建统一的响应格式
                const adaptedResponse = {
                    data: responseObj
                };
                return adaptedResponse;
            }
            return response;
        } else {
            console.error(`[API错误] ${method.toUpperCase()} ${url} 响应不是对象:`, response);
            throw new Error('API响应格式错误');
        }
    } catch (error: any) {
        console.error(`[API错误] ${method.toUpperCase()} ${url}`, error);

        // 增强错误处理和日志记录
        if (error.response) {
            // 服务器返回了错误状态码
            console.error(`服务器返回错误 ${error.response.status}:`, error.response.data);

            // 特殊处理401未授权错误
            if (error.response.status === 401) {
                console.warn('用户未授权，可能需要重新登录');
                // 这里可以添加重定向到登录页的逻辑
            }
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error('服务器没有响应:', error.request);
        } else {
            // 请求配置出错
            console.error('请求配置错误:', error.message);
        }

        throw error;
    }
};

export default api 