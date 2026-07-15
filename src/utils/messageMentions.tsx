import { Fragment, type MouseEvent, type ReactNode } from 'react';

/** Username chars used elsewhere in the app (letters, digits, underscore, dot). */
export const MENTION_USERNAME_RE = /[a-zA-Z0-9._]+/;

const TOKEN_SPLIT_RE = /(@[a-zA-Z0-9._]+|https?:\/\/[^\s<]+)/g;
const MENTION_FULL_RE = /^@([a-zA-Z0-9._]+)$/;
const URL_FULL_RE = /^(https?:\/\/[^\s<]+)$/i;

export function extractMentionQuery(text: string, cursorPos: number): {
  query: string;
  start: number;
  end: number;
} | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@([a-zA-Z0-9._]*)$/);
  if (!match) return null;

  const start = cursorPos - match[0].length;
  return {
    query: match[1],
    start,
    end: cursorPos,
  };
}

export function insertMention(
  text: string,
  start: number,
  end: number,
  username: string
): { value: string; cursor: number } {
  const mention = `@${username} `;
  const value = `${text.slice(0, start)}${mention}${text.slice(end)}`;
  return { value, cursor: start + mention.length };
}

interface RenderMentionsOptions {
  text: string;
  onMentionClick: (username: string, e: MouseEvent) => void;
  onLinkClick?: (url: string, e: MouseEvent) => void;
  mentionClassName?: string;
  linkClassName?: string;
}

export function renderTextWithMentions({
  text,
  onMentionClick,
  onLinkClick,
  mentionClassName = 'message-mention',
  linkClassName = 'message-link',
}: RenderMentionsOptions): ReactNode {
  if (!text) return null;

  const parts = text.split(TOKEN_SPLIT_RE);

  return parts.map((part, index) => {
    const mentionMatch = part.match(MENTION_FULL_RE);
    if (mentionMatch) {
      const username = mentionMatch[1];
      return (
        <button
          key={index}
          type="button"
          className={mentionClassName}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMentionClick(username, e);
          }}
        >
          @{username}
        </button>
      );
    }

    if (URL_FULL_RE.test(part)) {
      const href = part.replace(/[.,!?;:]+$/, '');
      return (
        <a
          key={index}
          href={href}
          className={linkClassName}
          onClick={(e) => {
            if (onLinkClick) {
              e.preventDefault();
              e.stopPropagation();
              onLinkClick(href, e);
            }
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {part}
        </a>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}
