import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { followsApi, FollowUser } from '../api/follows';
import { resolveMediaUrl } from '../lib/mediaUrl';

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  title: string;
  onClose: () => void;
}

export default function FollowListModal({ userId, type, title, onClose }: FollowListModalProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data =
          type === 'followers'
            ? await followsApi.getFollowers(userId)
            : await followsApi.getFollowing(userId);
        setUsers(data);
      } catch (error) {
        console.error('Failed to load follow list:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, type]);

  return (
    <div className="follow-modal-overlay" onClick={onClose}>
      <style>{`
        .follow-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
        }
        @media (min-width: 640px) {
          .follow-modal-overlay {
            align-items: center;
          }
        }
        .follow-modal {
          width: 100%;
          max-width: 420px;
          max-height: 70dvh;
          background: #111;
          border: 1px solid #232323;
          border-radius: 16px 16px 0 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .follow-modal {
            border-radius: 16px;
          }
        }
        .follow-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid #232323;
        }
        .follow-modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #f0ede8;
        }
        .follow-modal-close {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #6b6b6b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .follow-modal-close:hover {
          background: #181818;
          color: #f0ede8;
        }
        .follow-modal-body {
          overflow-y: auto;
          padding: 8px 0;
        }
        .follow-modal-empty,
        .follow-modal-loading {
          padding: 32px 18px;
          text-align: center;
          color: #6b6b6b;
          font-size: 14px;
        }
        .follow-user-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .follow-user-row:hover {
          background: #181818;
        }
        .follow-user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #181818;
          border: 1px solid #2e2e2e;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          font-weight: 700;
          color: #c5c0b8;
        }
        .follow-user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .follow-user-name {
          font-size: 14px;
          font-weight: 600;
          color: #f0ede8;
        }
        .follow-user-handle {
          font-size: 12px;
          color: #6b6b6b;
        }
      `}</style>
      <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="follow-modal-header">
          <h2 className="follow-modal-title">{title}</h2>
          <button type="button" className="follow-modal-close" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="follow-modal-body">
          {loading ? (
            <div className="follow-modal-loading">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="follow-modal-empty">
              {type === 'followers' ? 'Пока нет подписчиков' : 'Пока нет подписок'}
            </div>
          ) : (
            users.map((user) => {
              const avatar = resolveMediaUrl(user.avatar);
              return (
                <div
                  key={user.id}
                  className="follow-user-row"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${user.username}`);
                  }}
                >
                  <div className="follow-user-avatar">
                    {avatar ? (
                      <img src={avatar} alt={user.username} />
                    ) : (
                      user.username[0]?.toUpperCase() ?? 'U'
                    )}
                  </div>
                  <div>
                    <div className="follow-user-name">{user.displayName || user.username}</div>
                    <div className="follow-user-handle">@{user.username}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
