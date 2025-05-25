import { useState, useContext } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Dropdown, Button, Avatar, Space } from 'antd'
import {
    HomeOutlined,
    UserOutlined,
    KeyOutlined,
    FieldTimeOutlined,
    FileTextOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined
} from '@ant-design/icons'
import { AuthContext } from '../context/AuthContext'

const { Header, Content, Footer, Sider } = Layout

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false)
    const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()
    const navigate = useNavigate()
    const location = useLocation()
    const { user, logout } = useContext(AuthContext)

    // 获取当前选中的菜单项
    const getSelectedKey = () => {
        const path = location.pathname
        if (path === '/') return '1'
        if (path.startsWith('/users')) return '2'
        if (path.startsWith('/keys')) return '3'
        if (path.startsWith('/tasks')) return '4'
        if (path.startsWith('/logs')) return '5'
        return '1'
    }

    // 处理菜单点击
    const handleMenuClick = (key: string) => {
        switch (key) {
            case '1':
                navigate('/')
                break
            case '2':
                navigate('/users')
                break
            case '3':
                navigate('/keys')
                break
            case '4':
                navigate('/tasks')
                break
            case '5':
                navigate('/logs')
                break
            default:
                navigate('/')
        }
    }

    // 处理退出登录
    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                <div style={{
                    height: 32,
                    margin: 16,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'white',
                    fontSize: collapsed ? 14 : 18,
                    fontWeight: 'bold'
                }}>
                    {collapsed ? 'MT' : '美团秒杀系统'}
                </div>
                <Menu
                    theme="dark"
                    defaultSelectedKeys={[getSelectedKey()]}
                    mode="inline"
                    onClick={({ key }) => handleMenuClick(key)}
                    items={[
                        {
                            key: '1',
                            icon: <HomeOutlined />,
                            label: '仪表盘',
                        },
                        {
                            key: '2',
                            icon: <UserOutlined />,
                            label: '用户管理',
                        },
                        {
                            key: '3',
                            icon: <KeyOutlined />,
                            label: 'API密钥管理',
                        },
                        {
                            key: '4',
                            icon: <FieldTimeOutlined />,
                            label: '抢券任务管理',
                        },
                        {
                            key: '5',
                            icon: <FileTextOutlined />,
                            label: '访问日志',
                        },
                    ]}
                />
            </Sider>
            <Layout>
                <Header style={{
                    padding: '0 16px',
                    background: colorBgContainer,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <Dropdown menu={{
                        items: [
                            {
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                label: '退出登录',
                                onClick: handleLogout
                            }
                        ]
                    }}>
                        <Space>
                            <Avatar icon={<UserOutlined />} />
                            <span>{user?.username || '用户'}</span>
                        </Space>
                    </Dropdown>
                </Header>
                <Content style={{ margin: '16px' }}>
                    <div
                        style={{
                            padding: 24,
                            minHeight: 360,
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                        }}
                    >
                        <Outlet />
                    </div>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    美团秒杀管理系统 ©{new Date().getFullYear()}
                </Footer>
            </Layout>
        </Layout>
    )
}

export default MainLayout 