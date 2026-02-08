/**
 * 分类管理页面
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect } from 'react';
import { Spin, Modal, Form, Input, Popconfirm, message, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { categoriesApi, articlesApi, ApiError } from '../../api';
import type { Category, CategoryFormData } from '../../api';

export default function AdminCategories() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articleCounts, setArticleCounts] = useState<Record<number, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const [data, articles] = await Promise.all([
        categoriesApi.getAll(),
        articlesApi.getAdminList({ pageSize: 1000 }),
      ]);
      setCategories(data);
      
      // 统计每个分类的文章数
      const counts: Record<number, number> = {};
      articles.data.forEach(article => {
        if (article.category_id) {
          counts[article.category_id] = (counts[article.category_id] || 0) + 1;
        }
      });
      setArticleCounts(counts);
    } catch (error) {
      message.error('加载分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await categoriesApi.delete(id);
      message.success('删除成功');
      loadCategories();
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
      const data: CategoryFormData = values;

      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, data);
        message.success('更新成功');
      } else {
        await categoriesApi.create(data);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadCategories();
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
        <h1 className="admin-page-title">分类管理</h1>
        <button className="btn-primary" onClick={handleAdd}>
          <PlusOutlined /> 新建分类
        </button>
      </header>

      <Spin spinning={loading}>
        {categories.length === 0 && !loading ? (
          <Empty description="暂无分类" />
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>名称</th>
                  <th>别名</th>
                  <th style={{ width: 80 }}>文章数</th>
                  <th>描述</th>
                  <th style={{ width: 120 }}>创建时间</th>
                  <th style={{ width: 140 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.id}>
                    <td className="text-muted">{category.id}</td>
                    <td>
                      <span className="category-name">{category.name}</span>
                    </td>
                    <td className="text-muted">{category.slug}</td>
                    <td>
                      <span className="article-count">
                        <FileTextOutlined /> {articleCounts[category.id] || 0}
                      </span>
                    </td>
                    <td className="text-muted text-ellipsis">
                      {category.description || '-'}
                    </td>
                    <td className="text-muted">
                      {formatDate(category.created_at)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn edit"
                          onClick={() => handleEdit(category)}
                          title="编辑"
                        >
                          <EditOutlined />
                        </button>
                        <Popconfirm
                          title="确定要删除这个分类吗？"
                          description="如果分类下有文章，将无法删除"
                          onConfirm={() => handleDelete(category.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <button className="action-btn delete" title="删除">
                            <DeleteOutlined />
                          </button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Spin>

      <Modal
        title={editingCategory ? '编辑分类' : '新建分类'}
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
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input
              placeholder="分类名称"
              onChange={(e) => {
                if (!editingCategory) {
                  form.setFieldValue('slug', generateSlug(e.target.value));
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label="别名"
            rules={[{ required: true, message: '请输入分类别名' }]}
          >
            <Input placeholder="分类别名（URL 友好）" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="分类描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
