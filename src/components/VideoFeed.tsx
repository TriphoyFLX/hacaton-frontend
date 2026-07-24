import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, X, Send, Play, Music2, Plus, Check, ThumbsDown, Trash2 } from 'lucide-react';
import { SoundTok, soundTokApi, Comment } from '../api/soundtok';
import { soundsApi } from '../api/sounds';
import { followsApi } from '../api/follows';
import { API_ORIGIN } from '../api/client';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { formatCount, formatRelativeTime, pluralizeComments } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import {
  unlockMediaPlayback,
  setSoundTokAudioPreference,
  shouldPreferSoundTokAudio,
} from '../lib/mediaUnlock';
import ShareSoundTokModal from './ShareSoundTokModal';
import AdminBadge from './AdminBadge';
import { renderTextWithMentions } from '../utils/messageMentions';

const css = `
.vf-root {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0a0a0a;
}

.vf-phone {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  background: #000;
}

.vf-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
  user-select: none;
}

.vf-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
  pointer-events: none;
}

.vf-top-title {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 6px rgba(0,0,0,0.6);
}

.vf-video-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 6;
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vf-spin-loader 0.7s linear infinite;
}

@keyframes vf-spin-loader {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.vf-music-disc {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 8px solid #1a1a1a;
  background: linear-gradient(135deg, #2a2a2a, #111);
  margin-top: 4px;
  animation: vf-spin 4s linear infinite;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
}

.vf-music-disc img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-music-disc-letter {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.vf-share-label {
  font-size: 11px;
}

.vf-desc-expanded {
  -webkit-line-clamp: unset;
  display: block;
}

.vf-desc-toggle {
  background: none;
  border: none;
  color: rgba(255,255,255,0.65);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  margin-top: 4px;
  cursor: pointer;
}

.vf-video-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
  touch-action: none;
}

.vf-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  background: #000;
}

.vf-pause-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  opacity: 0.85;
  pointer-events: none;
  z-index: 5;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
}

.vf-gradient-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(rgba(0,0,0,0.45), transparent);
  pointer-events: none;
  z-index: 2;
}

.vf-gradient-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 220px;
  background: linear-gradient(transparent, rgba(0,0,0,0.75));
  pointer-events: none;
  z-index: 2;
}

.vf-bottom-info {
  position: absolute;
  left: 0;
  right: 72px;
  bottom: 0;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 8;
  color: #fff;
}

.vf-author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.vf-author-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}

.vf-follow-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.8);
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.vf-description {
  font-size: 14px;
  line-height: 1.45;
  margin-bottom: 10px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vf-music-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
  max-width: 100%;
  appearance: none;
  background: transparent;
  border: none;
  color: inherit;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.vf-music-row:hover span {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vf-music-row span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vf-music-icon {
  flex-shrink: 0;
  animation: vf-spin 3s linear infinite;
}

@keyframes vf-spin {
  to { transform: rotate(360deg); }
}

/* ── Action bar (TikTok right side) ── */
.vf-actions {
  position: absolute;
  right: 10px;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 9;
}

.vf-action-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 14px;
}

.vf-author-block {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 18px;
}

.vf-author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.vf-author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-follow-btn {
  position: relative;
  margin-top: -11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fe2c55;
  border: 2px solid #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.15s ease, background 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
}

.vf-follow-btn:hover {
  transform: scale(1.1);
  background: #ff4466;
}

.vf-follow-btn:active {
  transform: scale(0.92);
}

.vf-follow-btn.following {
  background: #2a2a2a;
  border-color: rgba(255,255,255,0.9);
  width: 20px;
  height: 20px;
  margin-top: -10px;
}

.vf-follow-btn svg {
  stroke-width: 3;
}

.vf-action-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.vf-action-btn:active {
  transform: scale(0.9);
}

.vf-action-btn.liked {
  color: #fe2c55;
}

.vf-action-btn.danger:hover {
  color: #f5a9a3;
}

.vf-action-count {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-top: 2px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.7);
  min-width: 48px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ── Comments bottom sheet (TikTok style) ── */
.vf-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1100;
  animation: vf-fade-in 0.25s ease;
}

@keyframes vf-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.vf-sheet {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(100%, 480px);
  max-height: min(75dvh, 640px);
  background: #121212;
  border-radius: 12px 12px 0 0;
  z-index: 1101;
  display: flex;
  flex-direction: column;
  animation: vf-slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

@keyframes vf-slide-up {
  from { transform: translateX(-50%) translateY(100%); }
  to { transform: translateX(-50%) translateY(0); }
}

.vf-sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 2px;
  margin: 10px auto 4px;
  flex-shrink: 0;
}

.vf-sheet-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 8px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.vf-sheet-title {
  font-size: 14px;
  font-weight: 600;
  color: #f1f1f1;
}

.vf-sheet-close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.vf-comments-list {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 16px;
}

.vf-comments-list::-webkit-scrollbar {
  width: 4px;
}

.vf-comments-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}

.vf-comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}

.vf-comment-item.reply {
  margin-left: 28px;
  padding-left: 10px;
  border-left: 2px solid rgba(255,255,255,0.08);
}

.vf-comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.vf-comment-avatar:hover {
  outline: 1px solid rgba(255,255,255,0.25);
}

.vf-comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-comment-body {
  flex: 1;
  min-width: 0;
}

.vf-comment-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.vf-comment-user {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
}

.vf-comment-user:hover {
  color: #fff;
  text-decoration: underline;
}

.vf-comment-time {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}

.vf-comment-text {
  font-size: 14px;
  line-height: 1.45;
  color: #f1f1f1;
  word-break: break-word;
}

.vf-comment-text.hidden {
  color: rgba(255,255,255,0.4);
  font-style: italic;
}

.vf-comment-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.vf-comment-vote {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.vf-comment-vote:hover {
  color: rgba(255,255,255,0.8);
}

.vf-comment-vote.liked {
  color: #fe2c55;
}

.vf-comment-vote.disliked {
  color: #8b9cff;
}

.vf-comment-reply {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
}

.vf-comment-reply:hover {
  color: #fff;
}

.vf-comment-delete {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
}

.vf-comment-delete:hover {
  color: #f5a9a3;
}

.vf-comment-delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.vf-reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px 0;
  color: rgba(255,255,255,0.55);
  font-size: 12px;
  background: #121212;
  border-top: 1px solid rgba(110, 168, 254, 0.18);
}

.vf-reply-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(110, 168, 254, 0.2);
  color: #8eb8ff;
  font-weight: 700;
}

.vf-reply-cancel {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 2px;
}

.vf-reply-cancel:hover {
  color: #fff;
}

.vf-empty-comments {
  text-align: center;
  padding: 48px 20px;
  color: rgba(255,255,255,0.4);
  font-size: 14px;
}

.vf-comments-loading {
  text-align: center;
  padding: 32px;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
}

.vf-sheet-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  background: #121212;
}

.vf-comment-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.vf-comment-input-backdrop {
  position: absolute;
  inset: 0;
  padding: 10px 16px;
  border-radius: 20px;
  font: 14px/1.35 inherit;
  white-space: pre;
  overflow: hidden;
  color: #fff;
  pointer-events: none;
  z-index: 0;
}

.vf-comment-input-mention {
  color: #8eb8ff;
  font-weight: 700;
  background: rgba(110, 168, 254, 0.22);
  border-radius: 4px;
}

.vf-sheet-input input {
  position: relative;
  z-index: 1;
  width: 100%;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 20px;
  padding: 10px 16px;
  color: transparent;
  caret-color: #fff;
  font-size: 14px;
  line-height: 1.35;
  outline: none;
}

.vf-sheet-input input::placeholder {
  color: rgba(255,255,255,0.35);
  opacity: 1;
}

.vf-comment-mention {
  display: inline;
  margin: 0;
  padding: 0 2px;
  border: none;
  border-radius: 3px;
  background: rgba(110, 168, 254, 0.18);
  color: #8eb8ff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.vf-comment-mention:hover {
  text-decoration: underline;
}

.vf-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #fe2c55;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.vf-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .vf-phone {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .vf-actions {
    right: 8px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .vf-bottom-info {
    right: 56px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }

}

@media (min-width: 769px) {
  .vf-phone {
    height: 100%;
    width: auto;
    aspect-ratio: 9 / 16;
    max-width: min(480px, calc(100% - 32px));
    border-radius: 16px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 24px 64px rgba(0, 0, 0, 0.55);
  }

  .vf-actions {
    right: 12px;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .vf-bottom-info {
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  }
}

@media (max-width: 380px) {
  .vf-action-btn {
    width: 44px;
    height: 44px;
  }
  .vf-bottom-info {
    padding-left: 12px;
  }
  .vf-share-label {
    display: none;
  }
}
`;

interface VideoFeedProps {
  soundToks: SoundTok[];
  onLike: (id: string) => void;
  onCommentCountChange?: (id: string, count: number) => void;
  onDeleted?: (id: string) => void;
  initialIndex?: number;
  /** Fired when the user is near the end — used to prefetch the next page. */
  onNearEnd?: () => void;
}

function CommentAvatar({
  author,
  onOpen,
}: {
  author: Comment['author'];
  onOpen: () => void;
}) {
  const url = resolveMediaUrl(author.avatar);
  const label = (author.displayName || author.username)[0]?.toUpperCase() ?? '?';

  return (
    <button type="button" className="vf-comment-avatar" onClick={onOpen} title={`@${author.username}`}>
      {url ? <img src={url} alt={author.username} /> : label}
    </button>
  );
}

export default function VideoFeed({
  soundToks,
  onLike,
  onCommentCountChange,
  onDeleted,
  initialIndex = 0,
  onNearEnd,
}: VideoFeedProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [followedAuthors, setFollowedAuthors] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(soundToks.length - 1, 0))
  );
  const [shareTok, setShareTok] = useState<SoundTok | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [currentSoundTokId, setCurrentSoundTokId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deletingSoundTokId, setDeletingSoundTokId] = useState<string | null>(null);
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});

  const [isPaused, setIsPaused] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => shouldPreferSoundTokAudio());
  const [descExpanded, setDescExpanded] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const bedAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  const commentsOpenRef = useRef(false);
  const isPausedRef = useRef(false);
  const soundToksRef = useRef(soundToks);
  soundToksRef.current = soundToks;

  const usesExternalSound = (tok: SoundTok | undefined) =>
    Boolean(tok?.sound?.audioUrl && tok.sound.audioUrl !== tok.videoUrl);

  const openSoundPage = async (tok: SoundTok, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const existingId = tok.sound?.id || tok.soundId;
      if (existingId) {
        navigate(`/soundtok/sound/${existingId}`);
        return;
      }
      const sound = await soundsApi.fromVideo(tok.id);
      navigate(`/soundtok/sound/${sound.id}`);
    } catch (err) {
      console.error('Failed to open sound page:', err);
    }
  };

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchLastY = useRef(0);
  const touchVelocity = useRef(0);
  const lastTouchTime = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastWheelTime = useRef(0);
  const wheelVelocity = useRef(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const FLING_VELOCITY_THRESHOLD = 0.5;
  const DRAG_THRESHOLD = 80;

  const getCommentCount = (tok: SoundTok) =>
    localCounts[tok.id] ?? tok.commentsCount ?? 0;

  const toggleFollow = async (authorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwnVideo(authorId) || followLoading[authorId]) return;

    const wasFollowing = !!followedAuthors[authorId];
    setFollowedAuthors((prev) => ({ ...prev, [authorId]: !wasFollowing }));
    setFollowLoading((prev) => ({ ...prev, [authorId]: true }));

    try {
      if (wasFollowing) {
        await followsApi.unfollow(authorId);
      } else {
        await followsApi.follow(authorId);
      }
    } catch (error) {
      setFollowedAuthors((prev) => ({ ...prev, [authorId]: wasFollowing }));
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [authorId]: false }));
    }
  };

  const isOwnVideo = (authorId: string) => currentUser?.id === authorId;

  useEffect(() => {
    if (soundToks.length === 0) return;
    const safeIndex = Math.min(Math.max(initialIndex, 0), soundToks.length - 1);
    setCurrentIndex(safeIndex);
  }, [initialIndex, soundToks.length]);

  useEffect(() => {
    if (!onNearEnd || soundToks.length === 0) return;
    if (currentIndex >= soundToks.length - 3) {
      onNearEnd();
    }
  }, [currentIndex, soundToks.length, onNearEnd]);

  useEffect(() => {
    if (!currentUser) return;

    const fromVideos: Record<string, boolean> = {};
    soundToks.forEach((tok) => {
      if (tok.authorIsFollowed) {
        fromVideos[tok.authorId] = true;
      }
    });

    if (Object.keys(fromVideos).length > 0) {
      setFollowedAuthors((prev) => ({ ...prev, ...fromVideos }));
      return;
    }

    followsApi
      .getFollowingIds()
      .then((ids) => {
        const map: Record<string, boolean> = {};
        ids.forEach((id) => {
          map[id] = true;
        });
        setFollowedAuthors((prev) => ({ ...prev, ...map }));
      })
      .catch((error) => console.error('Failed to load following:', error));
  }, [currentUser, soundToks]);

  useEffect(() => {
    const counts: Record<string, number> = {};
    soundToks.forEach((t) => {
      counts[t.id] = t.commentsCount ?? 0;
    });
    setLocalCounts(counts);
  }, [soundToks]);

  useEffect(() => {
    commentsOpenRef.current = commentsOpen;
  }, [commentsOpen]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (commentsOpen) {
      setTimeout(() => commentInputRef.current?.focus(), 350);
    }
  }, [commentsOpen]);

  const enableSound = useCallback(() => {
    unlockMediaPlayback();
    setSoundTokAudioPreference(true);
    const tok = soundToksRef.current[currentIndex];
    const external = usesExternalSound(tok);
    const video = videoRefs.current[currentIndex];
    const bed = bedAudioRefs.current[currentIndex];
    if (soundEnabledRef.current) {
      if (video) {
        video.muted = external ? true : false;
        void video.play().catch(() => undefined);
      }
      if (external && bed) {
        bed.muted = false;
        void bed.play().catch(() => undefined);
      }
      return;
    }
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    if (video) {
      video.muted = external ? true : false;
      void video.play().catch(() => undefined);
    }
    if (external && bed) {
      bed.muted = false;
      void bed.play().catch(() => undefined);
    }
  }, [currentIndex]);

  const playVideoAt = useCallback(async (index: number) => {
    if (commentsOpenRef.current || isPausedRef.current) return;

    videoRefs.current.forEach((video, i) => {
      if (!video || i === index) return;
      video.pause();
      video.muted = true;
    });
    bedAudioRefs.current.forEach((audio, i) => {
      if (!audio || i === index) return;
      audio.pause();
      audio.muted = true;
    });

    const video = videoRefs.current[index];
    if (!video) return;
    const tok = soundToksRef.current[index];
    const external = usesExternalSound(tok);
    const bed = bedAudioRefs.current[index];

    if (video.readyState >= 2) {
      setVideoLoading(false);
    } else {
      setVideoLoading(true);
    }

    const wantSound = soundEnabledRef.current;
    try {
      video.muted = external ? true : !wantSound;
      if (external && bed) {
        try {
          bed.currentTime = video.currentTime || 0;
        } catch {
          /* ignore seek errors */
        }
        bed.muted = !wantSound;
        if (wantSound) void bed.play().catch(() => undefined);
        else bed.pause();
      }
      await video.play();
      setVideoLoading(false);
      if (wantSound) setSoundTokAudioPreference(true);
    } catch {
      // Browser blocked unmuted autoplay — keep video playing muted until next gesture.
      try {
        video.muted = true;
        soundEnabledRef.current = false;
        setSoundEnabled(false);
        if (bed) {
          bed.muted = true;
          bed.pause();
        }
        await video.play();
        setVideoLoading(false);
      } catch {
        setVideoLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setDescExpanded(false);
    setIsPaused(false);
    isPausedRef.current = false;
    playVideoAt(currentIndex);
  }, [currentIndex, playVideoAt]);

  useEffect(() => {
    if (isPaused) {
      videoRefs.current[currentIndex]?.pause();
    } else {
      playVideoAt(currentIndex);
    }
  }, [isPaused, currentIndex, playVideoAt]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const unlockOnGesture = () => {
      enableSound();
    };

    stage.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    stage.addEventListener('wheel', unlockOnGesture, { passive: true });
    return () => {
      stage.removeEventListener('pointerdown', unlockOnGesture);
      stage.removeEventListener('wheel', unlockOnGesture);
    };
  }, [enableSound]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (commentsOpen) return;
    enableSound();
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchLastY.current = touch.clientY;
    touchStartTime.current = Date.now();
    lastTouchTime.current = Date.now();
    touchVelocity.current = 0;
    setIsDragging(true);
    setIsAnimating(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || commentsOpen) return;
      const touch = e.touches[0];
      const currentY = touch.clientY;
      const diffY = touchStartY.current - currentY;
      const now = Date.now();
      const dt = now - lastTouchTime.current;
      if (dt > 0) {
        touchVelocity.current = (touchLastY.current - currentY) / dt;
      }
      lastTouchTime.current = now;
      touchLastY.current = currentY;
      let resistance = 1;
      if (currentIndex === 0 && diffY < 0) resistance = 0.4;
      if (currentIndex === soundToks.length - 1 && diffY > 0) resistance = 0.4;
      setDragOffset(diffY * resistance);
    },
    [isDragging, commentsOpen, currentIndex, soundToks.length]
  );

  const springToPosition = useCallback(
    (targetOffset: number, targetIndex: number | null = null) => {
      setIsAnimating(true);
      setIsDragging(false);
      const startOffset = dragOffset;
      const startTime = performance.now();
      const duration = targetIndex === null ? 180 : 280;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDragOffset(startOffset + (targetOffset - startOffset) * eased);
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDragOffset(0);
          setIsAnimating(false);
          if (targetIndex !== null) setCurrentIndex(targetIndex);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    },
    [dragOffset]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || commentsOpen) return;
    const dragDistance = dragOffset;
    const velocity = touchVelocity.current;
    const dragDuration = Date.now() - touchStartTime.current;
    const isFlingUp = velocity > FLING_VELOCITY_THRESHOLD && dragDuration < 300;
    const isFlingDown = velocity < -FLING_VELOCITY_THRESHOLD && dragDuration < 300;
    const isSwipeUp = dragDistance > DRAG_THRESHOLD;
    const isSwipeDown = dragDistance < -DRAG_THRESHOLD;
    const stageHeight = stageRef.current?.clientHeight || window.innerHeight;

    if ((isFlingUp || isSwipeUp) && currentIndex < soundToks.length - 1) {
      springToPosition(stageHeight, currentIndex + 1);
    } else if ((isFlingDown || isSwipeDown) && currentIndex > 0) {
      springToPosition(-stageHeight, currentIndex - 1);
    } else {
      springToPosition(0);
    }
  }, [isDragging, commentsOpen, dragOffset, currentIndex, soundToks.length, springToPosition]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (commentsOpen) return;
      e.preventDefault();
      enableSound();
      const now = Date.now();
      const deltaTime = now - lastWheelTime.current;
      wheelVelocity.current += e.deltaY * 0.1;
      const throttleTime = Math.max(150, 350 - Math.abs(wheelVelocity.current) * 50);
      if (deltaTime < throttleTime) return;
      lastWheelTime.current = now;
      wheelVelocity.current *= 0.7;
      if (Math.abs(wheelVelocity.current) > 3) {
        if (wheelVelocity.current > 0 && currentIndex < soundToks.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          wheelVelocity.current = 0;
        } else if (wheelVelocity.current < 0 && currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
          wheelVelocity.current = 0;
        }
      }
    },
    [commentsOpen, currentIndex, soundToks.length, enableSound]
  );

  const openComments = async (id: string) => {
    setCurrentSoundTokId(id);
    setCommentsOpen(true);
    setComments([]);
    setReplyTo(null);
    setNewComment('');
    setCommentsLoading(true);
    try {
      const data = await soundTokApi.getComments(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeComments = () => {
    setCommentsOpen(false);
    setCurrentSoundTokId(null);
    setNewComment('');
    setReplyTo(null);
  };

  const startReply = (comment: Comment) => {
    const rootId = comment.parentId || comment.id;
    const username = comment.author.username;
    const mention = `@${username} `;
    setReplyTo({ id: rootId, username });
    setNewComment((prev) => {
      const withoutOldMention = prev.replace(/^@[a-zA-Z0-9._]+ /, '');
      return `${mention}${withoutOldMention}`;
    });
    window.setTimeout(() => {
      const input = commentInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(mention.length, mention.length);
    }, 0);
  };

  const cancelReply = () => {
    setNewComment((prev) => {
      if (!replyTo) return prev;
      const mention = `@${replyTo.username} `;
      return prev.startsWith(mention) ? prev.slice(mention.length) : prev;
    });
    setReplyTo(null);
  };

  const openCommentProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSoundTokId || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    const text = newComment.trim();
    const parentId = replyTo?.id;
    const parentUsername = replyTo?.username;
    setNewComment('');
    setReplyTo(null);

    try {
      const { comment, commentsCount } = await soundTokApi.createComment(
        currentSoundTokId,
        text,
        parentId,
      );
      setComments((prev) => [comment, ...prev]);
      setLocalCounts((prev) => ({ ...prev, [currentSoundTokId]: commentsCount }));
      onCommentCountChange?.(currentSoundTokId, commentsCount);
    } catch (error) {
      console.error('Failed to create comment:', error);
      setNewComment(text);
      if (parentId && parentUsername) {
        setReplyTo({ id: parentId, username: parentUsername });
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const applyCommentVote = (
    commentId: string,
    result: {
      likes: number;
      dislikes: number;
      isLiked: boolean;
      isDisliked: boolean;
      isHidden: boolean;
      text: string;
    },
  ) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likes: result.likes,
              dislikes: result.dislikes,
              isLiked: result.isLiked,
              isDisliked: result.isDisliked,
              isHidden: result.isHidden,
              text: result.text,
            }
          : c,
      ),
    );
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentSoundTokId || votingCommentId) return;
    setVotingCommentId(commentId);
    try {
      const result = await soundTokApi.likeComment(currentSoundTokId, commentId);
      applyCommentVote(commentId, result);
    } catch (error) {
      console.error('Failed to like comment:', error);
    } finally {
      setVotingCommentId(null);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!currentSoundTokId || votingCommentId) return;
    setVotingCommentId(commentId);
    try {
      const result = await soundTokApi.dislikeComment(currentSoundTokId, commentId);
      applyCommentVote(commentId, result);
    } catch (error) {
      console.error('Failed to dislike comment:', error);
    } finally {
      setVotingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentSoundTokId || deletingCommentId) return;
    if (!window.confirm('Удалить этот комментарий?')) return;
    setDeletingCommentId(commentId);
    try {
      const result = await soundTokApi.deleteComment(currentSoundTokId, commentId);
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
      );
      setLocalCounts((prev) => ({ ...prev, [currentSoundTokId]: result.commentsCount }));
      onCommentCountChange?.(currentSoundTokId, result.commentsCount);
      setReplyTo((current) => (current?.id === commentId ? null : current));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteSoundTok = async (id: string) => {
    if (deletingSoundTokId) return;
    if (!window.confirm('Удалить это видео из SoundTok?')) return;
    setDeletingSoundTokId(id);
    try {
      await soundTokApi.deleteSoundTok(id);
      if (currentSoundTokId === id) closeComments();
      onDeleted?.(id);
    } catch (error) {
      console.error('Failed to delete SoundTok:', error);
    } finally {
      setDeletingSoundTokId(null);
    }
  };

  const sheetCommentCount = currentSoundTokId
    ? localCounts[currentSoundTokId] ??
      soundToks.find((t) => t.id === currentSoundTokId)?.commentsCount ??
      0
    : 0;

  if (!soundToks.length) {
    return (
      <div className="vf-root">
        <style>{css}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
          Нет видео
        </div>
      </div>
    );
  }

  return (
    <div className="vf-root">
      <style>{css}</style>

      <div className="vf-phone">
        <div
          ref={stageRef}
          className="vf-stage"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <div className="vf-top-bar">
            <span className="vf-top-title">SoundTok</span>
          </div>

          {soundToks.map((soundTok, index) => {
          const isActive = index === currentIndex;
          const commentCount = getCommentCount(soundTok);
          const authorAvatar = resolveMediaUrl(soundTok.author?.avatar);

          return (
            <div
              key={soundTok.id}
              className="vf-video-container"
              style={{
                transform: `translateY(calc(${(index - currentIndex) * 100}% - ${dragOffset}px))`,
                opacity:
                  isDragging || isAnimating
                    ? Math.abs(index - currentIndex) <= 1
                      ? 1
                      : 0
                    : isActive
                      ? 1
                      : 0,
                transition:
                  isDragging || isAnimating ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 10 : 0,
              }}
            >
              <video
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                src={`${API_ORIGIN}${soundTok.videoUrl}`}
                className="vf-video"
                loop
                playsInline
                preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'metadata'}
                muted={
                  index !== currentIndex ||
                  !soundEnabled ||
                  usesExternalSound(soundTok)
                }
                onLoadedData={() => {
                  if (index === currentIndex && !commentsOpenRef.current && !isPausedRef.current) {
                    playVideoAt(index);
                  }
                }}
                onCanPlay={() => {
                  if (index === currentIndex && !commentsOpenRef.current && !isPausedRef.current) {
                    playVideoAt(index);
                  }
                }}
                onWaiting={() => {
                  if (index === currentIndex && !commentsOpenRef.current && !isPausedRef.current) {
                    setVideoLoading(true);
                  }
                }}
                onPlaying={() => {
                  if (index === currentIndex) setVideoLoading(false);
                }}
                onTimeUpdate={() => {
                  if (index !== currentIndex || !usesExternalSound(soundTok)) return;
                  const bed = bedAudioRefs.current[index];
                  const video = videoRefs.current[index];
                  if (!bed || !video || bed.paused) return;
                  if (Math.abs((bed.currentTime || 0) - (video.currentTime || 0)) > 0.35) {
                    try {
                      bed.currentTime = video.currentTime;
                    } catch {
                      /* ignore */
                    }
                  }
                }}
                onClick={() => {
                  if (!isActive) return;
                  const video = videoRefs.current[index];
                  if (!video) return;
                  enableSound();
                  const bed = bedAudioRefs.current[index];
                  if (isPaused) {
                    video.play().catch(() => {});
                    if (usesExternalSound(soundTok) && bed && soundEnabledRef.current) {
                      bed.muted = false;
                      void bed.play().catch(() => {});
                    }
                    setIsPaused(false);
                  } else {
                    video.pause();
                    bed?.pause();
                    setIsPaused(true);
                  }
                }}
              />
              {usesExternalSound(soundTok) && soundTok.sound?.audioUrl && (
                <audio
                  ref={(el) => {
                    bedAudioRefs.current[index] = el;
                  }}
                  src={`${API_ORIGIN}${soundTok.sound.audioUrl}`}
                  loop
                  preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'metadata'}
                />
              )}

              {isActive && videoLoading && !isPaused && !commentsOpen && (
                <div className="vf-video-loading" aria-hidden />
              )}

              {isActive && isPaused && !commentsOpen && (
                <div className="vf-pause-overlay">
                  <Play size={64} fill="white" />
                </div>
              )}

              {isActive && (
                <>
                  <div className="vf-gradient-top" />
                  <div className="vf-gradient-bottom" />

                  <div className="vf-bottom-info">
                    <div className="vf-author-row">
                      <span className="vf-author-name">
                        @{soundTok.author?.username || 'user'}
                        <AdminBadge role={soundTok.author?.role} size={12} />
                      </span>
                    </div>
                    {soundTok.description && (
                      <>
                        <div className={`vf-description ${descExpanded ? 'vf-desc-expanded' : ''}`}>
                          {soundTok.description}
                        </div>
                        {soundTok.description.length > 80 && (
                          <button
                            type="button"
                            className="vf-desc-toggle"
                            onClick={() => setDescExpanded((v) => !v)}
                          >
                            {descExpanded ? 'Свернуть' : 'Ещё'}
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="vf-music-row"
                      onClick={(e) => void openSoundPage(soundTok, e)}
                    >
                      <Music2 size={14} className="vf-music-icon" />
                      <span>
                        {soundTok.sound?.title ||
                          `Оригинальный звук — ${soundTok.author?.username || 'user'}`}
                      </span>
                    </button>
                  </div>

                  <div className="vf-actions">
                    <div className="vf-author-block">
                      <div
                        className="vf-author-avatar"
                        onClick={() => navigate(`/profile/${soundTok.author?.username}`)}
                        title={soundTok.author?.username}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/profile/${soundTok.author?.username}`);
                        }}
                      >
                        {authorAvatar ? (
                          <img src={authorAvatar} alt={soundTok.author.username} />
                        ) : (
                          (soundTok.author?.username?.[0] ?? 'U').toUpperCase()
                        )}
                      </div>
                      {!isOwnVideo(soundTok.authorId) && (
                        <button
                          type="button"
                          className={`vf-follow-btn ${followedAuthors[soundTok.authorId] ? 'following' : ''}`}
                          onClick={(e) => toggleFollow(soundTok.authorId, e)}
                          aria-label={
                            followedAuthors[soundTok.authorId] ? 'Отписаться' : 'Подписаться'
                          }
                          title={followedAuthors[soundTok.authorId] ? 'Подписка оформлена' : 'Подписаться'}
                        >
                          {followedAuthors[soundTok.authorId] ? (
                            <Check size={12} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="vf-action-group">
                      <button
                        type="button"
                        className={`vf-action-btn ${soundTok.isLiked ? 'liked' : ''}`}
                        onClick={() => onLike(soundTok.id)}
                        aria-label="Нравится"
                      >
                        <Heart size={28} fill={soundTok.isLiked ? 'currentColor' : 'none'} strokeWidth={1.8} />
                      </button>
                      <span className="vf-action-count">{formatCount(soundTok.likes)}</span>
                    </div>

                    <div className="vf-action-group">
                      <button
                        type="button"
                        className="vf-action-btn"
                        onClick={() => openComments(soundTok.id)}
                        aria-label="Комментарии"
                      >
                        <MessageCircle size={28} strokeWidth={1.8} />
                      </button>
                      <span className="vf-action-count">{formatCount(commentCount)}</span>
                    </div>

                    <div className="vf-action-group">
                      <button
                        type="button"
                        className="vf-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareTok(soundTok);
                        }}
                        aria-label="Поделиться"
                      >
                        <Share2 size={26} strokeWidth={1.8} />
                      </button>
                      <span className="vf-action-count vf-share-label">Поделиться</span>
                    </div>

                    {isOwnVideo(soundTok.authorId) && (
                      <div className="vf-action-group">
                        <button
                          type="button"
                          className="vf-action-btn danger"
                          disabled={deletingSoundTokId === soundTok.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteSoundTok(soundTok.id);
                          }}
                          aria-label="Удалить видео"
                          title="Удалить"
                        >
                          <Trash2 size={24} strokeWidth={1.8} />
                        </button>
                        <span className="vf-action-count vf-share-label">
                          {deletingSoundTokId === soundTok.id ? '…' : 'Удалить'}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="vf-music-disc"
                      onClick={(e) => void openSoundPage(soundTok, e)}
                      aria-label="Открыть звук"
                    >
                      {authorAvatar ? (
                        <img src={authorAvatar} alt="" />
                      ) : (
                        <span className="vf-music-disc-letter">
                          {(soundTok.author?.username?.[0] ?? 'S').toUpperCase()}
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>

      </div>

      {commentsOpen && (
        <>
          <div className="vf-sheet-backdrop" onClick={closeComments} aria-hidden />
          <div className="vf-sheet" role="dialog" aria-label="Комментарии">
            <div className="vf-sheet-handle" />
            <div className="vf-sheet-header">
              <span className="vf-sheet-title">
                {sheetCommentCount === 0
                  ? 'Комментарии'
                  : `${formatCount(sheetCommentCount)} ${pluralizeComments(sheetCommentCount)}`}
              </span>
              <button type="button" className="vf-sheet-close" onClick={closeComments} aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>

            <div className="vf-comments-list">
              {commentsLoading ? (
                <div className="vf-comments-loading">Загрузка...</div>
              ) : comments.length === 0 ? (
                <div className="vf-empty-comments">
                  Пока нет комментариев.<br />
                  Будьте первым!
                </div>
              ) : (
                (() => {
                  const roots = comments.filter((c) => !c.parentId);
                  const repliesOf = (rootId: string) =>
                    comments
                      .filter((c) => c.parentId === rootId)
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                      );
                  const renderComment = (comment: Comment, isReply = false) => (
                    <div
                      key={comment.id}
                      className={`vf-comment-item${isReply ? ' reply' : ''}`}
                    >
                      <CommentAvatar
                        author={comment.author}
                        onOpen={() => openCommentProfile(comment.author.username)}
                      />
                      <div className="vf-comment-body">
                        <div className="vf-comment-meta">
                          <button
                            type="button"
                            className="vf-comment-user"
                            onClick={() => openCommentProfile(comment.author.username)}
                          >
                            {comment.author.displayName || comment.author.username}
                          </button>
                          <span className="vf-comment-time">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <div className={`vf-comment-text${comment.isHidden ? ' hidden' : ''}`}>
                          {renderTextWithMentions({
                            text: comment.text,
                            onMentionClick: (username) => openCommentProfile(username),
                            mentionClassName: 'vf-comment-mention',
                          })}
                        </div>
                        <div className="vf-comment-actions">
                          <button
                            type="button"
                            className={`vf-comment-vote${comment.isLiked ? ' liked' : ''}`}
                            title="Нравится"
                            disabled={votingCommentId === comment.id}
                            onClick={() => void handleLikeComment(comment.id)}
                          >
                            <Heart size={14} fill={comment.isLiked ? 'currentColor' : 'none'} />
                            <span>{formatCount(comment.likes ?? 0)}</span>
                          </button>
                          <button
                            type="button"
                            className={`vf-comment-vote${comment.isDisliked ? ' disliked' : ''}`}
                            title={comment.isDisliked ? 'Показать комментарий' : 'Не нравится'}
                            disabled={votingCommentId === comment.id}
                            onClick={() => void handleDislikeComment(comment.id)}
                          >
                            <ThumbsDown
                              size={14}
                              fill={comment.isDisliked ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            type="button"
                            className="vf-comment-reply"
                            onClick={() => startReply(comment)}
                          >
                            Ответить
                          </button>
                          {currentUser?.id === comment.authorId && (
                            <button
                              type="button"
                              className="vf-comment-delete"
                              title="Удалить комментарий"
                              disabled={deletingCommentId === comment.id}
                              onClick={() => void handleDeleteComment(comment.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return roots.flatMap((root) => [
                    renderComment(root, false),
                    ...repliesOf(root.id).map((reply) => renderComment(reply, true)),
                  ]);
                })()
              )}
            </div>

            {replyTo && (
              <div className="vf-reply-bar">
                <span>
                  Ответ для
                  <span className="vf-reply-chip">@{replyTo.username}</span>
                </span>
                <button
                  type="button"
                  className="vf-reply-cancel"
                  aria-label="Отменить ответ"
                  onClick={cancelReply}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form className="vf-sheet-input" onSubmit={handleSubmitComment}>
              <div className="vf-comment-input-wrap">
                {newComment && (
                  <div className="vf-comment-input-backdrop" aria-hidden>
                    {replyTo && newComment.startsWith(`@${replyTo.username}`) ? (
                      <>
                        <span className="vf-comment-input-mention">
                          @{replyTo.username}
                        </span>
                        {newComment.slice(`@${replyTo.username}`.length)}
                      </>
                    ) : (
                      newComment
                    )}
                  </div>
                )}
                <input
                  ref={commentInputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    replyTo ? `Ответ @${replyTo.username}…` : 'Добавить комментарий...'
                  }
                  maxLength={500}
                  disabled={submittingComment}
                />
              </div>
              <button
                type="submit"
                className="vf-send-btn"
                disabled={submittingComment || !newComment.trim()}
                aria-label="Отправить"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}

      <ShareSoundTokModal
        open={!!shareTok}
        soundTok={shareTok}
        onClose={() => setShareTok(null)}
      />
    </div>
  );
}
