import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Switch, TimePicker, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import * as tasksApi from '../../api/tasks'
import type { Task, CreateTaskParams, UpdateTaskParams, UpdateTaskStatusParams } from '../../api/tasks'
import dayjs from 'dayjs'

// 任务列表组件
const TaskList = () => {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [form] = Form.useForm()
    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [modalTitle, setModalTitle] = useState('创建抢券任务')
    // 添加分页状态
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    })

    // 添加删除确认对话框相关状态
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');

    // 添加状态切换确认对话框相关状态
    const [toggleConfirmVisible, setToggleConfirmVisible] = useState(false);
    const [toggleTask, setToggleTask] = useState<Task | null>(null);
    const [toggleAction, setToggleAction] = useState<string>('');

    const fetchTasks = async () => {
        try {
            setLoading(true)
            console.log('开始获取任务列表...')
            const res = await tasksApi.getTaskList()
            console.log('获取到的任务数据原始响应:', res)

            // 检查响应结构
            if (!res) {
                console.error('API返回空响应')
                setTasks([])
                setLoading(false)
                return
            }

            // 获取数据 - 支持多种可能的响应格式
            let responseData = res;

            // 如果有data字段，可能是经过callApi包装后的格式
            if (res.data) {
                console.log('发现嵌套的data字段')
                responseData = res.data;
            }

            console.log('处理后的响应数据:', responseData)

            // 处理实际的任务数据
            if ((responseData as any).items && Array.isArray((responseData as any).items)) {
                console.log('找到items数组，长度为:', (responseData as any).items.length)

                // 设置任务列表
                setTasks((responseData as any).items)

                // 更新分页信息
                setPagination({
                    current: (responseData as any).page || 1,
                    pageSize: (responseData as any).size || 10,
                    total: (responseData as any).total || 0
                })

                console.log('已设置任务列表和分页信息:', {
                    tasks: (responseData as any).items,
                    pagination: {
                        current: (responseData as any).page || 1,
                        pageSize: (responseData as any).size || 10,
                        total: (responseData as any).total || 0
                    }
                })
            } else if (Array.isArray(responseData)) {
                // 兼容直接返回数组的情况
                console.log('API直接返回了数组:', responseData)
                setTasks(responseData)
            } else {
                console.warn('API返回格式不符合预期，尝试提取可能的任务数据:', responseData)

                // 尝试从响应中提取任何可能的任务数组
                const possibleTasksArray = Object.values(responseData).find(value =>
                    Array.isArray(value) && value.length > 0 && value[0].name !== undefined
                )

                if (Array.isArray(possibleTasksArray)) {
                    console.log('找到可能的任务数组:', possibleTasksArray)
                    setTasks(possibleTasksArray as Task[])
                } else {
                    console.error('无法从响应中提取任务数据')
                    setTasks([])
                }
            }
        } catch (error) {
            console.error('获取任务列表失败:', error)
            message.error('获取任务列表失败')
            setTasks([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const showCreateModal = () => {
        setCurrentTask(null)
        setModalTitle('创建抢券任务')
        form.resetFields()
        form.setFieldsValue({
            is_active: true,
            priority: 1,
            frequency: 100,
            requests_per_task: 3,
        })
        setIsModalVisible(true)
    }

    const showEditModal = (record: Task) => {
        setCurrentTask(record)
        setModalTitle('编辑抢券任务')

        // 解析时间格式 HH:MM:SS:SSS
        const timeParts = record.execution_time.split(':')
        let hours = 0, minutes = 0, seconds = 0, milliseconds = 0

        if (timeParts.length >= 3) {
            hours = parseInt(timeParts[0])
            minutes = parseInt(timeParts[1])
            seconds = parseInt(timeParts[2])
            if (timeParts.length === 4) {
                milliseconds = parseInt(timeParts[3])
            }
        }

        const executionTime = dayjs().hour(hours).minute(minutes).second(seconds).millisecond(milliseconds)

        form.setFieldsValue({
            name: record.name,
            post_url: record.post_url,
            execution_time: executionTime,
            frequency: record.frequency,
            requests_per_task: record.requests_per_task,
            priority: record.priority,
            is_active: record.is_active,
        })
        setIsModalVisible(true)
    }

    const handleOk = async () => {
        try {
            const values = await form.validateFields()

            // 转换时间格式为 HH:MM:SS:SSS
            const time = values.execution_time
            const executionTime = `${String(time.hour()).padStart(2, '0')}:${String(time.minute()).padStart(2, '0')}:${String(time.second()).padStart(2, '0')}:${String(time.millisecond()).padStart(3, '0')}`

            if (currentTask) {
                // 更新抢券任务
                const params: UpdateTaskParams = {
                    name: values.name,
                    post_url: values.post_url,
                    execution_time: executionTime,
                    frequency: values.frequency,
                    requests_per_task: values.requests_per_task,
                    priority: values.priority,
                    is_active: values.is_active,
                };

                const response = await tasksApi.updateTask(currentTask.id, params);
                console.log('更新任务响应:', response);
                message.success('更新抢券任务成功')
            } else {
                // 创建抢券任务
                const params: CreateTaskParams = {
                    name: values.name,
                    post_url: values.post_url,
                    execution_time: executionTime,
                    frequency: values.frequency,
                    requests_per_task: values.requests_per_task,
                    priority: values.priority,
                    is_active: values.is_active,
                };

                const response = await tasksApi.createTask(params);
                console.log('创建任务响应:', response);
                message.success('创建抢券任务成功')
            }

            setIsModalVisible(false)
            fetchTasks()
        } catch (error) {
            console.error('操作失败:', error)
            message.error('操作失败')
        }
    }

    const handleDelete = (id: number, name: string) => {
        console.log('删除任务按钮被点击，ID:', id, '名称:', name);
        setDeleteId(id);
        setDeleteName(name);
        setDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        if (deleteId === null) return;

        try {
            console.log('执行删除操作，ID:', deleteId);
            const response = await tasksApi.deleteTask(deleteId);
            console.log('删除任务响应:', response);
            message.success('删除抢券任务成功');
            fetchTasks();
        } catch (error) {
            console.error('删除抢券任务失败:', error);
            message.error('删除抢券任务失败，请稍后重试');
        } finally {
            setDeleteConfirmVisible(false);
            setDeleteId(null);
            setDeleteName('');
        }
    };

    const handleToggleStatus = (record: Task) => {
        const newStatus = !record.is_active;
        const action = newStatus ? '启用' : '禁用';

        console.log(`${action}任务按钮被点击，ID:`, record.id, '名称:', record.name);
        setToggleTask(record);
        setToggleAction(action);
        setToggleConfirmVisible(true);
    };

    const confirmToggle = async () => {
        if (toggleTask === null) return;

        const newStatus = !toggleTask.is_active;
        const action = toggleAction;

        try {
            console.log(`执行${action}操作，ID:`, toggleTask.id);
            const params: UpdateTaskStatusParams = {
                is_active: newStatus
            };
            const response = await tasksApi.updateTaskStatus(toggleTask.id, params);
            console.log(`${action}任务响应:`, response);
            message.success(`${action}抢券任务成功`);
            fetchTasks();
        } catch (error) {
            console.error(`${action}抢券任务失败:`, error);
            message.error(`${action}抢券任务失败，请稍后重试`);
        } finally {
            setToggleConfirmVisible(false);
            setToggleTask(null);
            setToggleAction('');
        }
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'URL',
            dataIndex: 'post_url',
            key: 'post_url',
            ellipsis: true,
        },
        {
            title: '执行时间',
            dataIndex: 'execution_time',
            key: 'execution_time',
        },
        {
            title: '频率',
            dataIndex: 'frequency',
            key: 'frequency',
            render: (text: number) => `${text} 次/秒`,
        },
        {
            title: '每任务请求数',
            dataIndex: 'requests_per_task',
            key: 'requests_per_task',
        },
        {
            title: '优先级',
            dataIndex: 'priority',
            key: 'priority',
        },
        {
            title: '状态',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive: boolean) => (
                isActive ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: Task) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => showEditModal(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        type={record.is_active ? 'default' : 'primary'}
                        danger={record.is_active}
                        icon={record.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        size="small"
                        onClick={() => {
                            console.log('点击状态切换按钮');
                            handleToggleStatus(record);
                        }}
                    >
                        {record.is_active ? '禁用' : '启用'}
                    </Button>
                    <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => {
                            console.log('点击删除按钮');
                            handleDelete(record.id, record.name);
                        }}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ]

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showCreateModal}
                >
                    创建抢券任务
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={tasks}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条数据`
                }}
                onChange={(pagination) => {
                    console.log('分页变化:', pagination);
                    setPagination({
                        current: pagination.current || 1,
                        pageSize: pagination.pageSize || 10,
                        total: pagination.total || 0
                    });
                    // 这里可以添加按页获取数据的逻辑
                }}
            />

            <Modal
                title={modalTitle}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label="任务名称"
                        rules={[{ required: true, message: '请输入任务名称' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="post_url"
                        label="请求URL"
                        rules={[
                            { required: true, message: '请输入请求URL' },
                            { type: 'url', message: '请输入有效的URL' }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="execution_time"
                        label="执行时间 (HH:MM:SS.SSS)"
                        rules={[{ required: true, message: '请选择执行时间' }]}
                    >
                        <TimePicker format="HH:mm:ss.SSS" showNow={false} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="frequency"
                        label="频率 (次/秒)"
                        rules={[{ required: true, message: '请输入频率' }]}
                    >
                        <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="requests_per_task"
                        label="每任务请求数"
                        rules={[{ required: true, message: '请输入每任务请求数' }]}
                    >
                        <InputNumber min={1} max={10} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="priority"
                        label="优先级"
                        rules={[{ required: true, message: '请输入优先级' }]}
                        tooltip="数字越小优先级越高"
                    >
                        <InputNumber min={1} max={10} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="is_active"
                        label="启用状态"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />
                        <span>确认删除</span>
                    </div>
                }
                open={deleteConfirmVisible}
                onOk={confirmDelete}
                onCancel={() => setDeleteConfirmVisible(false)}
                okText="确认删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
            >
                <div style={{ padding: '20px 0' }}>
                    <p>您确定要删除以下抢券任务吗？</p>
                    <p style={{ fontWeight: 'bold', margin: '10px 0' }}>{deleteName}</p>
                    <p style={{ color: '#ff4d4f' }}>警告：此操作不可恢复，删除后任务将永久丢失！</p>
                </div>
            </Modal>

            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ExclamationCircleFilled style={{ color: toggleAction === '启用' ? '#52c41a' : '#faad14', marginRight: 8 }} />
                        <span>确认{toggleAction}</span>
                    </div>
                }
                open={toggleConfirmVisible}
                onOk={confirmToggle}
                onCancel={() => setToggleConfirmVisible(false)}
                okText={`确认${toggleAction}`}
                cancelText="取消"
                okButtonProps={{
                    type: 'primary',
                    danger: toggleAction === '禁用',
                    style: toggleAction === '启用' ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}
                }}
            >
                <div style={{ padding: '20px 0' }}>
                    <p>您确定要{toggleAction}以下抢券任务吗？</p>
                    <p style={{ fontWeight: 'bold', margin: '10px 0' }}>{toggleTask?.name}</p>
                    {toggleAction === '启用' ? (
                        <p style={{ color: '#52c41a' }}>启用后，任务将按计划执行。</p>
                    ) : (
                        <p style={{ color: '#faad14' }}>禁用后，任务将暂停执行，但可随时重新启用。</p>
                    )}
                </div>
            </Modal>
        </div>
    )
}

export default TaskList 