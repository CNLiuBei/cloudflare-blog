/**
 * 标签管理页面
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect } from 'react';
import { Spin, Modal, Form, Input, Popconfirm, message, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, TagOutlined } from '@ant-design/icons';
import { tagsApi, ApiError } from '../../api';
import type { Tag, TagFormData } from '../../api';

export default function AdminTags() {
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } catch (error) {
      message.error('加载标签列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await tagsApi.delete(id);
      message.success('删除成功');
      loadTags();
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('删除失败');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: TagFormData = values;

      await tagsApi.create(data);
      message.success('创建成功');

      setModalVisible(false);
      loadTags();
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      }
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]/g, '');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1 className="admin-page-title">标签管理</h1>
        <button className="btn-primary" onClick={handleAdd}>
          <PlusOutlined /> 新建标签
        </button>
      </header>

      <Spin spinning={loading}>
        {tags.length === 0 && !loading ? (
          <Empty description="暂无标签" />
        ) : (
          <div className="tags-grid">
            {tags.map(tag => (
              <div key={tag.id} className="tag-card">
                <div className="tag-card-header">
                  <TagOutlined className="tag-icon" />
                  <span className="tag-name">{tag.name}</span>
                </div>
                <div className="tag-card-meta">
                  <span className="tag-slug">{tag.slug}</span>
                  <span className="tag-date">{formatDate(tag.created_at)}</span>
                </div>
                <div className="tag-card-actions">
                  <Popconfirm
                    title="确定要删除这个标签吗？"
                    description="删除后，文章中的该标签关联也会被移除"
                    onConfirm={() => handleDelete(tag.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <button className="action-btn delete" title="删除">
                      <DeleteOutlined /> 删除
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>

      <Modal
        title="新建标签"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input
              placeholder="标签名称"
              onChange={(e) => {
                form.setFieldValue('slug', generateSlug(e.target.value));
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label="别名"
            rules={[{ required: true, message: '请输入标签别名' }]}
          >
            <Input placeholder="标签别名（URL 友好）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
