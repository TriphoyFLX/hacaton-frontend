import { Fragment, useState, type MouseEvent, type ReactNode } from 'react';

function SpoilerText({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`post-spoiler${open ? ' is-open' : ''}`}
      title={open ? undefined : 'Нажмите, чтобы показать'}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      {children}
    </span>
  );
}

const HASHTAG_RE = /^#[\p{L}\p{N}_-]+$/u;
const MENTION_RE = /^@[a-zA-Z0-9._]+$/;
const URL_RE = /^(https?:\/\/[^\s<]+)$/i;

/** Inline tokens: code, spoiler, bold, italic, strike, hashtag, mention, url */
const INLINE_SPLIT_RE =
  /(```[\s\S]*?```|`[^`\n]+`|\|\|[^|\n]+?\|\||\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|__[^_\n]+?__|_[^_\n]+?_|~~[^~\n]+?~~|#[\p{L}\p{N}_-]+|@[a-zA-Z0-9._]+|https?:\/\/[^\s<]+)/gu;

export interface FeedContentHandlers {
  onHashtagClick?: (tag: string, e: MouseEvent) => void;
  onMentionClick?: (username: string, e: MouseEvent) => void;
  onLinkClick?: (url: string, e: MouseEvent) => void;
}

function renderInline(text: string, handlers: FeedContentHandlers, keyPrefix: string): ReactNode[] {
  if (!text) return [];

  const parts = text.split(INLINE_SPLIT_RE);

  return parts.map((part, index) => {
    if (!part) return null;
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith('```') && part.endsWith('```') && part.length >= 6) {
      const code = part.slice(3, -3).replace(/^\n/, '').replace(/\n$/, '');
      return (
        <pre key={key} className="post-code-block">
          <code>{code}</code>
        </pre>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 3) {
      return (
        <code key={key} className="post-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('||') && part.endsWith('||') && part.length >= 4) {
      return (
        <SpoilerText key={key}>
          {part.slice(2, -2)}
        </SpoilerText>
      );
    }

    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('*') && part.endsWith('*') && part.length >= 3 && !part.startsWith('**'))
    ) {
      const inner = part.startsWith('**') ? part.slice(2, -2) : part.slice(1, -1);
      return (
        <strong key={key} className="post-bold">
          {renderInline(inner, handlers, `${key}-b`)}
        </strong>
      );
    }

    if (
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 3 && !part.startsWith('__'))
    ) {
      const inner = part.startsWith('__') ? part.slice(2, -2) : part.slice(1, -1);
      return (
        <em key={key} className="post-italic">
          {renderInline(inner, handlers, `${key}-i`)}
        </em>
      );
    }

    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <s key={key} className="post-strike">
          {renderInline(part.slice(2, -2), handlers, `${key}-s`)}
        </s>
      );
    }

    if (HASHTAG_RE.test(part)) {
      const tag = part.slice(1);
      return (
        <button
          key={key}
          type="button"
          className="post-hashtag"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlers.onHashtagClick?.(tag, e);
          }}
        >
          {part}
        </button>
      );
    }

    if (MENTION_RE.test(part)) {
      const username = part.slice(1);
      return (
        <button
          key={key}
          type="button"
          className="post-mention"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlers.onMentionClick?.(username, e);
          }}
        >
          {part}
        </button>
      );
    }

    if (URL_RE.test(part)) {
      const href = part.replace(/[.,!?;:]+$/, '');
      return (
        <a
          key={key}
          href={href}
          className="post-link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (handlers.onLinkClick) {
              e.preventDefault();
              e.stopPropagation();
              handlers.onLinkClick(href, e);
            }
          }}
        >
          {part}
        </a>
      );
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

type Block =
  | { type: 'text'; text: string }
  | { type: 'quote'; lines: string[] };

function splitBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let textBuf: string[] = [];
  let quoteBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length === 0) return;
    blocks.push({ type: 'text', text: textBuf.join('\n') });
    textBuf = [];
  };

  const flushQuote = () => {
    if (quoteBuf.length === 0) return;
    blocks.push({ type: 'quote', lines: quoteBuf });
    quoteBuf = [];
  };

  for (const line of lines) {
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushText();
      quoteBuf.push(quoteMatch[1]);
    } else {
      flushQuote();
      textBuf.push(line);
    }
  }

  flushQuote();
  flushText();
  return blocks;
}

/** Render feed post body with Telegram-like markup (feed only). */
export function renderFeedContent(content: string, handlers: FeedContentHandlers = {}): ReactNode {
  if (!content) return null;

  const blocks = splitBlocks(content);

  return blocks.map((block, bi) => {
    if (block.type === 'quote') {
      return (
        <blockquote key={`q-${bi}`} className="post-quote">
          {block.lines.map((line, li) => (
            <div key={`q-${bi}-${li}`} className="post-quote-line">
              {renderInline(line || '\u00A0', handlers, `q-${bi}-${li}`)}
            </div>
          ))}
        </blockquote>
      );
    }

    return (
      <Fragment key={`t-${bi}`}>
        {renderInline(block.text, handlers, `t-${bi}`)}
      </Fragment>
    );
  });
}

export type FormatAction = 'bold' | 'italic' | 'strike' | 'code' | 'spoiler' | 'quote' | 'hashtag';

/** Wrap/insert Telegram-like markup around textarea selection. */
export function applyFeedFormat(
  value: string,
  start: number,
  end: number,
  action: FormatAction,
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(start, end);

  if (action === 'hashtag') {
    const needsSpace = start > 0 && !/\s$/.test(value.slice(0, start));
    const insert = `${needsSpace ? ' ' : ''}#`;
    const next = value.slice(0, start) + insert + value.slice(end);
    const pos = start + insert.length;
    return { value: next, selectionStart: pos, selectionEnd: pos };
  }

  if (action === 'quote') {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const quoted = block
      .split('\n')
      .map((line) => (line.startsWith('>') ? line : `> ${line}`))
      .join('\n');
    const next = value.slice(0, lineStart) + quoted + value.slice(lineEnd);
    return {
      value: next,
      selectionStart: lineStart,
      selectionEnd: lineStart + quoted.length,
    };
  }

  const wrappers: Record<Exclude<FormatAction, 'quote' | 'hashtag'>, [string, string, string]> = {
    bold: ['*', '*', 'жирный'],
    italic: ['_', '_', 'курсив'],
    strike: ['~~', '~~', 'зачёркнутый'],
    code: ['`', '`', 'код'],
    spoiler: ['||', '||', 'спойлер'],
  };

  const [open, close, placeholder] = wrappers[action];
  const inner = selected || placeholder;
  const wrapped = `${open}${inner}${close}`;
  const next = value.slice(0, start) + wrapped + value.slice(end);
  const selStart = start + open.length;
  const selEnd = selStart + inner.length;
  return { value: next, selectionStart: selStart, selectionEnd: selEnd };
}

/** Serialize a contentEditable feed composer into Telegram-like markup for the API. */
export function serializeFeedEditor(root: HTMLElement): string {
  let out = '';

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent || '').replace(/\u00A0/g, ' ');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      out += '\n';
      return;
    }

    const wrap = (open: string, close: string) => {
      const start = out.length;
      Array.from(el.childNodes).forEach(walk);
      const inner = out.slice(start);
      if (!inner) return;
      out = `${out.slice(0, start)}${open}${inner}${close}`;
    };

    if (tag === 'b' || tag === 'strong') {
      wrap('*', '*');
      return;
    }
    if (tag === 'i' || tag === 'em') {
      wrap('_', '_');
      return;
    }
    if (tag === 's' || tag === 'strike' || tag === 'del') {
      wrap('~~', '~~');
      return;
    }
    if (tag === 'code') {
      wrap('`', '`');
      return;
    }
    if (el.dataset.spoiler === '1' || el.classList.contains('cp-editor-spoiler')) {
      wrap('||', '||');
      return;
    }
    if (tag === 'blockquote') {
      const start = out.length;
      Array.from(el.childNodes).forEach(walk);
      const block = out.slice(start);
      out =
        out.slice(0, start) +
        block
          .split('\n')
          .map((line) => (line.startsWith('>') ? line : `> ${line}`))
          .join('\n');
      return;
    }

    const isBlock = tag === 'div' || tag === 'p' || tag === 'li' || tag === 'h1' || tag === 'h2' || tag === 'h3';
    if (isBlock && out.length > 0 && !out.endsWith('\n')) {
      out += '\n';
    }
    Array.from(el.childNodes).forEach(walk);
  };

  Array.from(root.childNodes).forEach(walk);
  return out.replace(/\u200B/g, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** True when the rich editor has no meaningful text. */
export function isFeedEditorEmpty(root: HTMLElement | null): boolean {
  if (!root) return true;
  const text = (root.textContent || '').replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim();
  return text.length === 0;
}

/** Apply a format action to the current DOM selection inside a contentEditable. */
export function applyFeedEditorFormat(action: FormatAction, savedRange: Range | null = null) {
  const sel = window.getSelection();
  if (!sel) return;

  if (savedRange) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
  if (sel.rangeCount === 0) return;

  if (action === 'bold') {
    document.execCommand('bold');
    return;
  }
  if (action === 'italic') {
    document.execCommand('italic');
    return;
  }
  if (action === 'strike') {
    document.execCommand('strikeThrough');
    return;
  }
  if (action === 'quote') {
    document.execCommand('formatBlock', false, 'blockquote');
    return;
  }
  if (action === 'hashtag') {
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      document.execCommand('insertText', false, '#');
      return;
    }
    const text = range.toString();
    const withHash = text.startsWith('#') ? text : `#${text.replace(/^#+/, '')}`;
    range.deleteContents();
    const span = document.createElement('span');
    span.className = 'cp-editor-hashtag';
    span.textContent = withHash;
    range.insertNode(span);
    sel.removeAllRanges();
    const after = document.createRange();
    after.setStartAfter(span);
    after.collapse(true);
    sel.addRange(after);
    return;
  }

  // code / spoiler — wrap selection
  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    const placeholder = action === 'code' ? 'код' : 'спойлер';
    const el =
      action === 'code'
        ? document.createElement('code')
        : Object.assign(document.createElement('span'), {
            className: 'cp-editor-spoiler',
          });
    if (action === 'spoiler') el.dataset.spoiler = '1';
    el.textContent = placeholder;
    range.insertNode(el);
    const inner = document.createRange();
    inner.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(inner);
    return;
  }

  try {
    const el =
      action === 'code'
        ? document.createElement('code')
        : Object.assign(document.createElement('span'), {
            className: 'cp-editor-spoiler',
          });
    if (action === 'spoiler') el.dataset.spoiler = '1';
    range.surroundContents(el);
  } catch {
    const frag = range.extractContents();
    const el =
      action === 'code'
        ? document.createElement('code')
        : Object.assign(document.createElement('span'), {
            className: 'cp-editor-spoiler',
          });
    if (action === 'spoiler') el.dataset.spoiler = '1';
    el.appendChild(frag);
    range.insertNode(el);
  }
}

