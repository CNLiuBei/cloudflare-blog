/**
 * 文章管理页面
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Popconfirm, message, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, BarChartOutlined, PushpinOutlined, SearchOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { articlesApi, ApiError } from '../../api';
import type { Article, PaginatedResponse } from '../../api';

export default function AdminArticles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [data, setData] = useState<PaginatedResponse<Article>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });

  useEffect(() => {
    loadArticles(1);
  }, []);

  const loadArticles = async (page: number, pageSize = 10) => {
    setLoading(true);
    try {
      const result = await articlesApi.getAdminList({ page, pageSize });
      setData(result);
    } catch (error) {
      message.error('加载文章列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await articlesApi.delete(id);
      message.success('删除成功');
      loadArticles(data.page, data.pageSize);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('删除失败');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === data.data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.data.map(a => a.id));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      await Promise.all(selectedIds.map(id => articlesApi.delete(id)));
      message.success(`成功删除 ${selectedIds.length} 篇文章`);
      setSelectedIds([]);
      loadArticles(data.page, data.pageSize);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      const result = await articlesApi.togglePin(id);
      message.success(result.pinned ? '已置顶' : '已取消置顶');
      loadArticles(data.page, data.pageSize);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDuplicate = async (article: Article) => {
    try {
      const fullArticle = await articlesApi.getAdminById(article.id);
      await articlesApi.create({
        title: `${fullArticle.title} (副本)`,
        content: fullArticle.content,
        cover: fullArticle.cover,
        category_id: fullArticle.category_id,
        description: fullArticle.description,
        keywords: fullArticle.keywords,
        status: 'draft',
        tag_ids: fullArticle.tags?.map(t => t.id),
      });
      message.success('文章已复制为草稿');
      loadArticles(data.page, data.pageSize);
    } catch (error) {
      message.error('复制失败');
    }
  };

  const handleExport = async (article: Article) => {
    try {
      const fullArticle = await articlesApi.getAdminById(article.id);
      const content = `# ${fullArticle.title}\n\n${fullArticle.content}`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fullArticle.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 过滤文章
  const filteredArticles = data.data.filter(a => {
    const matchesSearch = !searchQuery || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1 className="admin-page-title">文章管理</h1>
        <div className="header-actions">
          <div className="admin-search-box">
            <SearchOutlined className="search-icon" />
            <input
              type="text"
              placeholder="搜索文章..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <div className="status-filter">
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              全部
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'published' ? 'active' : ''}`}
              onClick={() => setStatusFilter('published')}
            >
              已发布
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'draft' ? 'active' : ''}`}
              onClick={() => setStatusFilter('draft')}
            >
              草稿
            </button>
          </div>
          {selectedIds.length > 0 && (
            <Popconfirm
              title={`确定要删除选中的 ${selectedIds.length} 篇文章吗？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <button className="btn-danger">
                <DeleteOutlined /> 删除选中 ({selectedIds.length})
              </button>
            </Popconfirm>
          )}
          <button 
            className="btn-primary"
            onClick={() => navigate('/admin/article/new')}
          >
            <PlusOutlined /> 新建文章
          </button>
        </div>
      </header>

      <Spin spinning={loading}>
        {data.data.length === 0 && !loading ? (
          <Empty description="暂无文章" />
        ) : (
          <>
            {/* 桌面端表格 */}
            <div className="admin-table-wrapper desktop-only">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.length === data.data.length && data.data.length > 0}
                        onChange={handleSelectAll}
                        className="table-checkbox"
                      />
                    </th>
                    <th style={{ width: 60 }}>ID</th>
                    <th>标题</th>
                    <th style={{ width: 100 }}>状态</th>
                    <th style={{ width: 80 }}>浏览</th>
                    <th style={{ width: 120 }}>分类</th>
                    <th style={{ width: 120 }}>创建时间</th>
                    <th style={{ width: 180 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map(article => (
                    <tr key={article.id} className={selectedIds.includes(article.id) ? 'selected' : ''}>
                      <td>
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes(article.id)}
                          onChange={() => handleSelect(article.id)}
                          className="table-checkbox"
                        />
                      </td>
                      <td className="text-muted">{article.id}</td>
                      <td>
                        <span className="article-title-cell">{article.title}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${article.status}`}>
                          {article.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </td>
                      <td>
                        <span className="view-count">
                          <BarChartOutlined /> {article.view_count || 0}
                        </span>
                      </td>
                      <td className="text-muted">
                        {article.category?.name || '-'}
                      </td>
                      <td className="text-muted">
                        {formatDate(article.created_at)}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`action-btn pin ${(article as any).is_pinned ? 'active' : ''}`}
                            onClick={() => handleTogglePin(article.id)}
                            title={`${(article as any).is_pinned ? '取消置顶' : '置顶'}`}
                          >
                            <PushpinOutlined />
                          </button>
                          <button
                            className="action-btn view"
                            onClick={() => window.open(`/article/${article.id}`, '_blank')}
                            title="查看"
                          >
                            <EyeOutlined />
                          </button>
                          <button
                            className="action-btn edit"
                            onClick={() => navigate(`/admin/article/${article.id}`)}
                            title="编辑"
                          >
                            <EditOutlined />
                          </button>
                          <button
                            className="action-btn copy"
                            onClick={() => handleDuplicate(article)}
                            title="复制"
                          >
                            <CopyOutlined />
                          </button>
                          <button
                            className="action-btn export"
                            onClick={() => handleExport(article)}
                            title="导出 Markdown"
                          >
                            <DownloadOutlined />
                          </button>
                          <Popconfirm
                            title="确定要删除这篇文章吗？"
                            onConfirm={() => handleDelete(article.id)}
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

            {/* 移动端卡片列表 */}
            <div className="mobile-card-list mobile-only">
              {filteredArticles.map(article => (
                <div key={article.id} className="mobile-card-item">
                  <div className="item-header">
                    <div className="item-title-row">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(article.id)}
                        onChange={() => handleSelect(article.id)}
                        className="table-checkbox"
                      />
                      <span className="item-title">{article.title}</span>
                    </div>
                    <span className={`status-badge ${article.status}`}>
                      {article.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                  <div className="item-meta">
                    <span><BarChartOutlined /> {article.view_count || 0} 浏览</span>
                    <span>{article.category?.name || '未分类'}</span>
                    <span>{formatDate(article.created_at)}</span>
                  </div>
                  <div className="item-actions">
                    <button
                      className={`action-btn pin ${(article as any).is_pinned ? 'active' : ''}`}
                      onClick={() => handleTogglePin(article.id)}
                    >
                      <PushpinOutlined /> {(article as any).is_pinned ? '取消置顶' : '置顶'}
                    </button>
                    <button
                      className="action-btn edit"
                      onClick={() => navigate(`/admin/article/${article.id}`)}
                    >
                      <EditOutlined /> 编辑
                    </button>
                    <Popconfirm
                      title="确定要删除这篇文章吗？"
                      onConfirm={() => handleDelete(article.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <button className="action-btn delete">
                        <DeleteOutlined /> 删除
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Spin>

      {data.total > data.pageSize && (
        <div className="admin-pagination">
          <span className="pagination-info">
            共 {data.total} 篇文章，第 {data.page} / {Math.ceil(data.total / data.pageSize)} 页
          </span>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              disabled={data.page <= 1}
              onClick={() => loadArticles(data.page - 1, data.pageSize)}
            >
              上一页
            </button>
            <button
              className="pagination-btn"
              disabled={data.page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => loadArticles(data.page + 1, data.pageSize)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
