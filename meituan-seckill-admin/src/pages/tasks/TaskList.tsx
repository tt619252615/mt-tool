import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Switch, TimePicker, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import * as tasksApi from '../../api/tasks'
import type { Task as ApiTask, CreateTaskParams as ApiCreateTaskParams, UpdateTaskParams as ApiUpdateTaskParams } from '../../api/tasks'
import dayjs from 'dayjs'

// 本地接口与后端API接口映射的适配层
interface Task {
    id: number
    name: string
    post_url: string
    execution_time: string  // 格式: HH:MM:SS:SSS
    frequency: number
    requests_per_task: number
    priority: number
    is_active: boolean
    created_at: string
    updated_at: string
}

// 将API返回的任务数据转换为本地格式
const convertApiTaskToLocal = (apiTask: ApiTask): Task => {
    return {
        id: apiTask.id,
        name: apiTask.title,
        post_url: apiTask.seckill_url,
        execution_time: apiTask.cron_expression || '00:00:00:000', // 使用cron表达式或默认值
        frequency: apiTask.max_tries || 100,
        requests_per_task: apiTask.current_tries || 3,
        priority: apiTask.api_key_id || 1,
        is_active: apiTask.status === 'running',
        created_at: apiTask.created_at,
        updated_at: apiTask.updated_at
    };
};

// 将本地任务参数转换为API格式
const convertLocalToApiCreateParams = (localParams: any): ApiCreateTaskParams => {
    return {
        title: localParams.name,
        description: `Auto-generated from UI: ${localParams.name}`,
        api_key_id: localParams.priority || 1,
        cron_expression: localParams.execution_time,
        max_tries: localParams.frequency || 100,
        seckill_url: localParams.post_url
    };
};

// 将本地任务更新参数转换为API格式
const convertLocalToApiUpdateParams = (localParams: any): ApiUpdateTaskParams => {
    return {
        title: localParams.name,
        description: `Updated from UI: ${localParams.name}`,
        api_key_id: localParams.priority,
        cron_expression: localParams.execution_time,
        max_tries: localParams.frequency,
        seckill_url: localParams.post_url
    };
};

interface CreateTaskParams {
    name: string
    post_url: string
    execution_time: string  // 格式: HH:MM:SS:SSS
    frequency: number
    requests_per_task: number
    priority: number
    is_active: boolean
}

interface UpdateTaskParams {
    name?: string
    post_url?: string
    execution_time?: string
    frequency?: number
    requests_per_task?: number
    priority?: number
}

interface UpdateTaskStatusParams {
    is_active: boolean
}

const TaskList = () => {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [form] = Form.useForm()
    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [modalTitle, setModalTitle] = useState('创建抢券任务')

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const res = await tasksApi.getTaskList()
            if (res && res.data && Array.isArray(res.data.items)) {
                // 将API返回的任务数据转换为本地格式
                const localTasks = res.data.items.map(convertApiTaskToLocal);
                setTasks(localTasks)
            } else {
                console.warn('API返回格式不符合预期:', res);
                setTasks([]);
            }
        } catch (error) {
            console.error('获取任务列表失败:', error)
            message.error('获取任务列表失败')
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
                const localParams = {
                    name: values.name,
                    post_url: values.post_url,
                    execution_time: executionTime,
                    frequency: values.frequency,
                    requests_per_task: values.requests_per_task,
                    priority: values.priority,
                };

                // 转换为API格式
                const apiParams = convertLocalToApiUpdateParams(localParams);
                await tasksApi.updateTask(currentTask.id, apiParams);
                message.success('更新抢券任务成功')
            } else {
                // 创建抢券任务
                const localParams: CreateTaskParams = {
                    name: values.name,
                    post_url: values.post_url,
                    execution_time: executionTime,
                    frequency: values.frequency,
                    requests_per_task: values.requests_per_task,
                    priority: values.priority,
                    is_active: values.is_active,
                };

                // 转换为API格式
                const apiParams = convertLocalToApiCreateParams(localParams);
                await tasksApi.createTask(apiParams);
                message.success('创建抢券任务成功')
            }

            setIsModalVisible(false)
            fetchTasks()
        } catch (error) {
            console.error('操作失败:', error)
            message.error('操作失败')
        }
    }

    const handleDelete = (id: number) => {
        console.log('删除任务按钮被点击，ID:', id);

        // 使用原生confirm，避免antd Modal可能的问题
        if (window.confirm('确定要删除这个抢券任务吗？此操作不可恢复。')) {
            console.log('用户确认删除');
            try {
                // 使用立即执行的异步函数
                (async () => {
                    try {
                        console.log('执行删除操作，ID:', id);
                        const response = await tasksApi.deleteTask(id);
                        console.log('删除任务响应:', response);
                        message.success('删除抢券任务成功');
                        fetchTasks();
                    } catch (error) {
                        console.error('删除抢券任务失败:', error);
                        message.error('删除抢券任务失败，请稍后重试');
                    }
                })();
            } catch (error) {
                console.error('执行删除时出错:', error);
            }
        } else {
            console.log('用户取消删除');
        }
    };

    const handleToggleStatus = (record: Task) => {
        const newStatus = !record.is_active;
        const action = newStatus ? '启用' : '禁用';

        console.log(`${action}任务按钮被点击，ID:`, record.id, '当前状态:', record.is_active, '新状态:', newStatus);

        // 使用原生confirm，避免antd Modal可能的问题
        if (window.confirm(`确定要${action}这个抢券任务吗？`)) {
            console.log(`用户确认${action}`);
            try {
                // 使用立即执行的异步函数
                (async () => {
                    try {
                        console.log(`执行${action}操作，ID:`, record.id);
                        const status = newStatus ? 'running' : 'paused';
                        const response = await tasksApi.updateTaskStatus(record.id, status);
                        console.log(`${action}任务响应:`, response);
                        message.success(`${action}抢券任务成功`);
                        fetchTasks();
                    } catch (error) {
                        console.error(`${action}抢券任务失败:`, error);
                        message.error(`${action}抢券任务失败，请稍后重试`);
                    }
                })();
            } catch (error) {
                console.error(`执行${action}时出错:`, error);
            }
        } else {
            console.log(`用户取消${action}`);
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
                            handleDelete(record.id);
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
                pagination={{ pageSize: 10 }}
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
        </div>
    )
}

export default TaskList 