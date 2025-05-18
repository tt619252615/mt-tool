import { createContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { message } from 'antd'
import { getCurrentUser } from '../api/user'

interface AuthContextType {
    isAuthenticated: boolean
    user: any | null
    loading: boolean
    login: (token: string) => void
    logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
})

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(true)

    console.log("AuthProvider 重新渲染, 状态:", { isAuthenticated, loading, hasUser: !!user })

    // 获取用户信息的函数
    const fetchUserInfo = async () => {
        console.log("开始获取用户信息")
        const token = localStorage.getItem('token')
        if (!token) {
            console.log("未找到token，无法获取用户信息")
            setLoading(false)
            return
        }

        try {
            console.log("调用getCurrentUser API")
            const userData = await getCurrentUser()
            console.log("获取到用户数据:", userData)

            // 检查各种可能的用户数据格式
            if (userData) {
                // 直接在根对象上有username (GET /auth/me直接返回用户对象)
                if ((userData as any).username) {
                    console.log("用户数据在根对象上，设置认证状态为true")
                    setUser(userData as any)
                    setIsAuthenticated(true)
                }
                // 在data字段中有username
                else if (userData.data && userData.data.username) {
                    console.log("用户数据在data字段中，设置认证状态为true")
                    setUser(userData.data)
                    setIsAuthenticated(true)
                }
                else {
                    console.error('获取用户信息失败: 无效的用户数据结构', userData)
                    localStorage.removeItem('token')
                    setIsAuthenticated(false)
                }
            } else {
                console.error('获取用户信息失败: 响应为空')
                localStorage.removeItem('token')
                setIsAuthenticated(false)
            }
        } catch (error) {
            console.error('验证令牌失败:', error)
            localStorage.removeItem('token')
            setIsAuthenticated(false)
        } finally {
            setLoading(false)
        }
    }

    // 组件挂载时检查认证状态
    useEffect(() => {
        console.log("AuthProvider组件挂载，检查认证状态")
        fetchUserInfo()
    }, [])

    const login = async (token: string) => {
        console.log("登录函数被调用，设置token:", token.substring(0, 10) + "...")
        localStorage.setItem('token', token)

        // 立即设置认证状态为true，不等待用户信息获取
        setIsAuthenticated(true)

        // 然后获取用户信息
        try {
            console.log("开始获取用户信息")
            await fetchUserInfo()
            console.log("成功获取用户信息并更新状态")
        } catch (error) {
            console.error('获取用户信息失败:', error)
            message.error('获取用户信息失败')
            setIsAuthenticated(false)
        }
    }

    const logout = () => {
        console.log("登出函数被调用")
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setUser(null)
        message.success('已成功退出登录')
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
} 