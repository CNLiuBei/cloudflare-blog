/**
 * 文章详情页
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { CalendarOutlined, FolderOutlined, TagOutlined, ArrowLeftOutlined, EditOutlined, ClockCircleOutlined, UnorderedListOutlined, EyeOutlined, ShareAltOutlined, CopyOutlined, CheckOutlined, LikeOutlined, LikeFilled, FileTextOutlined, PrinterOutlined, MessageOutlined, UserOutlined, DeleteOutlined, BookOutlined, BookFilled, ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { articlesApi, ApiError, isAuthenticated } from '../api';
import type { Article } from '../api';
import SEO from '../components/SEO';
import PublicLayout from '../components/Layout';
import NotFound from './NotFound';
import 'highlight.js/styles/github-dark.css';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  replyTo?: string;
  replyToAuthor?: string;
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [showToc, setShowToc] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showWechatQR, setShowWechatQR] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [showComments, setShowComments] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('articleFontSize') || '16');
  });
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [replyTo, setReplyTo] = useState<{id: string; author: string} | null>(null);

  useEffect(() => {
    if (id) {
      loadArticle(parseInt(id));
      loadComments(id);
    }
  }, [id]);

  const loadComments = (articleId: string) => {
    const stored = localStorage.getItem(`comments_${articleId}`);
    if (stored) {
      setComments(JSON.parse(stored));
    }
  };

  const saveComment = () => {
    if (!commentAuthor.trim() || !commentContent.trim() || !id) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      author: commentAuthor.trim(),
      content: commentContent.trim(),
      createdAt: new Date().toISOString(),
      replyTo: replyTo?.id,
      replyToAuthor: replyTo?.author,
    };
    
    const updated = [newComment, ...comments];
    setComments(updated);
    localStorage.setItem(`comments_${id}`, JSON.stringify(updated));
    setCommentContent('');
    setReplyTo(null);
    // 保存作者名以便下次使用
    localStorage.setItem('commentAuthor', commentAuthor);
  };

  const handleReply = (comment: Comment) => {
    setReplyTo({ id: comment.id, author: comment.author });
    // 滚动到评论框
    document.querySelector('.comment-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const deleteComment = (commentId: string) => {
    if (!id) return;
    const updated = comments.filter(c => c.id !== commentId);
    setComments(updated);
    localStorage.setItem(`comments_${id}`, JSON.stringify(updated));
  };

  // 加载保存的作者名
  useEffect(() => {
    const savedAuthor = localStorage.getItem('commentAuthor');
    if (savedAuthor) setCommentAuthor(savedAuthor);
  }, []);

  // 监听滚动，高亮当前标题
  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3');
      let current = '';
      
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) {
          current = heading.id;
        }
      });
      
      setActiveHeading(current);

      // Calculate reading progress
      const articleBody = document.querySelector('.article-body');
      if (articleBody) {
        const rect = articleBody.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const articleTop = rect.top;
        const articleHeight = rect.height;
        
        if (articleTop >= windowHeight) {
          setReadingProgress(0);
        } else if (articleTop + articleHeight <= 0) {
          setReadingProgress(100);
        } else {
          const progressValue = Math.min(100, Math.max(0, 
            ((windowHeight - articleTop) / (articleHeight + windowHeight)) * 100
          ));
          setReadingProgress(Math.round(progressValue));
          
          // 保存阅读进度到 localStorage
          if (id) {
            const progressData = JSON.parse(localStorage.getItem('articleReadProgress') || '{}');
            progressData[id] = Math.round(progressValue);
            localStorage.setItem('articleReadProgress', JSON.stringify(progressData));
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape - 退出专注模式或返回首页
      if (e.key === 'Escape') {
        if (focusMode) {
          setFocusMode(false);
        } else {
          navigate('/');
        }
      }
      // L - 点赞
      if (e.key === 'l' && article) {
        handleLike();
      }
      // T - 切换目录
      if (e.key === 't' && toc.length > 0) {
        setShowToc(prev => !prev);
      }
      // F - 专注模式
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        setFocusMode(prev => !prev);
      }
      // ? - 显示快捷键帮助
      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, liked, article, focusMode]);

  // 添加代码复制按钮
  useEffect(() => {
    if (!article) return;
    
    const codeBlocks = document.querySelectorAll('.markdown-body pre');
    codeBlocks.forEach((block) => {
      if (block.querySelector('.copy-code-btn')) return;
      
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = 'Copy';
      btn.onclick = async () => {
        const code = block.querySelector('code')?.textContent || '';
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      };
      block.appendChild(btn);
    });
  }, [article]);

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await articlesApi.getById(articleId);
      setArticle(data);
      setLikeCount(data.like_count || 0);
      // Check if user already liked (stored in localStorage)
      const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      setLiked(likedArticles.includes(articleId));
      
      // Check if bookmarked
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedArticles') || '[]');
      setBookmarked(bookmarks.some((b: {id: number}) => b.id === articleId));
      
      // 保存阅读历史
      saveReadingHistory(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true);
      }
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存阅读历史
  const saveReadingHistory = (article: Article) => {
    const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    const filtered = history.filter((h: { id: number }) => h.id !== article.id);
    const newHistory = [
      { 
        id: article.id, 
        title: article.title, 
        cover: article.cover,
        readAt: new Date().toISOString() 
      },
      ...filtered
    ].slice(0, 10); // 只保留最近10条
    localStorage.setItem('readingHistory', JSON.stringify(newHistory));
  };

  // 从 Markdown 内容提取目录
  const toc = useMemo<TocItem[]>(() => {
    if (!article) return [];
    
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    
    while ((match = headingRegex.exec(article.content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '');
      
      items.push({ id, text, level });
    }
    
    return items;
  }, [article]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getReadingTime = (content: string) => {
    const words = content.length;
    const minutes = Math.ceil(words / 400);
    return minutes;
  };

  const getReadingTimeText = (content: string) => {
    const minutes = getReadingTime(content);
    return `${minutes} 分钟阅读`;
  };

  const getEstimatedFinishTime = (content: string, progress: number) => {
    const totalMinutes = getReadingTime(content);
    const remainingMinutes = Math.ceil(totalMinutes * (100 - progress) / 100);
    if (remainingMinutes <= 0) return '已读完';
    if (remainingMinutes === 1) return '约 1 分钟读完';
    return `约 ${remainingMinutes} 分钟读完`;
  };

  const getWordCount = (content: string) => {
    // Remove markdown syntax for accurate count
    const plainText = content
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/`[^`]*`/g, '') // inline code
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
      .replace(/[#*_~>\-|]/g, '') // markdown symbols
      .replace(/\s+/g, '');
    return plainText.length;
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = (platform: string) => {
    const title = article?.title || '';
    
    if (platform === 'wechat') {
      setShowWechatQR(true);
      setShowShareMenu(false);
      return;
    }
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
      weibo: `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`推荐阅读：${title}\n\n${shareUrl}`)}`,
    };
    
    if (urls[platform]) {
      if (platform === 'email') {
        window.location.href = urls[platform];
      } else {
        window.open(urls[platform], '_blank', 'width=600,height=400');
      }
    }
    setShowShareMenu(false);
  };

  const handleLike = async () => {
    if (!article) return;
    
    try {
      const action = liked ? 'unlike' : 'like';
      const result = await articlesApi.like(article.id, action);
      setLikeCount(result.like_count);
      setLiked(result.liked);
      
      // Update localStorage
      const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      if (result.liked) {
        if (!likedArticles.includes(article.id)) {
          likedArticles.push(article.id);
        }
      } else {
        const index = likedArticles.indexOf(article.id);
        if (index > -1) {
          likedArticles.splice(index, 1);
        }
      }
      localStorage.setItem('likedArticles', JSON.stringify(likedArticles));
    } catch (error) {
      console.error('Failed to like article:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleBookmark = () => {
    if (!article) return;
    
    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedArticles') || '[]');
    
    if (bookmarked) {
      const updated = bookmarks.filter((b: {id: number}) => b.id !== article.id);
      localStorage.setItem('bookmarkedArticles', JSON.stringify(updated));
      setBookmarked(false);
    } else {
      const newBookmark = {
        id: article.id,
        title: article.title,
        cover: article.cover,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('bookmarkedArticles', JSON.stringify([newBookmark, ...bookmarks]));
      setBookmarked(true);
    }
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.min(24, Math.max(12, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem('articleFontSize', String(newSize));
  };

  if (notFound) {
    return <NotFound />;
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="loading-container">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return <NotFound />;
  }

  return (
    <PublicLayout>
      <SEO
        title={article.title}
        description={article.description || article.content.slice(0, 160)}
        keywords={article.keywords}
        image={article.cover}
      />
      
      <div className={`article-layout ${focusMode ? 'focus-mode' : ''}`}>
        <article className="article-page">
          {/* 导航按钮 */}
          <div className={`article-nav ${focusMode ? 'focus-mode-nav' : ''}`}>
            <button className="back-btn" onClick={() => focusMode ? setFocusMode(false) : navigate('/')}>
              <ArrowLeftOutlined /> {focusMode ? '退出专注' : '返回首页'}
            </button>
            <div className="article-nav-right">
              {/* 字体大小调节 */}
              <div className="font-size-control">
                <button onClick={() => changeFontSize(-2)} title="减小字体">A-</button>
                <span className="font-size-value">{fontSize}</span>
                <button onClick={() => changeFontSize(2)} title="增大字体">A+</button>
              </div>
              <button 
                className={`focus-btn ${focusMode ? 'active' : ''}`}
                onClick={() => setFocusMode(!focusMode)}
                title={focusMode ? '退出专注模式' : '专注模式'}
              >
                {focusMode ? <CompressOutlined /> : <ExpandOutlined />}
              </button>
              <button 
                className="print-btn"
                onClick={handlePrint}
                title="打印文章"
              >
                <PrinterOutlined />
              </button>
              {toc.length > 0 && !focusMode && (
                <button 
                  className={`toc-toggle ${showToc ? 'active' : ''}`}
                  onClick={() => setShowToc(!showToc)}
                >
                  <UnorderedListOutlined /> 目录
                </button>
              )}
              {isAuthenticated() && !focusMode && (
                <button 
                  className="edit-btn" 
                  onClick={() => navigate(`/admin/article/${article.id}`)}
                >
                  <EditOutlined /> 编辑
                </button>
              )}
            </div>
          </div>

          {/* 封面图 */}
          {article.cover && (
            <img
              src={article.cover}
              alt={article.title}
              className="article-hero-image"
            />
          )}

          {/* 文章标题 */}
          <h1 className="article-page-title">{article.title}</h1>

          {/* 元信息 */}
          <div className="article-page-meta">
            <span className="meta-item">
              <CalendarOutlined /> {formatDate(article.created_at)}
            </span>
            <span className="meta-item">
              <ClockCircleOutlined /> {getReadingTimeText(article.content)}
            </span>
            <span className="meta-item estimated-time">
              {getEstimatedFinishTime(article.content, readingProgress)}
            </span>
            <span className="meta-item">
              <FileTextOutlined /> {getWordCount(article.content).toLocaleString()} 字
            </span>
            <span className="meta-item">
              <EyeOutlined /> {article.view_count || 0} 次阅读
            </span>
            {article.category && (
              <span 
                className="meta-item clickable"
                onClick={() => navigate(`/category/${article.category!.id}`)}
              >
                <FolderOutlined /> {article.category.name}
              </span>
            )}
          </div>

          {/* 标签 */}
          {article.tags && article.tags.length > 0 && (
            <div className="article-tags">
              {article.tags.map(tag => (
                <span
                  key={tag.id}
                  className="tag-item"
                  onClick={() => navigate(`/tag/${tag.id}`)}
                >
                  <TagOutlined /> {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 文章内容 */}
          <div className="article-body" style={{ fontSize: `${fontSize}px` }}>
            <ReactMarkdown
              className="markdown-body"
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeSlug]}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          {/* 文章底部 */}
          <footer className="article-footer">
            <p>最后更新于 {formatDate(article.updated_at)}</p>
            
            {/* 分享和点赞按钮 */}
            <div className="share-section">
              {/* 点赞按钮 */}
              <button 
                className={`like-btn ${liked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                {liked ? <LikeFilled /> : <LikeOutlined />}
                <span>{likeCount}</span>
              </button>

              {/* 收藏按钮 */}
              <button 
                className={`bookmark-btn ${bookmarked ? 'bookmarked' : ''}`}
                onClick={toggleBookmark}
              >
                {bookmarked ? <BookFilled /> : <BookOutlined />}
                <span>{bookmarked ? '已收藏' : '收藏'}</span>
              </button>
              
              <div className="share-wrapper">
                <button 
                  className="share-btn"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                >
                  <ShareAltOutlined /> 分享文章
                </button>
                {showShareMenu && (
                  <div className="share-menu">
                    <button onClick={() => handleShare('twitter')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter
                    </button>
                    <button onClick={() => handleShare('weibo')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.194.573zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.579-.18-.405-.649.381-1.017.422-1.896-.001-2.521-.791-1.163-2.924-1.095-5.326-.033 0 0-.765.335-.569-.272.375-1.217.32-2.237-.266-2.823-1.331-1.33-4.869.047-7.903 3.077C1.655 10.358.5 12.407.5 14.188c0 3.405 4.365 5.479 8.631 5.479 5.582 0 9.294-3.24 9.294-5.812 0-1.555-1.311-2.438-2.366-2.206zm2.539-2.116c-.156-.376-.479-.583-.717-.461-.238.121-.308.483-.156.857.152.375.479.583.717.461.238-.121.308-.483.156-.857zm1.132-1.62c-.156-.376-.479-.583-.717-.461-.238.121-.308.483-.156.857.152.375.479.583.717.461.238-.121.308-.483.156-.857z"/>
                      </svg>
                      微博
                    </button>
                    <button onClick={() => handleShare('wechat')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                      </svg>
                      微信
                    </button>
                    <button onClick={() => handleShare('telegram')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Telegram
                    </button>
                    <button onClick={() => handleShare('email')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                      邮件
                    </button>
                    <button onClick={() => handleShare('linkedin')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </button>
                    <button onClick={handleCopyLink}>
                      {copied ? <CheckOutlined /> : <CopyOutlined />}
                      {copied ? '已复制' : '复制链接'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </footer>

          {/* 相关文章 */}
          {article.relatedArticles && article.relatedArticles.length > 0 && (
            <section className="related-articles">
              <h3 className="related-title">相关文章</h3>
              <div className="related-grid">
                {article.relatedArticles.map(related => (
                  <article 
                    key={related.id}
                    className="related-card"
                    onClick={() => navigate(`/article/${related.id}`)}
                  >
                    {related.cover && (
                      <img src={related.cover} alt={related.title} className="related-cover" />
                    )}
                    <div className="related-content">
                      <h4 className="related-card-title">{related.title}</h4>
                      <div className="related-meta">
                        <span><EyeOutlined /> {related.view_count || 0}</span>
                        <span><CalendarOutlined /> {formatDate(related.created_at)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* 评论区 */}
          <section className="comments-section">
            <div className="comments-header">
              <h3 className="comments-title">
                <MessageOutlined /> 评论 ({comments.length})
              </h3>
              <button 
                className="comments-toggle"
                onClick={() => setShowComments(!showComments)}
              >
                {showComments ? '收起' : '展开'}
              </button>
            </div>
            
            {showComments && (
              <>
                {/* 评论表单 */}
                <div className="comment-form">
                  {replyTo && (
                    <div className="reply-indicator">
                      <span>回复 @{replyTo.author}</span>
                      <button onClick={cancelReply} className="cancel-reply">取消</button>
                    </div>
                  )}
                  <div className="comment-form-row">
                    <div className="comment-avatar">
                      <UserOutlined />
                    </div>
                    <input
                      type="text"
                      className="comment-author-input"
                      placeholder="你的昵称"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <textarea
                    className="comment-content-input"
                    placeholder={replyTo ? `回复 @${replyTo.author}...` : "写下你的评论..."}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="comment-form-footer">
                    <span className="comment-char-count">{commentContent.length}/500</span>
                    <button 
                      className="comment-submit-btn"
                      onClick={saveComment}
                      disabled={!commentAuthor.trim() || !commentContent.trim()}
                    >
                      {replyTo ? '回复' : '发表评论'}
                    </button>
                  </div>
                </div>

                {/* 评论列表 */}
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="no-comments">暂无评论，来抢沙发吧！</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-avatar">
                          <UserOutlined />
                        </div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{comment.author}</span>
                            {comment.replyToAuthor && (
                              <span className="comment-reply-to">回复 @{comment.replyToAuthor}</span>
                            )}
                            <span className="comment-time">
                              {new Date(comment.createdAt).toLocaleString('zh-CN')}
                            </span>
                            <button 
                              className="comment-reply-btn"
                              onClick={() => handleReply(comment)}
                              title="回复"
                            >
                              回复
                            </button>
                            <button 
                              className="comment-delete"
                              onClick={() => deleteComment(comment.id)}
                              title="删除评论"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                          <p className="comment-text">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </section>
        </article>

        {/* 侧边目录 */}
        {toc.length > 0 && (
          <aside className={`article-toc ${showToc ? 'show' : ''} ${tocCollapsed ? 'collapsed' : ''}`}>
            <div className="toc-header" onClick={() => setTocCollapsed(!tocCollapsed)}>
              <span>
                <UnorderedListOutlined /> 目录
              </span>
              <span className="toc-header-right">
                <span className="reading-progress-badge">{readingProgress}%</span>
                <span className="toc-collapse-icon">{tocCollapsed ? '▼' : '▲'}</span>
              </span>
            </div>
            {!tocCollapsed && (
              <nav className="toc-nav">
                {toc.map((item, index) => (
                  <button
                    key={index}
                    className={`toc-item level-${item.level} ${activeHeading === item.id ? 'active' : ''}`}
                    onClick={() => scrollToHeading(item.id)}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            )}
          </aside>
        )}

        {/* 快捷键帮助按钮 */}
        <button 
          className="shortcuts-help-btn"
          onClick={() => setShowShortcuts(true)}
          title="快捷键帮助 (?)"
        >
          ?
        </button>

        {/* 快捷键帮助浮窗 */}
        {showShortcuts && (
          <div className="shortcuts-modal" onClick={() => setShowShortcuts(false)}>
            <div className="shortcuts-content" onClick={e => e.stopPropagation()}>
              <h3>键盘快捷键</h3>
              <div className="shortcuts-list">
                <div className="shortcut-item">
                  <kbd>Esc</kbd>
                  <span>退出专注模式/返回首页</span>
                </div>
                <div className="shortcut-item">
                  <kbd>L</kbd>
                  <span>点赞/取消点赞</span>
                </div>
                <div className="shortcut-item">
                  <kbd>T</kbd>
                  <span>切换目录</span>
                </div>
                <div className="shortcut-item">
                  <kbd>F</kbd>
                  <span>专注模式</span>
                </div>
                <div className="shortcut-item">
                  <kbd>?</kbd>
                  <span>显示/隐藏帮助</span>
                </div>
              </div>
              <button className="shortcuts-close" onClick={() => setShowShortcuts(false)}>
                关闭
              </button>
            </div>
          </div>
        )}

        {/* 微信分享二维码 */}
        {showWechatQR && (
          <div className="shortcuts-modal" onClick={() => setShowWechatQR(false)}>
            <div className="wechat-qr-content" onClick={e => e.stopPropagation()}>
              <h3>微信扫码分享</h3>
              <div className="qr-placeholder">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                  alt="微信分享二维码"
                />
              </div>
              <p className="qr-tip">打开微信扫一扫，分享给好友</p>
              <button className="shortcuts-close" onClick={() => setShowWechatQR(false)}>
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
