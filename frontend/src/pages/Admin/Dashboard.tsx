/**
 * 管理后台仪表盘
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileTextOutlined, 
  FolderOutlined, 
  TagsOutlined, 
  EyeOutlined,
  LikeOutlined,
  RiseOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { articlesApi, categoriesApi, tagsApi } from '../../api';
import type { Article } from '../../api';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  totalTags: number;
  totalViews: number;
  totalLikes: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalCategories: 0,
    totalTags: 0,
    totalViews: 0,
    totalLikes: 0,
  });
  const [topArticles, setTopArticles] = useState<Article[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [categoryStats, setCategoryStats] = useState<{name: string; count: number}[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [articles, categories, tags] = await Promise.all([
        articlesApi.getAdminList({ pageSize: 100 }),
        categoriesApi.getAll(),
        tagsApi.getAll(),
      ]);

      const published = articles.data.filter(a => a.status === 'published');
      const drafts = articles.data.filter(a => a.status === 'draft');
      const totalViews = articles.data.reduce((sum, a) => sum + (a.view_count || 0), 0);
      const totalLikes = articles.data.reduce((sum, a) => sum + (a.like_count || 0), 0);

      setStats({
        totalArticles: articles.total,
        publishedArticles: published.length,
        draftArticles: drafts.length,
        totalCategories: categories.length,
        totalTags: tags.length,
        totalViews,
        totalLikes,
      });

      // Top 5 articles by views
      const sorted = [...articles.data].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
      setTopArticles(sorted.slice(0, 5));

      // Category statistics
      const catStats: Record<string, number> = {};
      articles.data.forEach(a => {
        const catName = a.category?.name || '未分类';
        catStats[catName] = (catStats[catName] || 0) + 1;
      });
      setCategoryStats(
        Object.entries(catStats)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      // Recent 5 articles by date
      const recent = [...articles.data].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentArticles(recent.slice(0, 5));
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: '文章总数', value: stats.totalArticles, icon: <FileTextOutlined />, color: '#0891B2' },
    { label: '已发布', value: stats.publishedArticles, icon: <RiseOutlined />, color: '#22C55E' },
    { label: '草稿', value: stats.draftArticles, icon: <FileTextOutlined />, color: '#F59E0B' },
    { label: '分类', value: stats.totalCategories, icon: <FolderOutlined />, color: '#8B5CF6' },
    { label: '标签', value: stats.totalTags, icon: <TagsOutlined />, color: '#EC4899' },
    { label: '总浏览', value: stats.totalViews, icon: <EyeOutlined />, color: '#06B6D4' },
    { label: '总点赞', value: stats.totalLikes, icon: <LikeOutlined />, color: '#EF4444' },
  ];

  return (
    <div className="admin-page dashboard-page">
      <header className="admin-page-header">
        <h1 className="admin-page-title">数据概览</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate('/admin/article/new')}>
            <PlusOutlined /> 新建文章
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderTopColor: card.color }}>
            <div className="stat-icon" style={{ color: card.color, background: `${card.color}15` }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <span className="stat-value">{card.value.toLocaleString()}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Articles */}
      <section className="dashboard-section">
        <h2 className="section-title">热门文章</h2>
        <div className="top-articles">
          {topArticles.map((article, index) => (
            <div 
              key={article.id} 
              className="top-article-item"
              onClick={() => navigate(`/admin/article/${article.id}`)}
            >
              <span className="rank">#{index + 1}</span>
              <span className="title">{article.title}</span>
              <span className="views"><EyeOutlined /> {article.view_count || 0}</span>
              <span className="likes"><LikeOutlined /> {article.like_count || 0}</span>
            </div>
          ))}
          {topArticles.length === 0 && !loading && (
            <p className="no-data">暂无文章</p>
          )}
        </div>
      </section>

      {/* Category Distribution */}
      <section className="dashboard-section">
        <h2 className="section-title">分类分布</h2>
        <div className="category-chart">
          {categoryStats.map((cat, index) => {
            const maxCount = Math.max(...categoryStats.map(c => c.count));
            const percentage = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
            return (
              <div key={cat.name} className="chart-bar-item">
                <span className="chart-label">{cat.name}</span>
                <div className="chart-bar-wrapper">
                  <div 
                    className="chart-bar" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: ['#0891B2', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'][index % 5]
                    }}
                  />
                </div>
                <span className="chart-value">{cat.count}</span>
              </div>
            );
          })}
          {categoryStats.length === 0 && !loading && (
            <p className="no-data">暂无数据</p>
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="dashboard-section">
        <h2 className="section-title">最近动态</h2>
        <div className="activity-timeline">
          {recentArticles.map((article) => (
            <div 
              key={article.id} 
              className="activity-item"
              onClick={() => navigate(`/admin/article/${article.id}`)}
            >
              <div className="activity-icon">
                <FileTextOutlined />
              </div>
              <div className="activity-content">
                <span className="activity-title">{article.title}</span>
                <span className="activity-meta">
                  <ClockCircleOutlined /> {new Date(article.created_at).toLocaleDateString('zh-CN')}
                  <span className={`status-dot ${article.status}`}></span>
                  {article.status === 'published' ? '已发布' : '草稿'}
                </span>
              </div>
            </div>
          ))}
          {recentArticles.length === 0 && !loading && (
            <p className="no-data">暂无动态</p>
          )}
        </div>
      </section>

      {/* 快速操作浮动按钮 */}
      <div className={`quick-actions-fab ${showQuickActions ? 'open' : ''}`}>
        <button 
          className="fab-main"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          {showQuickActions ? '×' : <SettingOutlined />}
        </button>
        {showQuickActions && (
          <div className="fab-menu">
            <button onClick={() => navigate('/admin/article/new')} title="新建文章">
              <FileTextOutlined />
            </button>
            <button onClick={() => navigate('/admin/categories')} title="管理分类">
              <FolderOutlined />
            </button>
            <button onClick={() => navigate('/admin/tags')} title="管理标签">
              <TagsOutlined />
            </button>
            <button onClick={() => navigate('/')} title="查看前台">
              <EyeOutlined />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
