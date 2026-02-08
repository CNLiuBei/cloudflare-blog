/**
 * 404 页面
 * Design System: Swiss Modernism 2.0
 */

import { useNavigate } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';
import PublicLayout from '../components/Layout';
import SEO from '../components/SEO';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <SEO title="页面未找到" />
      <div className="not-found-page">
        <div className="not-found-content">
          <h1 className="not-found-code">404</h1>
          <h2 className="not-found-title">页面未找到</h2>
          <p className="not-found-desc">
            抱歉，您访问的页面不存在或已被移除。
          </p>
          <button 
            className="not-found-btn"
            onClick={() => navigate('/')}
          >
            <HomeOutlined /> 返回首页
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}
