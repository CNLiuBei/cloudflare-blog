/**
 * 首页 - 文章列表
 * Design System: Swiss Modernism 2.0
 * Colors: Cyan (#0891B2) + Green (#22C55E)
 * Typography: Inter
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Empty, Pagination } from 'antd';
import { CalendarOutlined, FolderOutlined, TagOutlined, RightOutlined, SearchOutlined, ClockCircleOutlined, EyeOutlined, SortAscendingOutlined, FireOutlined, LikeOutlined, PushpinFilled, BookOutlined } from '@ant-design/icons';
import { articlesApi, categoriesApi, tagsApi } from '../api';
import type { Article, Category, Tag as TagType, PaginatedResponse } from '../api';
import SEO from '../components/SEO';
import PublicLayout from '../components/Layout';

export default function Home() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [articles, setArticles] = useState<PaginatedResponse<Article>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [readingHistory, setReadingHistory] = useState<Array<{id: number; title: string; cover?: string; readAt: string}>>([]);
  const [readProgress, setReadProgress] = useState<Record<number, number>>({});
  const [bookmarks, setBookmarks] = useState<Array<{id: number; title: string; cover?: string}>>([]);

  const page = parseInt(searchParams.get('page') || '1');
  const categoryId = params.id && window.location.pathname.includes('/category/') 
    ? parseInt(params.id) 
    : undefined;
  const tagId = params.id && window.location.pathname.includes('/tag/') 
    ? parseInt(params.id) 
    : undefined;

  useEffect(() => {
    loadData();
    // 加载阅读历史
    const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    setReadingHistory(history);
    // 加载阅读进度
    const progress = JSON.parse(localStorage.getItem('articleReadProgress') || '{}');
    setReadProgress(progress);
    // 加载收藏
    const savedBookmarks = JSON.parse(localStorage.getItem('bookmarkedArticles') || '[]');
    setBookmarks(savedBookmarks);
  }, [page, categoryId, tagId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesRes, categoriesRes, tagsRes] = await Promise.all([
        articlesApi.getList({ page, pageSize: 10, categoryId, tagId }),
        categoriesApi.getAll(),
        tagsApi.getAll(),
      ]);
      setArticles(articlesRes);
      setCategories(categoriesRes);
      setTags(tagsRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 估算阅读时间（中文约 400 字/分钟）
  const getReadingTime = (content: string) => {
    const words = content.length;
    const minutes = Math.ceil(words / 400);
    return `${minutes} 分钟阅读`;
  };

  const currentCategory = categoryId ? categories.find(c => c.id === categoryId) : undefined;
  const currentTag = tagId ? tags.find(t => t.id === tagId) : undefined;

  // 高亮搜索关键词
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
    );
  };

  // 过滤和排序文章
  const filteredArticles = useMemo(() => {
    let result = searchQuery
      ? articles.data.filter(a => 
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : articles.data;
    
    // 排序
    if (sortBy === 'popular') {
      result = [...result].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }
    
    return result;
  }, [articles.data, searchQuery, sortBy]);

  return (
    <PublicLayout>
      <SEO 
        title={currentCategory?.name || currentTag?.name || '首页'}
        description="欢迎访问我的博客"
      />
      
      <div className="home-container">
        {/* 主内容区 */}
        <main className="main-content">
          {/* 页面标题 */}
          <header className="page-header">
            <h1 className="page-title">
              {currentCategory ? `分类: ${currentCategory.name}` : 
               currentTag ? `标签: ${currentTag.name}` : '最新文章'}
            </h1>
            {(currentCategory || currentTag) && (
              <button 
                className="clear-filter-btn"
                onClick={() => navigate('/')}
              >
                清除筛选
              </button>
            )}
          </header>

          {/* 搜索框和排序 */}
          <div className="filter-bar">
            <div className="search-box">
              <SearchOutlined className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="搜索文章..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>
            <div className="sort-buttons">
              <button 
                className={`sort-btn ${sortBy === 'latest' ? 'active' : ''}`}
                onClick={() => setSortBy('latest')}
              >
                <SortAscendingOutlined /> 最新
              </button>
              <button 
                className={`sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
                onClick={() => setSortBy('popular')}
              >
                <FireOutlined /> 热门
              </button>
            </div>
          </div>

          {/* 文章列表 */}
          {loading ? (
            <div className="articles-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="article-card skeleton">
                  <div className="skeleton-cover"></div>
                  <div className="article-content">
                    <div className="skeleton-title"></div>
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                    <div className="skeleton-meta"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <Empty description={searchQuery ? "没有找到匹配的文章" : "暂无文章"} className="empty-state" />
          ) : (
            <div className="articles-grid">
              {filteredArticles.map((article) => (
                <article 
                  key={article.id}
                  className={`article-card ${(article as any).is_pinned ? 'pinned' : ''}`}
                  onClick={() => navigate(`/article/${article.id}`)}
                >
                  {/* 阅读进度条 */}
                  {readProgress[article.id] > 0 && readProgress[article.id] < 100 && (
                    <div className="article-progress">
                      <div 
                        className="article-progress-bar" 
                        style={{ width: `${readProgress[article.id]}%` }}
                      />
                    </div>
                  )}
                  {readProgress[article.id] >= 100 && (
                    <span className="read-complete-badge">已读完</span>
                  )}
                  {(article as any).is_pinned && (
                    <span className="pinned-badge">
                      <PushpinFilled /> 置顶
                    </span>
                  )}
                  {article.cover && (
                    <div className="article-cover">
                      <img
                        src={article.cover}
                          alt={article.title}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="article-content">
                      <h2 className="article-title">{highlightText(article.title, searchQuery)}</h2>
                      <p className="article-excerpt">
                        {highlightText(article.description || article.content.slice(0, 150), searchQuery)}
                      </p>
                      <div className="article-meta">
                        <span className="meta-item">
                          <CalendarOutlined /> {formatDate(article.created_at)}
                        </span>
                        <span className="meta-item">
                          <ClockCircleOutlined /> {getReadingTime(article.content)}
                        </span>
                        <span className="meta-item">
                          <EyeOutlined /> {article.view_count || 0}
                        </span>
                        <span className="meta-item likes">
                          <LikeOutlined /> {article.like_count || 0}
                        </span>
                        {article.category && (
                          <span className="meta-item">
                            <FolderOutlined /> {article.category.name}
                          </span>
                        )}
                      </div>
                      <div className="read-more">
                        阅读全文 <RightOutlined />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

          {/* 分页 */}
          {articles.total > articles.pageSize && (
            <div className="pagination-wrapper">
              <Pagination
                current={articles.page}
                total={articles.total}
                pageSize={articles.pageSize}
                onChange={handlePageChange}
                showSizeChanger={false}
                showTotal={(total) => `共 ${total} 篇文章`}
              />
            </div>
          )}
        </main>

        {/* 侧边栏 */}
        <aside className="sidebar">
          {/* 分类 */}
          <section className="sidebar-section">
            <h3 className="sidebar-title">分类</h3>
            {categories.length === 0 ? (
              <p className="sidebar-empty">暂无分类</p>
            ) : (
              <ul className="category-list">
                {categories.map(cat => (
                  <li 
                    key={cat.id}
                    className={`category-item ${categoryId === cat.id ? 'active' : ''}`}
                    onClick={() => navigate(`/category/${cat.id}`)}
                  >
                    <FolderOutlined />
                    <span>{cat.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 标签 */}
          <section className="sidebar-section">
            <h3 className="sidebar-title">标签</h3>
            {tags.length === 0 ? (
              <p className="sidebar-empty">暂无标签</p>
            ) : (
              <div className="tag-cloud">
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className={`tag-item ${tagId === tag.id ? 'active' : ''}`}
                    onClick={() => navigate(`/tag/${tag.id}`)}
                  >
                    <TagOutlined /> {tag.name}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 最近阅读 */}
          {readingHistory.length > 0 && (
            <section className="sidebar-section">
              <h3 className="sidebar-title">最近阅读</h3>
              <div className="reading-history">
                {readingHistory.slice(0, 5).map(item => (
                  <div 
                    key={item.id}
                    className="history-item"
                    onClick={() => navigate(`/article/${item.id}`)}
                  >
                    {item.cover && (
                      <img src={item.cover} alt="" className="history-cover" />
                    )}
                    <span className="history-title">{item.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 我的收藏 */}
          {bookmarks.length > 0 && (
            <section className="sidebar-section">
              <h3 className="sidebar-title">
                <BookOutlined /> 我的收藏
              </h3>
              <div className="bookmarks-list">
                {bookmarks.slice(0, 5).map(item => (
                  <div 
                    key={item.id}
                    className="bookmark-item"
                    onClick={() => navigate(`/article/${item.id}`)}
                  >
                    {item.cover && (
                      <img src={item.cover} alt="" className="bookmark-cover" />
                    )}
                    <span className="bookmark-title">{item.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </PublicLayout>
  );
}
