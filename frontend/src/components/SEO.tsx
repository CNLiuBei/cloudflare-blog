/**
 * SEO 组件
 * 
 * 管理页面的 meta 标签
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export default function SEO({ title, description, keywords, image, url }: SEOProps) {
  useEffect(() => {
    // 设置 title
    const fullTitle = title ? `${title} - 我的博客` : '我的博客';
    document.title = fullTitle;

    // 设置 meta 标签
    const setMeta = (name: string, content: string | undefined, property?: boolean) => {
      if (!content) return;
      
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    };

    // 基础 meta 标签
    setMeta('description', description);
    setMeta('keywords', keywords);

    // Open Graph 标签
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', image, true);
    setMeta('og:url', url || window.location.href, true);
    setMeta('og:type', 'article', true);

    // Twitter Card 标签
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

  }, [title, description, keywords, image, url]);

  return null;
}
