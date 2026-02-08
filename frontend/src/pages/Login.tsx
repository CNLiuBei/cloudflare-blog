/**
 * 登录页面
 * Design System: Swiss Modernism 2.0
 */

import { useState } from 'react';
import { message } from 'antd';
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, ApiError } from '../api';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      message.error('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      await authApi.login({ username, password });
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('登录失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">博客管理系统</h1>
          <p className="login-subtitle">请登录以继续</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              <UserOutlined /> 用户名
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <LockOutlined /> 密码
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? <><LoadingOutlined /> 登录中...</> : '登录'}
          </button>
        </form>

        <div className="login-footer">
          <button 
            className="back-home-btn"
            onClick={() => navigate('/')}
            type="button"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
