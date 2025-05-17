import { useState, useContext } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../api/user'
import { AuthContext } from '../context/AuthContext'

const Login = () => {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const { login: authLogin } = useContext(AuthContext)

    // 获取之前尝试访问的路径，如果没有则默认为首页
    const from = location.state?.from?.pathname || '/'

    const onFinish = async (values: { username: string; password: string }) => {
        try {
            setLoading(true)
            const response = await login(values.username, values.password)
            if (response && response.data && response.data.access_token) {
                // 使用AuthContext的login方法更新认证状态
                authLogin(response.data.access_token)
                message.success('登录成功')

                // 导航到之前尝试访问的页面或首页
                setTimeout(() => {
                    navigate(from, { replace: true })
                }, 500)
            } else {
                message.error('登录失败，请检查用户名和密码')
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