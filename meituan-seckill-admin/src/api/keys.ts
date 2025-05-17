import api, { callApi } from './index'

export interface ApiKey {
    id: number
    key: string
    name: string
    description: string
    created_at: string
    updated_at: string
    max_usage: number
    current_usage: number
    is_active: boolean
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
    return callApi('get', '/keys')
}

// 获取单个API密钥
export const getApiKey = async (id: number) => {
    return callApi('get', `/keys/${id}`)
}

// 创建API密钥
export const createApiKey = async (params: CreateApiKeyParams) => {
    return callApi('post', '/keys', params)
}

// 更新API密钥
export const updateApiKey = async (id: number, params: UpdateApiKeyParams) => {
    return callApi('put', `/keys/${id}`, params)
}

// 删除API密钥
export const deleteApiKey = async (id: number) => {
    return callApi('delete', `/keys/${id}`)
}

// 重置API密钥使用次数
export const resetApiKeyUsage = async (id: number) => {
    return callApi('post', `/keys/${id}/reset-usage`)
} 