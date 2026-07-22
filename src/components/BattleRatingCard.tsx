import type { CSSProperties } from 'react';

export type BattleRatingInfo = {
  battleElo?: number;
  battleWins?: number;
  battleLosses?: number;
  battleDraws?: number;
  battleGames?: number;
  rankLabel?: string;
  rankMin?: number;
  rankMax?: number;
  nextRankLabel?: string | null;
  nextRankMin?: number | null;
  progressInRank?: number;
  scaleProgress?: number;
};

const RANKS = [
  { label: 'Новичок', min: 0 },
  { label: 'Любитель', min: 900 },
  { label: 'Боец', min: 1100 },
  { label: 'Профи', min: 1300 },
  { label: 'Элита', min: 1500 },
  { label: 'Легенда', min: 1700 },
];

const css = `
.brc {
  border: 1px solid var(--border, #232323);
  border-radius: 14px;
  padding: 18px 18px 16px;
  background: var(--bg-surface, #111);
  margin-bottom: 28px;
}
.brc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.brc-kicker {
  font-family: 'DM Mono', 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #3a3a3a);
  margin-bottom: 4px;
}
.brc-rank {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary, #f0ede8);
  line-height: 1.1;
}
.brc-elo {
  font-family: 'DM Mono', 'IBM Plex Mono', monospace;
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary, #f0ede8);
}
.brc-record {
  font-family: 'DM Mono', 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary, #6b6b6b);
  margin-top: 4px;
  text-align: right;
}
.brc-track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
  margin: 10px 0 8px;
}
.brc-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c5c0b8 0%, #f0ede8 55%, #e8a87c 100%);
  transition: width 0.45s ease;
}
.brc-marks {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-top: 2px;
}
.brc-mark {
  font-family: 'DM Mono', 'IBM Plex Mono', monospace;
  font-size: 9px;
  color: var(--text-muted, #3a3a3a);
  letter-spacing: 0.02em;
}
.brc-mark.active { color: var(--text-secondary, #6b6b6b); }
.brc-next {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary, #6b6b6b);
}
.brc-next strong { color: var(--text-primary, #f0ede8); font-weight: 600; }
`;

export default function BattleRatingCard({
  rating,
  compact = false,
  style,
}: {
  rating?: BattleRatingInfo | null;
  compact?: boolean;
  style?: CSSProperties;
}) {
  if (!rating || rating.battleElo == null) return null;

  const elo = rating.battleElo;
  const wins = rating.battleWins ?? 0;
  const losses = rating.battleLosses ?? 0;
  const draws = rating.battleDraws ?? 0;
  const scale = Math.min(100, Math.max(0, (rating.scaleProgress ?? elo / 2000) * 100));
  const rankLabel = rating.rankLabel || 'Любитель';
  const next = rating.nextRankLabel;
  const toNext = rating.nextRankMin != null ? Math.max(0, rating.nextRankMin - elo) : null;

  return (
    <div className="brc" style={style}>
      <style>{css}</style>
      <div className="brc-top">
        <div>
          <div className="brc-kicker">Rap Battle рейтинг</div>
          <div className="brc-rank">{rankLabel}</div>
        </div>
        <div>
          <div className="brc-elo">{elo}</div>
          <div className="brc-record">{wins}W · {losses}L · {draws}D</div>
        </div>
      </div>
      <div className="brc-track" aria-hidden>
        <div className="brc-fill" style={{ width: `${scale}%` }} />
      </div>
      {!compact && (
        <div className="brc-marks">
          {RANKS.map((r) => (
            <span key={r.label} className={`brc-mark${elo >= r.min ? ' active' : ''}`}>
              {r.min}
            </span>
          ))}
        </div>
      )}
      {next && toNext != null && (
        <div className="brc-next">
          До ранга <strong>{next}</strong> — ещё {toNext} Elo
        </div>
      )}
    </div>
  );
}
