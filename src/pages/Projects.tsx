import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Music, Film, Image, MoreHorizontal, Play, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.projects-root {
  --bg: #0b0b0b;
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --border: #232323;
  --border-mid: #2e2e2e;
  --border-hover: #3d3d3d;
  --text-primary: #f0ede8;
  --text-secondary: #6b6b6b;
  --text-muted: #3a3a3a;
  --accent: #e8e4dc;
  --accent-dim: #c5c0b8;
  --red: #c0392b;
  --red-dim: #1a0f0f;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text-primary);
}

.projects-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── AMBIENT ── */
.projects-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.12;
  animation: orb-float 24s ease-in-out infinite;
}
.ambient-orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(232, 228, 220, 0.12) 0%, transparent 70%);
  top: -200px;
  left: -100px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.1) 0%, transparent 70%);
  bottom: -150px;
  right: -100px;
  animation-delay: -8s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.06); }
  66% { transform: translate(-20px, 25px) scale(0.94); }
}
.projects-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.projects-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.012;
  background-image: 
    linear-gradient(rgba(232, 228, 220, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 220, 0.2) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* ── TOP BAR ── */
.projects-topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg);
}
.brand-mark svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}
.brand-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}
.project-count {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

/* ── CREATE BUTTON ── */
.create-btn {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 28px;
}
.create-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-elevated);
}
.create-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
}

/* ── TABS ── */
.projects-tabs {
  position: relative;
  z-index: 10;
  display: flex;
  gap: 2px;
  margin-bottom: 28px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  width: fit-content;
}
.projects-tab {
  padding: 8px 20px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.projects-tab:hover {
  color: var(--text-primary);
}
.projects-tab.active {
  color: var(--text-primary);
  background: var(--bg-surface);
}
.projects-tab + .projects-tab {
  border-left: 1px solid var(--border);
}

/* ── PROJECT GRID ── */
.projects-grid {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── PROJECT CARD ── */
.project-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.project-card:hover {
  border-color: var(--border-mid);
  background: var(--bg-elevated);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.project-card-preview {
  height: 140px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.project-card-icon {
  opacity: 0.3;
  color: var(--text-muted);
}
.project-card-icon svg {
  width: 40px;
  height: 40px;
  stroke-width: 1;
}
.project-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.project-card:hover .project-card-overlay {
  opacity: 1;
}
.play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg);
}
.play-btn svg {
  width: 18px;
  height: 18px;
  fill: var(--bg);
  margin-left: 2px;
}
.project-card-body {
  padding: 14px 16px;
}
.project-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.project-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.project-card-type {
  font-family: 'DM Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.project-card-date {
  font-family: 'DM Mono', monospace;
  font-size: 9.5px;
  color: var(--text-muted);
}
.project-card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.project-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'DM Mono', monospace;
  font-size: 9.5px;
  color: var(--text-muted);
}
.project-stat svg {
  width: 12px;
  height: 12px;
}

/* ── EMPTY STATE ── */
.empty-state {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 80px 24px;
  border: 1px dashed var(--border-mid);
  border-radius: 14px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.35;
  color: var(--text-muted);
}
.empty-title {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── RESPONSIVE ── */
@media (max-width: 600px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
`;

// ── Types ──
interface Project {
  id: string;
  title: string;
  type: 'music' | 'video' | 'image';
  tracksCount?: number;
  clipsCount?: number;
  imagesCount?: number;
  collaboratorsCount?: number;
  updatedAt: string;
}

// ── Mock Data ──
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Альбом "Рассвет"',
    type: 'music',
    tracksCount: 12,
    collaboratorsCount: 3,
    updatedAt: '2026-05-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Клип "Город огней"',
    type: 'video',
    clipsCount: 3,
    collaboratorsCount: 5,
    updatedAt: '2026-04-28T15:30:00Z',
  },
  {
    id: '3',
    title: 'Обложки альбомов',
    type: 'image',
    imagesCount: 8,
    collaboratorsCount: 2,
    updatedAt: '2026-04-25T09:00:00Z',
  },
  {
    id: '4',
    title: 'Подкаст "Звуки"',
    type: 'music',
    tracksCount: 24,
    collaboratorsCount: 4,
    updatedAt: '2026-04-20T12:00:00Z',
  },
  {
    id: '5',
    title: 'Видео-арт проект',
    type: 'video',
    clipsCount: 6,
    collaboratorsCount: 7,
    updatedAt: '2026-04-15T18:00:00Z',
  },
  {
    id: '6',
    title: 'Фотосессия',
    type: 'image',
    imagesCount: 45,
    collaboratorsCount: 1,
    updatedAt: '2026-04-10T14:00:00Z',
  },
];

// ── Utils ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'сегодня';
  if (days < 7) return `${days}д`;
  if (days < 30) return `${Math.floor(days / 7)}нед`;
  return `${Math.floor(days / 30)}мес`;
}

// ── Icons ──
const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

// ── Project Card ──
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const navigate = useNavigate();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music size={40} />;
      case 'video': return <Film size={40} />;
      case 'image': return <Image size={40} />;
      default: return <Folder size={40} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'music': return 'Музыка';
      case 'video': return 'Видео';
      case 'image': return 'Графика';
      default: return 'Проект';
    }
  };

  const getStats = () => {
    switch (project.type) {
      case 'music': return project.tracksCount ? `${project.tracksCount} треков` : '';
      case 'video': return project.clipsCount ? `${project.clipsCount} клипов` : '';
      case 'image': return project.imagesCount ? `${project.imagesCount} изображений` : '';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="project-card"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="project-card-preview">
        <div className="project-card-icon">
          {getTypeIcon(project.type)}
        </div>
        <div className="project-card-overlay">
          <div className="play-btn">
            <Play size={18} />
          </div>
        </div>
      </div>
      <div className="project-card-body">
        <div className="project-card-title">{project.title}</div>
        <div className="project-card-meta">
          <span className="project-card-type">{getTypeLabel(project.type)}</span>
          <span style={{ color: 'var(--border-mid)' }}>·</span>
          <span className="project-card-date">{timeAgo(project.updatedAt)}</span>
        </div>
        <div className="project-card-stats">
          <span className="project-stat">
            <Clock size={12} />
            {getStats()}
          </span>
          {project.collaboratorsCount && (
            <span className="project-stat">
              <Users size={12} />
              {project.collaboratorsCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──
export default function Projects() {
  const [activeTab, setActiveTab] = useState<'all' | 'music' | 'video' | 'image'>('all');
  const [projects] = useState<Project[]>(MOCK_PROJECTS);

  const filteredProjects = activeTab === 'all' 
    ? projects 
    : projects.filter(p => p.type === activeTab);

  return (
    <div className="projects-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="projects-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="projects-noise" />
      <div className="projects-grid-bg" />

      <div className="projects-wrapper">
        {/* Top Bar */}
        <div className="projects-topbar">
          <div className="topbar-left">
            <div className="brand-mark">
              <IconFolder />
            </div>
            <span className="brand-text">Проекты</span>
          </div>
          <span className="project-count">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'проект' : filteredProjects.length < 5 ? 'проекта' : 'проектов'}
          </span>
        </div>

        {/* Create Button */}
        <button className="create-btn">
          <Plus size={16} />
          <span>Создать новый проект</span>
        </button>

        {/* Tabs */}
        <div className="projects-tabs">
          {[
            { key: 'all', label: 'Все' },
            { key: 'music', label: 'Музыка' },
            { key: 'video', label: 'Видео' },
            { key: 'image', label: 'Графика' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`projects-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="projects-grid">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, idx) => (
                <ProjectCard key={project.id} project={project} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State */
          <div className="empty-state">
            <div className="empty-icon">
              <Folder size={40} />
            </div>
            <div className="empty-title">
              {activeTab !== 'all' ? 'Нет проектов в этой категории' : 'Нет проектов'}
            </div>
            <div className="empty-hint">
              {activeTab !== 'all' 
                ? 'Создайте проект в другой категории'
                : 'Создайте свой первый проект и начните творить'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}