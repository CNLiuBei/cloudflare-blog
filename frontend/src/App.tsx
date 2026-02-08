/**
 * 应用入口组件
 * 
 * 配置 React Router 路由
 */

import { Routes, Route } from 'react-router-dom';

// 布局组件
import AdminLayout from './components/AdminLayout';
import AuthGuard from './components/AuthGuard';

// 公开页面
import Home from './pages/Home';
import ArticlePage from './pages/Article';
import NotFound from './pages/NotFound';

// 认证页面
import Login from './pages/Login';

// 后台管理页面
import AdminDashboard from './pages/Admin/Dashboard';
import AdminArticles from './pages/Admin/Articles';
import ArticleEditor from './pages/Admin/ArticleEditor';
import AdminCategories from './pages/Admin/Categories';
import AdminTags from './pages/Admin/Tags';

function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/" element={<Home />} />
      <Route path="/article/:id" element={<ArticlePage />} />
      <Route path="/category/:id" element={<Home />} />
      <Route path="/tag/:id" element={<Home />} />
      
      {/* 登录页 */}
      <Route path="/login" element={<Login />} />
      
      {/* 后台管理路由（需要认证） */}
      <Route
        path="/admin"
        element={
          <AuthGuard>
            <AdminLayout />
          </AuthGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="articles" element={<AdminArticles />} />
        <Route path="article/new" element={<ArticleEditor />} />
        <Route path="article/:id" element={<ArticleEditor />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="tags" element={<AdminTags />} />
      </Route>
      
      {/* 404 页面 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
