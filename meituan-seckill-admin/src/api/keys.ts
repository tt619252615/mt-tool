import { callApi } from './index'

export interface ApiKey {
    id: number
    key: string
    name: string
    description: string
    created_at: string
    updated_at: string | null
    last_used_at: string | null
    max_usage: number
    current_usage: number
    is_active: boolean
}

export interface ApiKeyListResponse {
    items: ApiKey[]
    total: number
    page: number
    size: number
}

export interface CreateApiKeyParams {
    name: string
    description: string
    max_usage: number
}

export interface UpdateApiKeyParams {
    name?: string
    description?: string
    max_usage?: number
    is_active?: boolean
}

// 获取API密钥列表
export const getApiKeyList = async () => {
    console.log('调用getApiKeyList API');
    try {
        const response = await callApi('get', '/keys');
        console.log('获取API密钥列表原始响应:', response);
        return response;
    } catch (error) {
        console.error('getApiKeyList API错误:', error);
        throw error;
    }
}

// 获取单个API密钥
export const getApiKey = async (id: number) => {
    return await callApi('get', `/keys/${id}`);
}

// 创建API密钥
export const createApiKey = async (params: CreateApiKeyParams) => {
    console.log('创建API密钥参数:', params);
    try {
        const response = await callApi('post', '/keys', params);
        console.log('创建API密钥响应:', response);
        return response;
    } catch (error) {
        console.error('创建API密钥错误:', error);
        throw error;
    }
}

// 更新API密钥
export const updateApiKey = async (id: number, params: UpdateApiKeyParams) => {
    console.log('更新API密钥参数:', id, params);
    try {
        const response = await callApi('put', `/keys/${id}`, params);
        console.log('更新API密钥响应:', response);
        return response;
    } catch (error) {
        console.error('更新API密钥错误:', error);
        throw error;
    }
}

// 删除API密钥
export const deleteApiKey = async (id: number) => {
    console.log('删除API密钥ID:', id);
    try {
        const response = await callApi('delete', `/keys/${id}`);
        console.log('删除API密钥响应:', response);
        return response;
    } catch (error) {
        console.error('删除API密钥错误:', error);
        throw error;
    }
}

// 重置API密钥使用次数
export const resetApiKeyUsage = async (id: number) => {
    console.log('重置API密钥使用次数ID:', id);
    try {
        const response = await callApi('post', `/keys/${id}/reset`);
        console.log('重置API密钥使用次数响应:', response);
        return response;
    } catch (error) {
        console.error('重置API密钥使用次数错误:', error);
        throw error;
    }
} 