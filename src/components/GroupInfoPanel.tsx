import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Crown, Loader2, Plus, Shield, ShieldOff, UserMinus, Users, X } from 'lucide-react';
import { chatsApi, Chat, ChatMemberRole } from '../api/chats';
import { resolveMediaUrl } from '../lib/mediaUrl';

interface GroupInfoPanelProps {
  chat: Chat;
  currentUserId: string;
  onClose: () => void;
  onChatUpdate: (chat: Chat) => void;
  onLeft?: () => void;
}

export default function GroupInfoPanel({
  chat,
  currentUserId,
  onClose,
  onChatUpdate,
  onLeft,
}: GroupInfoPanelProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState(chat.name || '');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<
    Array<{ id: string; username: string; displayName?: string | null; avatar?: string | null }>
  >([]);
  const [selectedToAdd, setSelectedToAdd] = useState<
    Array<{ id: string; username: string; displayName?: string | null; avatar?: string | null }>
  >([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myRole: ChatMemberRole =
    chat.myRole || chat.users.find((u) => u.userId === currentUserId)?.role || 'MEMBER';
  const isAdmin = myRole === 'ADMIN';
  const avatarUrl = resolveMediaUrl(chat.avatar);
  const memberIds = useMemo(() => new Set(chat.users.map((u) => u.userId)), [chat.users]);

  useEffect(() => {
    setGroupName(chat.name || '');
  }, [chat.name, chat.id]);

  useEffect(() => {
    if (!isAdmin) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = memberQuery.trim();
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const users = await chatsApi.searchUsers(q);
          setMemberResults(
            (Array.isArray(users) ? users : []).filter(
              (u: { id: string }) => !memberIds.has(u.id) && !selectedToAdd.some((s) => s.id === u.id)
            )
          );
        } catch {
          setMemberResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [memberQuery, isAdmin, memberIds, selectedToAdd]);

  const members = [...chat.users].sort((a, b) => {
    const aAdmin = a.role === 'ADMIN' ? 0 : 1;
    const bAdmin = b.role === 'ADMIN' ? 0 : 1;
    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
    const an = a.user.displayName || a.user.username;
    const bn = b.user.displayName || b.user.username;
    return an.localeCompare(bn, 'ru');
  });

  const handleRename = async () => {
    if (!isAdmin || busy) return;
    const next = groupName.trim();
    if (next.length < 2 || next === (chat.name || '')) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await chatsApi.renameGroup(chat.id, next);
      onChatUpdate({ ...chat, ...updated, users: updated.users || chat.users });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось переименовать');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMembers = async () => {
    if (!isAdmin || busy || selectedToAdd.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await chatsApi.addMembers(
        chat.id,
        selectedToAdd.map((m) => m.id)
      );
      onChatUpdate({ ...chat, ...updated, users: updated.users || chat.users });
      setSelectedToAdd([]);
      setMemberQuery('');
      setMemberResults([]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось добавить участников');
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarPick = async (file: File | null) => {
    if (!file || !isAdmin || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await chatsApi.uploadGroupAvatar(chat.id, file);
      onChatUpdate({ ...chat, ...updated, users: updated.users || chat.users });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось обновить фото');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!isAdmin || busy || !chat.avatar) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await chatsApi.deleteGroupAvatar(chat.id);
      onChatUpdate({ ...chat, ...updated, users: updated.users || chat.users });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось удалить фото');
    } finally {
      setBusy(false);
    }
  };

  const handleRole = async (userId: string, role: ChatMemberRole) => {
    if (!isAdmin || busy) return;
    setActingUserId(userId);
    setError(null);
    try {
      const updated = await chatsApi.setMemberRole(chat.id, userId, role);
      onChatUpdate({ ...chat, ...updated, users: updated.users || chat.users });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось изменить роль');
    } finally {
      setActingUserId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (busy) return;
    const leaving = userId === currentUserId;
    if (!leaving && !isAdmin) return;
    setActingUserId(userId);
    setError(null);
    try {
      const result = await chatsApi.removeMember(chat.id, userId);
      if (leaving || ('left' in result && result.left)) {
        onLeft?.();
        return;
      }
      if ('users' in result) {
        onChatUpdate({ ...chat, ...result, users: result.users });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось удалить участника');
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <div className="group-panel-root" role="dialog" aria-modal="true" aria-label="Участники группы">
      <button type="button" className="group-panel-backdrop" onClick={onClose} aria-label="Закрыть" />
      <div className="group-panel-sheet">
        <div className="group-panel-head">
          <div className="group-panel-title">
            <Users size={16} />
            Группа
          </div>
          <button type="button" className="group-panel-close" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div className="group-panel-avatar-block">
          <div className="group-panel-avatar">
            {avatarUrl ? <img src={avatarUrl} alt={chat.name || 'Группа'} /> : <Users size={28} />}
          </div>
          <div className="group-panel-meta">
            {isAdmin ? (
              <div className="group-panel-rename">
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={120}
                  placeholder="Название группы"
                  aria-label="Название группы"
                />
                <button
                  type="button"
                  disabled={busy || groupName.trim().length < 2 || groupName.trim() === (chat.name || '')}
                  onClick={() => void handleRename()}
                >
                  Сохранить
                </button>
              </div>
            ) : (
              <div className="group-panel-name">{chat.name || 'Группа'}</div>
            )}
            <div className="group-panel-count">{chat.memberCount || chat.users.length} участников</div>
            {isAdmin && (
              <div className="group-panel-avatar-actions">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {busy ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
                  Фото
                </button>
                {chat.avatar && (
                  <button type="button" onClick={() => void handleRemoveAvatar()} disabled={busy}>
                    Убрать
                  </button>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={(e) => void handleAvatarPick(e.target.files?.[0] || null)}
          />
        </div>

        {isAdmin && (
          <div className="group-panel-add">
            <div className="group-panel-add-title">
              <Plus size={14} /> Добавить участников
            </div>
            <input
              className="group-panel-add-input"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Поиск по @username"
            />
            {selectedToAdd.length > 0 && (
              <div className="group-panel-add-chips">
                {selectedToAdd.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="group-panel-chip"
                    onClick={() => setSelectedToAdd((prev) => prev.filter((x) => x.id !== m.id))}
                  >
                    @{m.username} ×
                  </button>
                ))}
                <button
                  type="button"
                  className="group-panel-add-btn"
                  disabled={busy}
                  onClick={() => void handleAddMembers()}
                >
                  Добавить ({selectedToAdd.length})
                </button>
              </div>
            )}
            {searching && <div className="group-panel-add-hint">Поиск…</div>}
            {!searching && memberResults.length > 0 && (
              <div className="group-panel-add-results">
                {memberResults.slice(0, 8).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="group-panel-add-result"
                    onClick={() => {
                      setSelectedToAdd((prev) =>
                        prev.some((p) => p.id === user.id) ? prev : [...prev, user]
                      );
                      setMemberResults((prev) => prev.filter((p) => p.id !== user.id));
                    }}
                  >
                    @{user.username}
                    {user.displayName ? ` · ${user.displayName}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <div className="group-panel-error">{error}</div>}

        <div className="group-panel-list">
          {members.map((member) => {
            const isCreator = chat.creatorId === member.userId;
            const isSelf = member.userId === currentUserId;
            const memberAvatar = resolveMediaUrl(member.user.avatar);
            const acting = actingUserId === member.userId;
            return (
              <div key={member.id} className="group-member-row">
                <button
                  type="button"
                  className="group-member-main"
                  onClick={() => navigate(`/profile/${member.user.username}`)}
                  aria-label={`Профиль @${member.user.username}`}
                >
                  <div className="group-member-avatar">
                    {memberAvatar ? (
                      <img src={memberAvatar} alt={member.user.username} />
                    ) : (
                      member.user.username[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="group-member-info">
                    <div className="group-member-name">
                      {member.user.displayName || `@${member.user.username}`}
                      {isSelf && <span className="group-member-you">вы</span>}
                    </div>
                    <div className="group-member-sub">
                      @{member.user.username}
                      {member.role === 'ADMIN' && (
                        <span className="group-member-role">
                          {isCreator ? <Crown size={11} /> : <Shield size={11} />}
                          {isCreator ? 'создатель' : 'админ'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="group-member-actions">
                  {isAdmin && !isCreator && !isSelf && member.role !== 'ADMIN' && (
                    <button
                      type="button"
                      title="Сделать админом"
                      disabled={acting}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRole(member.userId, 'ADMIN');
                      }}
                    >
                      {acting ? <Loader2 size={14} className="spin" /> : <Shield size={14} />}
                    </button>
                  )}
                  {isAdmin && !isCreator && !isSelf && member.role === 'ADMIN' && (
                    <button
                      type="button"
                      title="Снять админку"
                      disabled={acting}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRole(member.userId, 'MEMBER');
                      }}
                    >
                      {acting ? <Loader2 size={14} className="spin" /> : <ShieldOff size={14} />}
                    </button>
                  )}
                  {(isSelf || (isAdmin && !isCreator)) && (
                    <button
                      type="button"
                      title={isSelf ? 'Выйти из группы' : 'Удалить из группы'}
                      disabled={acting}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRemove(member.userId);
                      }}
                    >
                      {acting ? <Loader2 size={14} className="spin" /> : <UserMinus size={14} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
