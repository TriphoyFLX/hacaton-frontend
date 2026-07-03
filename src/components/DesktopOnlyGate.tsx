import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, ArrowLeft } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface DesktopOnlyGateProps {
  children: ReactNode;
  feature: string;
  hint?: string;
}

export default function DesktopOnlyGate({ children, feature, hint }: DesktopOnlyGateProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div className="desktop-only-screen">
        <style>{`
          .desktop-only-screen {
            min-height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 20px;
            background: #0a0a0a;
            color: #f0ede8;
            font-family: 'Syne', sans-serif;
          }
          .desktop-only-card {
            max-width: 400px;
            width: 100%;
            text-align: center;
            padding: 32px 24px;
            border: 1px solid #232323;
            border-radius: 16px;
            background: #111111;
          }
          .desktop-only-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 20px;
            border-radius: 14px;
            background: #181818;
            border: 1px solid #2e2e2e;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #c5c0b8;
          }
          .desktop-only-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.02em;
          }
          .desktop-only-desc {
            font-size: 14px;
            color: #6b6b6b;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .desktop-only-back {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: 8px;
            border: 1px solid #2e2e2e;
            background: transparent;
            color: #f0ede8;
            font-size: 14px;
            text-decoration: none;
            transition: background 0.15s, border-color 0.15s;
          }
          .desktop-only-back:hover {
            background: #181818;
            border-color: #3d3d3d;
          }
        `}</style>
        <div className="desktop-only-card">
          <div className="desktop-only-icon">
            <Monitor size={28} />
          </div>
          <h1 className="desktop-only-title">{feature}</h1>
          <p className="desktop-only-desc">
            {hint ?? 'Этот раздел лучше работает на компьютере или планшете в альбомной ориентации.'}
          </p>
          <Link to="/dashboard" className="desktop-only-back">
            <ArrowLeft size={16} />
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
