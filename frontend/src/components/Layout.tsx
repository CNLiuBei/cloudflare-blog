/**
 * 公开页面布局组件
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect } from 'react';
import { HomeOutlined, UserOutlined, SettingOutlined, ArrowUpOutlined, BulbOutlined, BulbFilled, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../api';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBackTop, setShowBackTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // 应用暗色模式
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      setScrollProgress(progress);
      setShowBackTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 关闭移动菜单当路由变化时
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // 防止滚动当移动菜单打开时
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="public-layout">
      {/* 滚动进度条 */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      
      <header className="public-header">
        <div className="header-content">
          <div 
            className="site-logo"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          >
            我的博客
          </div>

          {/* 移动端菜单按钮 */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>

          {/* 导航菜单 */}
          <nav 
            className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`} 
            role="navigation" 
            aria-label="主导航"
          >
            <button 
              className={`nav-item theme-toggle ${darkMode ? 'dark' : 'light'}`}
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
              title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
            >
              <span className="theme-icon-wrapper">
                <BulbOutlined className="theme-icon light-icon" aria-hidden="true" />
                <BulbFilled className="theme-icon dark-icon" aria-hidden="true" />
              </span>
              <span className="nav-text">主题</span>
            </button>
            <button 
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => handleNavClick('/')}
            >
              <HomeOutlined aria-hidden="true" />
              <span>首页</span>
            </button>
            {isAuthenticated() ? (
              <button 
                className={`nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                onClick={() => handleNavClick('/admin')}
              >
                <SettingOutlined aria-hidden="true" />
                <span>管理后台</span>
              </button>
            ) : (
              <button 
                className={`nav-item ${isActive('/login') ? 'active' : ''}`}
                onClick={() => handleNavClick('/login')}
              >
                <UserOutlined aria-hidden="true" />
                <span>登录</span>
              </button>
            )}
          </nav>

          {/* 移动端菜单遮罩 */}
          {mobileMenuOpen && (
            <div 
              className="mobile-menu-overlay"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </div>
      </header>
      
      <main className="public-main">
        <div className="main-container">
          {children}
        </div>
      </main>
      
      <footer className="public-footer">
        <p>我的博客 © {new Date().getFullYear()} · Powered by Cloudflare</p>
      </footer>

      {/* 返回顶部按钮 */}
      {showBackTop && (
        <button 
          className="back-to-top"
          onClick={scrollToTop}
          aria-label="返回顶部"
        >
          <ArrowUpOutlined />
        </button>
      )}
    </div>
  );
}
