import type { AppNotification } from '../api/notifications';

export function isChatNotificationEntity(entityType?: string | null): boolean {
  return Boolean(entityType && (entityType === 'chat' || entityType.startsWith('chat_')));
}

export function notificationText(notification: AppNotification): string {
  const name = notification.actor.displayName?.trim() || `@${notification.actor.username}`;
  const { type, entityType } = notification;

  if (type === 'MESSAGE') {
    if (entityType === 'chat_video') return `${name} отправил(а) вам видео`;
    if (entityType === 'chat_image') return `${name} отправил(а) вам фото`;
    return `${name} написал(а) вам сообщение`;
  }

  if (type === 'LIKE') {
    if (entityType === 'soundtok') return `${name} поставил(а) лайк на ваше видео`;
    return `${name} поставил(а) лайк на вашу публикацию`;
  }

  if (type === 'REPOST') {
    if (entityType === 'soundtok_same_repost') {
      return `${name} тоже репостнул(а) это видео`;
    }
    return `${name} репостнул(а) ваше видео`;
  }

  if (type === 'COMMENT') {
    if (entityType === 'soundtok') return `${name} прокомментировал(а) ваше видео`;
    return `${name} оставил(а) комментарий к вашей публикации`;
  }

  if (type === 'FOLLOW') return `${name} подписался(ась) на вас`;

  return 'У вас новое уведомление';
}
