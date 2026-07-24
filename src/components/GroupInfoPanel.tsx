import { useRef, useState } from 'react';
import { Camera, Crown, Loader2, Shield, ShieldOff, UserMinus, Users, X } from 'lucide-react';
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const myRole: ChatMemberRole = chat.myRole
    || chat.users.find((u) => u.userId === currentUserId)?.role
    || 'MEMBER';
  const isAdmin = myRole === 'ADMIN';
  const avatarUrl = resolveMediaUrl(chat.avatar);

  const members = [...chat.users].sort((a, b) => {
    const aAdmin = a.role === 'ADMIN' ? 0 : 1;
    const bAdmin = b.role === 'ADMIN' ? 0 : 1;
    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
    const an = a.user.displayName || a.user.username;
    const bn = b.user.displayName || b.user.username;
    return an.localeCompare(bn, 'ru');
  });

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
            Участники
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
            <div className="group-panel-name">{chat.name || 'Группа'}</div>
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

        {error && <div className="group-panel-error">{error}</div>}

        <div className="group-panel-list">
          {members.map((member) => {
            const isCreator = chat.creatorId === member.userId;
            const isSelf = member.userId === currentUserId;
            const memberAvatar = resolveMediaUrl(member.user.avatar);
            const acting = actingUserId === member.userId;
            return (
              <div key={member.id} className="group-member-row">
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
                <div className="group-member-actions">
                  {isAdmin && !isCreator && !isSelf && member.role !== 'ADMIN' && (
                    <button
                      type="button"
                      title="Сделать админом"
                      disabled={acting}
                      onClick={() => void handleRole(member.userId, 'ADMIN')}
                    >
                      {acting ? <Loader2 size={14} className="spin" /> : <Shield size={14} />}
                    </button>
                  )}
                  {isAdmin && !isCreator && !isSelf && member.role === 'ADMIN' && (
                    <button
                      type="button"
                      title="Снять админку"
                      disabled={acting}
                      onClick={() => void handleRole(member.userId, 'MEMBER')}
                    >
                      {acting ? <Loader2 size={14} className="spin" /> : <ShieldOff size={14} />}
                    </button>
                  )}
                  {(isSelf || (isAdmin && !isCreator)) && (
                    <button
                      type="button"
                      title={isSelf ? 'Выйти из группы' : 'Удалить из группы'}
                      disabled={acting}
                      onClick={() => void handleRemove(member.userId)}
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
