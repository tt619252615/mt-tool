import { useState, useContext, useEffect } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../api/user'
import { AuthContext } from '../context/AuthContext'

const Login = () => {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const { login: authLogin, isAuthenticated } = useContext(AuthContext)

    // 获取之前尝试访问的路径，如果没有则默认为首页
    const from = location.state?.from?.pathname || '/'

    console.log("Login组件渲染 - 当前认证状态:", isAuthenticated, "目标路径:", from)

    // 如果已经登录，则自动跳转
    useEffect(() => {
        if (isAuthenticated) {
            console.log('用户已认证，正在跳转到:', from)
            // 使用setTimeout确保状态已完全更新
            setTimeout(() => {
                navigate(from, { replace: true })
            }, 100)
        }
    }, [isAuthenticated, from, navigate])

    const onFinish = async (values: { username: string; password: string }) => {
        try {
            setLoading(true)
            console.log('正在尝试登录...', values.username)

            const response = await login(values.username, values.password)
            console.log('登录响应:', JSON.stringify(response).substring(0, 200))

            let token = null

            // 处理可能的响应格式
            if (response && response.data && response.data.access_token) {
                // 标准格式: { data: { access_token: ... } }
                token = response.data.access_token
                console.log('从标准格式中提取token')
            } else if (response && (response as any).access_token) {
                // 直接格式: { access_token: ... }
                token = (response as any).access_token
                console.log('从直接响应中提取token')
            } else if (typeof response === 'object') {
                // 尝试在对象中寻找token
                console.log('尝试在对象中查找token字段')
                const findToken = (obj: any): string | null => {
                    if (!obj || typeof obj !== 'object') return null

                    if (obj.access_token) return obj.access_token
                    if (obj.token) return obj.token

                    for (const key in obj) {
                        if (typeof obj[key] === 'object') {
                            const found = findToken(obj[key])
                            if (found) return found
                        }
                    }
                    return null
                }

                token = findToken(response)
                if (token) console.log('在嵌套对象中找到token')
            }

            if (token) {
                // 使用AuthContext的login方法更新认证状态
                console.log('获取到token，正在调用authLogin...')
                authLogin(token)
                message.success('登录成功')

                // 强制手动触发跳转，以防useEffect没有正确执行
                console.log('手动触发导航到:', from)
                setTimeout(() => {
                    if (window.location.pathname === '/login') {
                        console.log('使用navigate强制跳转')
                        navigate(from, { replace: true })
                    }
                }, 500)
            } else {
                message.error('登录失败，请检查用户名和密码')
                console.error('登录失败，响应缺少token:', response)
            }
        } catch (error) {
            message.error('登录失败，请稍后再试')
            console.error('登录错误:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f0f2f5',
            }}
        >
            <Card
                title={
                    <div style={{ textAlign: 'center', fontSize: '24px' }}>
                        美团秒杀系统管理后台
                    </div>
                }
                style={{ width: 400 }}
            >
                <Form
                    name="login"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block size="large">
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}

export default Login 