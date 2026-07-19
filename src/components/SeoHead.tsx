import { useEffect } from 'react';

export type SeoProps = {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
};

const SITE = 'https://soundlab-studio.ru';

export default function SeoHead({ title, description, path = '/', keywords }: SeoProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, attr: 'content' | 'href', value: string, create?: { name?: string; property?: string; rel?: string }) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el && create) {
        if (create.rel) {
          el = document.createElement('link');
          (el as HTMLLinkElement).rel = create.rel;
        } else {
          el = document.createElement('meta');
          if (create.name) (el as HTMLMetaElement).name = create.name;
          if (create.property) (el as HTMLMetaElement).setAttribute('property', create.property);
        }
        document.head.appendChild(el);
      }
      if (!el) return;
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', description, { name: 'description' });
    if (keywords) {
      setMeta('meta[name="keywords"]', 'content', keywords, { name: 'keywords' });
    }

    const url = `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
    setMeta('link[rel="canonical"]', 'href', url, { rel: 'canonical' });
    setMeta('meta[property="og:title"]', 'content', title, { property: 'og:title' });
    setMeta('meta[property="og:description"]', 'content', description, { property: 'og:description' });
    setMeta('meta[property="og:url"]', 'content', url, { property: 'og:url' });
    setMeta('meta[name="twitter:title"]', 'content', title, { name: 'twitter:title' });
    setMeta('meta[name="twitter:description"]', 'content', description, { name: 'twitter:description' });
  }, [title, description, path, keywords]);

  return null;
}
