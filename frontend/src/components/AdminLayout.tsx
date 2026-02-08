/**
 * 后台管理布局组件
 * Design System: Swiss Modernism 2.0
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  FolderOutlined,
  TagsOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  DashboardOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { authApi } from '../api';

const menuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/admin/articles', icon: <FileTextOutlined />, label: '文章管理' },
  { key: '/admin/categories', icon: <FolderOutlined />, label: '分类管理' },
  { key: '/admin/tags', icon: <TagsOutlined />, label: '标签管理' },
];

const SIDEBAR_COLLAPSED_KEY = 'admin_sidebar_collapsed';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    // 移动端默认收起
    if (window.innerWidth <= 768) return true;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // 防止滚动
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

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const selectedKey = menuItems.find(item => 
    location.pathname.startsWith(item.key)
  )?.key || '/admin/articles';

  // 获取当前页面标题
  const currentPageTitle = menuItems.find(item => 
    location.pathname.startsWith(item.key)
  )?.label || '管理后台';

  return (
    <div className="admin-layout">
      {/* 移动端顶部导航 */}
      <header className="admin-mobile-header">
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开菜单"
        >
          <MenuUnfoldOutlined />
        </button>
        <span className="mobile-page-title">{currentPageTitle}</span>
        <button className="mobile-logout-btn" onClick={handleLogout}>
          <LogoutOutlined />
        </button>
      </header>

      {/* 侧边栏 */}
      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">
            {collapsed ? '博' : '博客管理'}
          </span>
          <button 
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="关闭菜单"
          >
            <CloseOutlined />
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-item ${selectedKey === item.key ? 'active' : ''}`}
              onClick={() => handleNavClick(item.key)}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="sidebar-item"
            onClick={() => handleNavClick('/')}
            title={collapsed ? '返回前台' : undefined}
          >
            <HomeOutlined />
            <span className="sidebar-item-label">返回前台</span>
          </button>
          <button
            className="sidebar-item logout"
            onClick={handleLogout}
          >
            <LogoutOutlined />
            <span className="sidebar-item-label">退出登录</span>
          </button>
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {mobileMenuOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <div className="admin-main">
        <header className="admin-header">
          <button 
            className="toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <LogoutOutlined /> 退出登录
          </button>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
