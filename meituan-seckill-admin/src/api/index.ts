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

// 辅助函数：封装API调用，添加更好的错误处理
export const callApi = async (method: string, url: string, data?: any, options?: any) => {
    try {
        console.log(`调用API: ${method.toUpperCase()} ${url}`, data || '无数据');

        let response;
        switch (method.toLowerCase()) {
            case 'get':
                response = await api.get(url, options);
                break;
            case 'post':
                response = await api.post(url, data, options);
                break;
            case 'put':
                response = await api.put(url, data, options);
                break;
            case 'delete':
                response = await api.delete(url, options);
                break;
            case 'patch':
                response = await api.patch(url, data, options);
                break;
            default:
                throw new Error(`不支持的API方法: ${method}`);
        }

        console.log(`API响应成功: ${method.toUpperCase()} ${url}`, response);
        return response;
    } catch (error) {
        console.error(`API调用失败: ${method.toUpperCase()} ${url}`, error);
        throw error;
    }
};

export default api 