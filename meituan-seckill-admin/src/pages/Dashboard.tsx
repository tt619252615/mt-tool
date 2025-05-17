import { Card, Col, Row, Statistic } from 'antd'
import { ShoppingCartOutlined, UserOutlined, FieldTimeOutlined, DollarOutlined } from '@ant-design/icons'

const Dashboard = () => {
    return (
        <div>
            <h1>欢迎使用美团秒杀管理系统</h1>
            <div style={{ marginTop: '24px' }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="总销售额"
                                value={112893}
                                precision={2}
                                valueStyle={{ color: '#3f8600' }}
                                prefix={<DollarOutlined />}
                                suffix="元"
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="总用户数"
                                value={8846}
                                valueStyle={{ color: '#1677ff' }}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="总订单数"
                                value={6560}
                                valueStyle={{ color: '#cf1322' }}
                                prefix={<ShoppingCartOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="活动场次"
                                value={25}
                                valueStyle={{ color: '#722ed1' }}
                                prefix={<FieldTimeOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>
            <div style={{ marginTop: '24px' }}>
                <Card title="系统公告">
                    <p>欢迎使用美团秒杀管理系统，这里可以管理各类秒杀活动。</p>
                    <p>如有任何问题，请联系系统管理员。</p>
                </Card>
            </div>
        </div>
    )
}

export default Dashboard 