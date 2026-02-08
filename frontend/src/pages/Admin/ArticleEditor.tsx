/**
 * 文章编辑器页面 - 单页布局
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, message, Spin } from 'antd';
import { SaveOutlined, SendOutlined, EyeOutlined, ArrowLeftOutlined, CloudOutlined, FullscreenOutlined, FullscreenExitOutlined, HistoryOutlined, CloseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { articlesApi, categoriesApi, tagsApi, ApiError } from '../../api';
import type { ArticleFormData, Category, Tag } from '../../api';
import 'highlight.js/styles/github-dark.css';

const { TextArea } = Input;

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [coverUrl, setCoverUrl] = useState<string>();
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [versionHistory, setVersionHistory] = useState<{time: string; content: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');
  
  // 分类和标签选择状态
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const isEdit = id && id !== 'new';
  const DRAFT_KEY = `article_draft_${id || 'new'}`;

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadArticle(parseInt(id));
    } else {
      loadLocalDraft();
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [id]);

  const saveToLocal = useCallback(() => {
    const values = form.getFieldsValue();
    const content = JSON.stringify({ 
      ...values, 
      cover: coverUrl,
      category_id: selectedCategoryId,
      tag_ids: selectedTagIds
    });
    
    if (content !== lastSavedContentRef.current) {
      localStorage.setItem(DRAFT_KEY, content);
      lastSavedContentRef.current = content;
      setAutoSaveStatus('saved');
      
      // 保存版本历史（最多保留10个版本）
      const historyKey = `${DRAFT_KEY}_history`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const newVersion = { time: new Date().toLocaleString(), content: values.content || '' };
      const newHistory = [newVersion, ...history].slice(0, 10);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      setVersionHistory(newHistory);
    }
  }, [form, coverUrl, selectedCategoryId, selectedTagIds, DRAFT_KEY]);

  const loadLocalDraft = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const data = JSON.parse(draft);
        form.setFieldsValue(data);
        if (data.cover) setCoverUrl(data.cover);
        if (data.content) setPreviewContent(data.content);
        if (data.category_id) setSelectedCategoryId(data.category_id);
        if (data.tag_ids) setSelectedTagIds(data.tag_ids);
        lastSavedContentRef.current = draft;
        message.info('已恢复本地草稿');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
    // 加载版本历史
    const historyKey = `${DRAFT_KEY}_history`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    setVersionHistory(history);
  };

  const clearLocalDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    lastSavedContentRef.current = '';
  };

  const triggerAutoSave = useCallback(() => {
    setAutoSaveStatus('unsaved');
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      saveToLocal();
    }, 2000);
  }, [saveToLocal]);

  const loadOptions = async () => {
    try {
      const [cats, tgs] = await Promise.all([
        categoriesApi.getAll(),
        tagsApi.getAll(),
      ]);
      setCategories(cats);
      setTags(tgs);
    } catch (error) {
      message.error('加载选项失败');
    }
  };

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    try {
      const article = await articlesApi.getAdminById(articleId);
      form.setFieldsValue({
        title: article.title,
        content: article.content,
        description: article.description,
        keywords: article.keywords,
        status: article.status,
      });
      setCoverUrl(article.cover);
      setPreviewContent(article.content);
      setSelectedCategoryId(article.category_id);
      setSelectedTagIds(article.tags?.map(t => t.id) || []);
    } catch (error) {
      message.error('加载文章失败');
      navigate('/admin/articles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (status: 'draft' | 'published') => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const data: ArticleFormData = {
        ...values,
        cover: coverUrl,
        status,
        category_id: selectedCategoryId,
        tag_ids: selectedTagIds,
      };

      if (isEdit) {
        await articlesApi.update(parseInt(id), data);
        message.success('保存成功');
      } else {
        const article = await articlesApi.create(data);
        message.success('创建成功');
        clearLocalDraft();
        navigate(`/admin/article/${article.id}`, { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = () => {
    triggerAutoSave();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPreviewContent(e.target.value);
    triggerAutoSave();
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCategoryId(value ? parseInt(value) : undefined);
    triggerAutoSave();
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
    triggerAutoSave();
  };

  // Markdown 工具栏插入
  const insertMarkdown = (before: string, after: string) => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    form.setFieldValue('content', newText);
    setPreviewContent(newText);
    triggerAutoSave();
    
    // 恢复焦点和光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在编辑器内生效
      const target = e.target as HTMLElement;
      const isInEditor = target.id === 'content-textarea' || target.closest('.editor-page');
      
      if (!isInEditor) return;
      
      // Ctrl/Cmd + S - 保存草稿
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave('draft');
      }
      
      // Ctrl/Cmd + Enter - 发布
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave('published');
      }
      
      // Ctrl/Cmd + P - 预览
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowPreview(prev => !prev);
      }
      
      // 以下快捷键只在 textarea 内生效
      if (target.id !== 'content-textarea') return;
      
      // Ctrl/Cmd + B - 粗体
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        insertMarkdown('**', '**');
      }
      
      // Ctrl/Cmd + I - 斜体
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        insertMarkdown('*', '*');
      }
      
      // Ctrl/Cmd + K - 链接
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        insertMarkdown('[', '](url)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const getWordCount = (content: string) => {
    if (!content) return 0;
    const plainText = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#*_~>\-|]/g, '')
      .replace(/\s+/g, '');
    return plainText.length;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="editor-page single-page">
      {/* 编辑器头部 */}
      <header className="editor-header">
        <div className="editor-header-left">
          <button className="back-btn" onClick={() => navigate('/admin/articles')}>
            <ArrowLeftOutlined /> 返回
          </button>
          <h1 className="editor-title">{isEdit ? '编辑文章' : '新建文章'}</h1>
          {!isEdit && (
            <span className={`auto-save-status ${autoSaveStatus}`}>
              <CloudOutlined />
              {autoSaveStatus === 'saved' && '已保存'}
              {autoSaveStatus === 'saving' && '保存中...'}
              {autoSaveStatus === 'unsaved' && '未保存'}
            </span>
          )}
        </div>
        <div className="editor-header-right">
          <button
            className={`editor-btn ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
          >
            <EyeOutlined /> {showPreview ? '关闭预览' : '预览'}
          </button>
          <button className="editor-btn" onClick={() => handleSave('draft')} disabled={saving}>
            <SaveOutlined /> 草稿
          </button>
          {versionHistory.length > 0 && (
            <button className="editor-btn" onClick={() => setShowHistory(true)}>
              <HistoryOutlined /> 历史
            </button>
          )}
          <button className="editor-btn primary" onClick={() => handleSave('published')} disabled={saving}>
            <SendOutlined /> {saving ? '发布中...' : '发布'}
          </button>
        </div>
      </header>

      {/* 编辑器主体 - 单页布局 */}
      <div className={`editor-body single-page-layout ${showPreview ? 'with-preview' : ''}`}>
        {/* 左侧编辑区 */}
        <div className="editor-main">
          <Form form={form} layout="vertical" className="editor-form" onValuesChange={handleFormChange}>
            {/* 标题 */}
            <Form.Item name="title" rules={[{ required: true, message: '请输入标题' }]}>
              <input type="text" className="title-input" placeholder="输入文章标题..." />
            </Form.Item>

            {/* 内容编辑区 */}
            <div className="markdown-editor-wrapper">
              <div className="markdown-toolbar">
                <button type="button" title="粗体 (Ctrl+B)" onClick={() => insertMarkdown('**', '**')}>B</button>
                <button type="button" title="斜体 (Ctrl+I)" onClick={() => insertMarkdown('*', '*')}>I</button>
                <button type="button" title="标题" onClick={() => insertMarkdown('## ', '')}>H</button>
                <button type="button" title="链接" onClick={() => insertMarkdown('[', '](url)')}>🔗</button>
                <button type="button" title="图片" onClick={() => insertMarkdown('![alt](', ')')}>🖼</button>
                <button type="button" title="代码" onClick={() => insertMarkdown('`', '`')}>{'<>'}</button>
                <button type="button" title="代码块" onClick={() => insertMarkdown('```\n', '\n```')}>{'{ }'}</button>
                <button type="button" title="引用" onClick={() => insertMarkdown('> ', '')}>❝</button>
                <button type="button" title="无序列表" onClick={() => insertMarkdown('- ', '')}>•</button>
                <button type="button" title="有序列表" onClick={() => insertMarkdown('1. ', '')}>1.</button>
                <button type="button" title="分割线" onClick={() => insertMarkdown('\n---\n', '')}>—</button>
                <button type="button" title="表格" onClick={() => insertMarkdown('| 列1 | 列2 |\n|---|---|\n| ', ' | |')}>▦</button>
              </div>
              <Form.Item name="content" rules={[{ required: true, message: '请输入内容' }]}>
                <TextArea
                  id="content-textarea"
                  className="content-textarea"
                  rows={showPreview ? 16 : 20}
                  placeholder="使用 Markdown 格式编写文章内容..."
                  onChange={handleContentChange}
                />
              </Form.Item>
            </div>
            
            <div className="editor-stats">
              <span>字数: {getWordCount(previewContent).toLocaleString()}</span>
              <span>预计阅读: {Math.ceil(getWordCount(previewContent) / 400) || 1} 分钟</span>
            </div>

            {/* 设置与SEO区域 */}
            <div className="editor-settings-row">
              {/* 左列：分类和标签 */}
              <div className="settings-column">
                <h3 className="settings-title">文章设置</h3>
                
                {/* 分类选择 - 原生 select */}
                <div className="native-form-item">
                  <label className="native-label">分类</label>
                  <select 
                    className="native-select"
                    value={selectedCategoryId || ''}
                    onChange={handleCategoryChange}
                  >
                    <option value="">选择分类</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 标签选择 - 点击切换 */}
                <div className="native-form-item">
                  <label className="native-label">标签</label>
                  <div className="tag-selector">
                    {tags.length === 0 ? (
                      <span className="no-tags">暂无标签</span>
                    ) : (
                      tags.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          className={`tag-option ${selectedTagIds.includes(t.id) ? 'selected' : ''}`}
                          onClick={() => handleTagToggle(t.id)}
                        >
                          {t.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* 封面图片 - 使用链接 */}
                <div className="native-form-item">
                  <label className="native-label">封面图片</label>
                  <input
                    type="text"
                    className="native-input"
                    placeholder="输入图片链接..."
                    value={coverUrl || ''}
                    onChange={(e) => {
                      setCoverUrl(e.target.value || undefined);
                      triggerAutoSave();
                    }}
                  />
                  {coverUrl && (
                    <div className="cover-preview-small">
                      <img src={coverUrl} alt="封面预览" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              </div>

              {/* 右列：SEO设置 */}
              <div className="settings-column">
                <h3 className="settings-title">SEO 设置</h3>
                
                <Form.Item 
                  name="description" 
                  label="描述"
                  extra="搜索引擎摘要，建议 150 字以内"
                >
                  <TextArea rows={3} placeholder="文章描述" maxLength={200} showCount />
                </Form.Item>

                <Form.Item 
                  name="keywords" 
                  label="关键词"
                  extra="多个关键词用逗号分隔"
                >
                  <Input placeholder="关键词1, 关键词2, 关键词3" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>

        {/* 右侧预览区 */}
        {showPreview && (
          <div className="editor-preview">
            <div className="preview-header">
              <span>预览</span>
              <button 
                className="fullscreen-btn"
                onClick={() => setFullscreenPreview(true)}
                title="全屏预览"
              >
                <FullscreenOutlined />
              </button>
            </div>
            <div className="preview-content">
              <article className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                  {previewContent || '*开始编写内容后这里会显示预览...*'}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        )}
      </div>

      {/* 全屏预览模态框 */}
      {fullscreenPreview && (
        <div className="fullscreen-preview-modal">
          <div className="fullscreen-preview-header">
            <h2>{form.getFieldValue('title') || '无标题'}</h2>
            <button 
              className="fullscreen-close-btn"
              onClick={() => setFullscreenPreview(false)}
            >
              <FullscreenExitOutlined /> 退出全屏
            </button>
          </div>
          <div className="fullscreen-preview-content">
            <article className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                {previewContent || '*开始编写内容后这里会显示预览...*'}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}

      {/* 版本历史面板 */}
      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h3>版本历史</h3>
            <button className="history-close" onClick={() => setShowHistory(false)}>
              <CloseOutlined />
            </button>
          </div>
          <div className="history-list">
            {versionHistory.map((v, i) => (
              <div 
                key={i} 
                className="history-item"
                onClick={() => {
                  form.setFieldValue('content', v.content);
                  setPreviewContent(v.content);
                  setShowHistory(false);
                  message.success('已恢复到该版本');
                }}
              >
                <span className="history-time">{v.time}</span>
                <span className="history-preview">{v.content.substring(0, 50)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
