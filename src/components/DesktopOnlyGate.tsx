import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, ArrowLeft, FolderOpen } from 'lucide-react';
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
            padding: 24px 16px calc(24px + env(safe-area-inset-bottom, 0px));
            background: #0a0a0a;
            color: #f0ede8;
            font-family: 'Syne', sans-serif;
          }
          .desktop-only-card {
            max-width: 400px;
            width: 100%;
            text-align: center;
            padding: 28px 20px;
            border: 1px solid #232323;
            border-radius: 16px;
            background: #111111;
          }
          .desktop-only-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 16px;
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
            margin: 0 0 8px;
            letter-spacing: -0.02em;
          }
          .desktop-only-desc {
            font-size: 14px;
            color: #8a8580;
            line-height: 1.55;
            margin: 0 0 22px;
          }
          .desktop-only-actions {
            display: grid;
            gap: 8px;
          }
          .desktop-only-back,
          .desktop-only-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 44px;
            padding: 10px 16px;
            border-radius: 10px;
            border: 1px solid #2e2e2e;
            background: transparent;
            color: #f0ede8;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
          }
          .desktop-only-back {
            background: #f0ede8;
            color: #12100e;
            border-color: #f0ede8;
          }
          .desktop-only-secondary:hover {
            background: #181818;
            border-color: #3d3d3d;
          }
        `}</style>
        <div className="desktop-only-card">
          <div className="desktop-only-icon">
            <Monitor size={26} />
          </div>
          <h1 className="desktop-only-title">{feature}</h1>
          <p className="desktop-only-desc">
            {hint ?? 'Секвенсор рассчитан на компьютер: на телефоне откройте ленту или проекты, а студию — с ПК.'}
          </p>
          <div className="desktop-only-actions">
            <Link to="/feed" className="desktop-only-back">
              <ArrowLeft size={16} />
              К ленте
            </Link>
            <Link to="/projects" className="desktop-only-secondary">
              <FolderOpen size={16} />
              К проектам
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
