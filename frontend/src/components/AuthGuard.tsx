/**
 * 路由守卫组件
 * 
 * 保护需要登录的路由，未登录时重定向到登录页
 */

import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();

  if (!isAuthenticated()) {
    // 保存当前路径，登录后可以重定向回来
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default AuthGuard;
