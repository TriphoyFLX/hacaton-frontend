import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Pause, Upload, Users, Trophy, Send, Volume2, Disc, Clock, CheckCircle, XCircle, Sparkles, Save } from 'lucide-react';
import { getAvailableUsers, createBattle, getUserBattles, getBattleInvitations, respondToBattle, updateBattleBeat, uploadBeatFile, updateBattleStatus, saveBattleRecording, getBattleRecordings, submitRating, User, Battle, BattleRecording } from '../api/battles';
import { useAuthStore } from '../store/authStore';

// ─────────────────────────────────────────────────────────
// DESIGN SYSTEM — matches Sidebar & Profile exactly
// ─────────────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const RAP_BATTLE_CSS = `
${FONT_IMPORT}

.rb {
  --bg:        #0b0b0b;
  --surf:      #111111;
  --elev:      #181818;
  --hov:       #141414;
  --b1:        #1a1a1a;
  --b2:        #232323;
  --b3:        #2e2e2e;
  --b4:        #3d3d3d;
  --t1:        #f0ede8;
  --t2:        #c5c0b8;
  --t3:        #5a5a5a;
  --t4:        #2e2e2e;
  --purple:    #9b7fd4;
  --purple-bg: #1e1530;
  --purple-bd: #2e2050;
  --green:     #4a8c4a;
  --green-bg:  #0f1a0f;
  --green-bd:  #1e2e1e;
  --red:       #c0392b;
  --red-bg:    #1a0f0f;
  --red-bd:    #2e1515;
  --amber:     #8a6c3a;
  --amber-bg:  #1a1510;
  --amber-bd:  #2a2010;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--t1);
}

/* ── LAYOUT ── */
.rb-wrap      { max-width: 1200px; margin: 0 auto; padding: 48px 28px 100px; }

/* ── TOPBAR ── */
.rb-topbar    { display:flex; align-items:center; justify-content:space-between;
                padding-bottom: 20px; border-bottom: 1px solid var(--b1); margin-bottom: 48px; }
.rb-page-label{ font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.14em;
                text-transform:uppercase; color:var(--t3); }
.rb-page-name { font-size:22px; font-weight:700; letter-spacing:-.03em; color:var(--t1); margin-top:3px; }
.rb-topbar-r  { display:flex; align-items:center; gap:8px; }

/* ── ICON BUTTONS ── */
.rb-btn-icon {
  display:flex; align-items:center; justify-content:center;
  width:32px; height:32px;
  border:1px solid var(--b1); border-radius:8px;
  background:transparent; cursor:pointer;
  transition:border-color .15s, background .15s, color .15s;
  color:var(--t3);
}
.rb-btn-icon:hover { border-color:var(--b3); background:var(--surf); color:var(--t1); }
.rb-btn-icon.danger:hover { border-color:var(--red); background:var(--red-bg); color:var(--red); }
.rb-btn-icon svg { width:14px; height:14px; stroke-width:1.5; }

/* ── STATUS BADGES ── */
.rb-badge {
  font-family:'DM Mono',monospace; font-size:9px; letter-spacing:.08em;
  text-transform:uppercase; padding:3px 8px; border-radius:5px; border:1px solid;
}
.rb-badge-purple { background:var(--purple-bg); color:var(--purple); border-color:var(--purple-bd); }
.rb-badge-green  { background:var(--green-bg);  color:var(--green);  border-color:var(--green-bd);  }
.rb-badge-amber  { background:var(--amber-bg);  color:var(--amber);  border-color:var(--amber-bd);  }
.rb-badge-red    { background:var(--red-bg);    color:var(--red);    border-color:var(--red-bd);    }
.rb-badge-muted  { background:var(--elev);      color:var(--t3);     border-color:var(--b2);        }

/* ── CARDS ── */
.rb-card {
  background:var(--surf); border:1px solid var(--b1);
  border-radius:12px; padding:24px; margin-bottom:20px;
  transition:border-color .15s;
}
.rb-card:hover { border-color:var(--b2); }
.rb-card-hd    { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
.rb-card-title { font-size:15px; font-weight:600; letter-spacing:-.01em; color:var(--t1); }
.rb-card-sub   { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.08em;
                 text-transform:uppercase; color:var(--t3); margin-top:3px; }

/* ── SECTION HEADINGS ── */
.rb-section-label {
  font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--t4); margin-bottom:12px; display:block;
}
.rb-divider { border:none; border-top:1px solid var(--b1); margin:24px 0; }

/* ── HERO EMPTY STATES ── */
.rb-hero {
  text-align:center; padding:64px 0 48px;
}
.rb-hero-icon {
  width:52px; height:52px; border:1px solid var(--b2); border-radius:12px;
  background:var(--elev); display:inline-flex; align-items:center; justify-content:center;
  margin-bottom:24px;
}
.rb-hero-icon svg { width:22px; height:22px; color:var(--t3); stroke-width:1.4; }
.rb-hero-title { font-size:24px; font-weight:700; letter-spacing:-.03em; margin-bottom:8px; color:var(--t1); }
.rb-hero-desc  { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:.06em;
                 color:var(--t3); margin-bottom:36px; }
.rb-hero-actions { display:flex; flex-direction:column; gap:8px; max-width:320px; margin:0 auto; }

/* ── BUTTONS ── */
.rb-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:0 18px; height:38px; border-radius:8px;
  font-family:'Syne',sans-serif; font-size:13px; font-weight:500;
  letter-spacing:-.01em; cursor:pointer;
  transition:background .15s, border-color .15s, color .15s;
  border:1px solid var(--b2); white-space:nowrap;
}
.rb-btn-primary {
  background:var(--t1); color:var(--bg); border-color:var(--t1);
}
.rb-btn-primary:hover { background:var(--t2); border-color:var(--t2); }
.rb-btn-ghost {
  background:transparent; color:var(--t2);
}
.rb-btn-ghost:hover { background:var(--hov); border-color:var(--b3); color:var(--t1); }
.rb-btn-danger { background:var(--red-bg); color:var(--red); border-color:var(--red-bd); }
.rb-btn-danger:hover { background:var(--red); color:var(--t1); border-color:var(--red); }
.rb-btn-purple { background:var(--purple-bg); color:var(--purple); border-color:var(--purple-bd); }
.rb-btn-purple:hover { border-color:var(--purple); }
.rb-btn-green  { background:var(--green-bg); color:var(--green); border-color:var(--green-bd); }
.rb-btn-green:hover { border-color:var(--green); }
.rb-btn:disabled { opacity:.4; cursor:not-allowed; }
.rb-btn.full    { width:100%; }
.rb-btn.tall    { height:44px; font-size:14px; }
.rb-btn svg     { width:14px; height:14px; stroke-width:1.6; flex-shrink:0; }

/* ── INPUTS ── */
.rb-input {
  width:100%; box-sizing:border-box;
  padding:11px 14px; border:1px solid var(--b2);
  border-radius:8px; background:var(--elev);
  color:var(--t1); font-family:'Syne',sans-serif; font-size:13.5px;
  transition:border-color .15s;
}
.rb-input:focus  { outline:none; border-color:var(--b4); }
.rb-input::placeholder { color:var(--t3); }
textarea.rb-input { resize:vertical; min-height:80px; line-height:1.6; }

.rb-label {
  display:block; font-family:'DM Mono',monospace;
  font-size:9.5px; letter-spacing:.12em; text-transform:uppercase;
  color:var(--t3); margin-bottom:8px;
}
.rb-field { margin-bottom:16px; }

/* ── FILE UPLOAD ── */
.rb-upload-zone {
  border:1px dashed var(--b3); border-radius:10px;
  padding:28px 20px; text-align:center; cursor:pointer;
  transition:border-color .15s, background .15s;
}
.rb-upload-zone:hover { border-color:var(--b4); background:var(--hov); }
.rb-upload-zone svg   { width:20px; height:20px; color:var(--t3); margin:0 auto 10px; stroke-width:1.4; }
.rb-upload-label      { font-size:13px; color:var(--t2); }
.rb-upload-hint       { font-family:'DM Mono',monospace; font-size:10px; color:var(--t3);
                        margin-top:4px; letter-spacing:.04em; }
.rb-upload-file {
  display:flex; align-items:center; gap:12px;
  padding:12px 14px; background:var(--elev);
  border:1px solid var(--b2); border-radius:8px; margin-top:10px;
}
.rb-upload-file-name { font-size:13px; color:var(--t2); flex:1; white-space:nowrap;
                       overflow:hidden; text-overflow:ellipsis; }

/* ── USER LIST ── */
.rb-user-list    { display:flex; flex-direction:column; gap:4px; max-height:240px;
                   overflow-y:auto; padding-right:2px; }
.rb-user-list::-webkit-scrollbar { width:3px; }
.rb-user-list::-webkit-scrollbar-track { background:transparent; }
.rb-user-list::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
.rb-user-row {
  display:flex; align-items:center; gap:12px;
  padding:10px 12px; border:1px solid transparent;
  border-radius:8px; cursor:pointer;
  transition:background .12s, border-color .12s;
  background:transparent;
}
.rb-user-row:hover   { background:var(--hov); border-color:var(--b2); }
.rb-user-row.sel     { background:var(--purple-bg); border-color:var(--purple-bd); }
.rb-user-avatar {
  width:34px; height:34px; border-radius:8px;
  background:var(--elev); border:1px solid var(--b2);
  display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:700; color:var(--t2); flex-shrink:0;
}
.rb-user-row.sel .rb-user-avatar { background:var(--purple-bg); border-color:var(--purple-bd); color:var(--purple); }
.rb-user-name  { font-size:13px; font-weight:500; color:var(--t2); flex:1;
                 text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rb-user-row.sel .rb-user-name { color:var(--purple); }
.rb-user-meta  { font-family:'DM Mono',monospace; font-size:9.5px; color:var(--t3);
                 margin-top:1px; }
.rb-user-check svg { width:13px; height:13px; color:var(--purple); stroke-width:2; }

/* ── BATTLE VS CARD ── */
.rb-vs-card {
  background:var(--elev); border:1px solid var(--b2);
  border-radius:10px; padding:20px 24px;
}
.rb-vs-row {
  display:flex; align-items:center; gap:0; justify-content:center;
}
.rb-vs-player  { flex:1; text-align:center; }
.rb-vs-label   { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:.1em;
                 text-transform:uppercase; color:var(--t3); margin-bottom:8px; }
.rb-vs-avatar  {
  width:44px; height:44px; border-radius:10px;
  background:var(--surf); border:1px solid var(--b3);
  display:inline-flex; align-items:center; justify-content:center;
  font-size:17px; font-weight:700; color:var(--t1);
  margin-bottom:8px;
}
.rb-vs-name    { font-size:13px; font-weight:600; color:var(--t1); }
.rb-vs-sep     { padding:0 20px; }
.rb-vs-sep-text{
  font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.1em;
  color:var(--t4); text-transform:uppercase;
}

/* ── AUDIO PLAYER ── */
.rb-player {
  background:var(--elev); border:1px solid var(--b1);
  border-radius:10px; padding:18px 20px;
}
.rb-player-hd  { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.rb-player-title { font-size:13px; font-weight:600; color:var(--t1); }
.rb-player-indicators { display:flex; gap:6px; margin-bottom:14px; }
.rb-player-controls {
  display:flex; align-items:center; justify-content:center; gap:12px;
}
.rb-play-btn {
  width:40px; height:40px; border-radius:50%;
  background:var(--surf); border:1px solid var(--b3);
  color:var(--t1); display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:background .15s, border-color .15s;
  flex-shrink:0;
}
.rb-play-btn:hover:not(:disabled) { background:var(--hov); border-color:var(--b4); }
.rb-play-btn:disabled { opacity:.4; cursor:not-allowed; }
.rb-play-btn.playing  { border-color:var(--t3); }
.rb-play-btn svg  { width:15px; height:15px; }
.rb-vol-btn {
  width:32px; height:32px; border-radius:7px;
  background:transparent; border:1px solid var(--b2);
  color:var(--t3); display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .15s;
}
.rb-vol-btn:hover { border-color:var(--b3); color:var(--t2); }
.rb-vol-btn svg { width:13px; height:13px; stroke-width:1.5; }

/* ── VOLUME PANEL ── */
.rb-vol-panel {
  background:var(--surf); border:1px solid var(--b1);
  border-radius:10px; padding:18px 20px; margin-top:12px;
}
.rb-vol-head   { font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:.12em;
                 text-transform:uppercase; color:var(--t3); margin-bottom:16px; }
.rb-vol-row    { margin-bottom:14px; }
.rb-vol-lbl    { display:flex; justify-content:space-between; margin-bottom:7px; }
.rb-vol-name   { font-size:12px; color:var(--t2); }
.rb-vol-val    { font-family:'DM Mono',monospace; font-size:10px; color:var(--t3); }
.rb-slider {
  width:100%; height:3px; border-radius:2px;
  background:var(--b2); outline:none;
  -webkit-appearance:none; appearance:none; cursor:pointer;
}
.rb-slider::-webkit-slider-thumb {
  -webkit-appearance:none; appearance:none;
  width:14px; height:14px; border-radius:50%;
  background:var(--t1); cursor:pointer; border:2px solid var(--bg);
}
.rb-slider::-moz-range-thumb {
  width:14px; height:14px; border-radius:50%;
  background:var(--t1); cursor:pointer; border:2px solid var(--bg);
}
.rb-vol-presets { display:flex; gap:6px; flex-wrap:wrap; margin-top:14px; border-top:1px solid var(--b1); padding-top:14px; }

/* ── RECORDING ── */
.rb-timer-display {
  font-size:64px; font-weight:700; letter-spacing:-.05em;
  color:var(--t1); font-family:'Syne',sans-serif; line-height:1;
  margin-bottom:6px;
}
.rb-timer-display.warn { color:var(--red); }
.rb-timer-sub {
  font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--t3); margin-bottom:20px;
}
.rb-progress-wrap { width:100%; background:var(--b1); border-radius:2px; height:2px; margin-bottom:28px; }
.rb-progress-bar  { height:2px; border-radius:2px; background:var(--t1); transition:width 1s linear; }
.rb-progress-bar.warn { background:var(--red); }
.rb-progress-bar.mid  { background:var(--amber); }

.rb-viz { display:flex; align-items:center; gap:2px; justify-content:center; height:40px; margin-bottom:24px; }
.rb-viz-bar {
  width:3px; border-radius:2px; background:var(--t3);
  transition:height .1s ease-out, background .1s;
}
.rb-viz-bar.active { background:var(--t2); }

.rb-mic-btn {
  width:72px; height:72px; border-radius:50%;
  background:var(--surf); border:1px solid var(--b3);
  color:var(--t2); display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .15s; margin:0 auto;
}
.rb-mic-btn:hover:not(:disabled) { border-color:var(--b4); background:var(--hov); color:var(--t1); }
.rb-mic-btn.recording { background:var(--red-bg); border-color:var(--red); color:var(--red); }
.rb-mic-btn:disabled  { opacity:.3; cursor:not-allowed; }
.rb-mic-btn svg { width:26px; height:26px; stroke-width:1.5; }

.rb-rec-dot {
  display:inline-block; width:7px; height:7px;
  border-radius:50%; background:var(--red);
  animation:rb-pulse 1.5s infinite;
}
@keyframes rb-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

/* ── QUALITY SELECTOR ── */
.rb-quality-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.rb-quality-btn {
  padding:10px 8px; border:1px solid var(--b2);
  border-radius:8px; background:transparent;
  cursor:pointer; text-align:center;
  transition:background .12s, border-color .12s;
  color:var(--t3);
}
.rb-quality-btn:hover { background:var(--hov); border-color:var(--b3); color:var(--t2); }
.rb-quality-btn.sel-low    { background:var(--red-bg);    border-color:var(--red-bd);    color:var(--red);    }
.rb-quality-btn.sel-medium { background:var(--amber-bg);  border-color:var(--amber-bd);  color:var(--amber);  }
.rb-quality-btn.sel-high   { background:var(--green-bg);  border-color:var(--green-bd);  color:var(--green);  }
.rb-quality-btn-label  { font-size:12px; font-weight:500; margin-bottom:2px; }
.rb-quality-btn-sub    { font-family:'DM Mono',monospace; font-size:9.5px; color:var(--t3); }

/* ── BEAT PLAYER ROW ── */
.rb-beat-row {
  display:flex; align-items:center; gap:12px;
  padding:12px 14px; background:var(--elev);
  border:1px solid var(--b2); border-radius:8px;
}
.rb-beat-icon { width:30px; height:30px; flex-shrink:0; }
.rb-beat-icon svg { width:14px; height:14px; color:var(--t3); }
.rb-beat-name { font-size:13px; color:var(--t2); flex:1;
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rb-beat-actions { display:flex; gap:6px; }

/* ── RECORDING CARD ── */
.rb-rec-card {
  background:var(--surf); border:1px solid var(--b1);
  border-radius:10px; padding:18px 20px; margin-bottom:14px;
}
.rb-rec-card-hd {
  display:flex; align-items:center; gap:12px; margin-bottom:14px;
}
.rb-rec-avatar {
  width:36px; height:36px; border-radius:8px;
  background:var(--elev); border:1px solid var(--b2);
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:700; color:var(--t1);
  flex-shrink:0;
}
.rb-rec-user  { font-size:13.5px; font-weight:600; color:var(--t1); }
.rb-rec-meta  { font-family:'DM Mono',monospace; font-size:9.5px; color:var(--t3); margin-top:2px; }

/* ── RATING ── */
.rb-stars { display:flex; gap:6px; justify-content:center; margin:24px 0; }
.rb-star-btn {
  width:42px; height:42px; border:1px solid var(--b2);
  border-radius:8px; background:var(--surf);
  font-size:18px; cursor:pointer; transition:all .15s;
  display:flex; align-items:center; justify-content:center;
}
.rb-star-btn:hover { background:var(--hov); border-color:var(--b3); }
.rb-star-btn.lit  { background:var(--purple-bg); border-color:var(--purple-bd); }

/* ── SCORE RESULT ── */
.rb-score-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
.rb-score-cell {
  padding:18px 16px; border:1px solid var(--b2);
  border-radius:10px; text-align:center;
  background:var(--surf);
}
.rb-score-cell.winner { border-color:var(--green-bd); background:var(--green-bg); }
.rb-score-num   { font-size:36px; font-weight:700; letter-spacing:-.04em; color:var(--t1); line-height:1; }
.rb-score-label { font-family:'DM Mono',monospace; font-size:9.5px; letter-spacing:.1em;
                  text-transform:uppercase; color:var(--t3); margin-top:4px; }
.rb-score-name  { font-size:13px; font-weight:500; color:var(--t2); margin-top:6px; }

/* ── HISTORY ── */
.rb-history-row {
  background:var(--surf); border:1px solid var(--b1);
  border-radius:10px; padding:18px 20px; margin-bottom:10px;
}
.rb-history-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.rb-history-title{ font-size:14px; font-weight:600; color:var(--t1); }
.rb-history-date { font-family:'DM Mono',monospace; font-size:10px; color:var(--t3); }

/* ── ALERTS ── */
.rb-alert {
  display:flex; align-items:center; justify-content:space-between;
  padding:11px 14px; border-radius:8px; border:1px solid;
  font-size:13px; margin-bottom:16px;
}
.rb-alert-error   { background:var(--red-bg);   color:var(--red);   border-color:var(--red-bd);   }
.rb-alert-success { background:var(--green-bg); color:var(--green); border-color:var(--green-bd); }
.rb-alert-close { background:none; border:none; cursor:pointer; color:inherit; font-size:16px; line-height:1; padding:0 0 0 8px; }

/* ── LOADING ── */
.rb-loading {
  display:flex; align-items:center; gap:10px; padding:24px;
  justify-content:center;
  font-family:'DM Mono',monospace; font-size:10.5px;
  letter-spacing:.1em; text-transform:uppercase; color:var(--t3);
}
.rb-spinner {
  width:14px; height:14px; border:1.5px solid var(--b2);
  border-top-color:var(--t1); border-radius:50%;
  animation:rb-spin 1s linear infinite; flex-shrink:0;
}
@keyframes rb-spin { to { transform:rotate(360deg); } }

/* ── WAITING PULSE ── */
.rb-pulse-ring {
  width:56px; height:56px; border-radius:50%;
  border:1px solid var(--b2); display:inline-flex;
  align-items:center; justify-content:center; margin-bottom:20px;
  animation:rb-ring 2s ease-in-out infinite;
}
@keyframes rb-ring { 0%,100%{border-color:var(--b2)} 50%{border-color:var(--b4)} }
.rb-pulse-ring svg { width:20px; height:20px; color:var(--t3); stroke-width:1.4; }

/* ── MISC ── */
.rb-turn-indicator {
  display:inline-flex; align-items:center; gap:8px;
  padding:6px 12px; border-radius:20px;
  border:1px solid var(--b2); background:var(--surf);
  font-family:'DM Mono',monospace; font-size:10px;
  letter-spacing:.06em; color:var(--t2); margin-bottom:28px;
}
.rb-turn-indicator.yours { border-color:var(--green-bd); background:var(--green-bg); color:var(--green); }
.rb-turn-indicator.wait  { border-color:var(--amber-bd); background:var(--amber-bg); color:var(--amber); }
.rb-centered { text-align:center; }
.rb-row  { display:flex; gap:8px; }
.rb-row.end   { justify-content:flex-end; }
.rb-row.center{ justify-content:center; }
.rb-mt8  { margin-top:8px; }
.rb-mt16 { margin-top:16px; }
.rb-mt24 { margin-top:24px; }
.rb-mb0  { margin-bottom:0 !important; }
.rb-info-row {
  display:flex; align-items:center; gap:10px;
  padding:10px 0; border-bottom:1px solid var(--b1);
  font-size:13px; color:var(--t2);
}
.rb-info-row:first-of-type { border-top:1px solid var(--b1); }
.rb-info-lbl {
  font-family:'DM Mono',monospace; font-size:10px; letter-spacing:.06em;
  text-transform:uppercase; color:var(--t3); min-width:100px;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .rb {
    padding-left: 0 !important;
  }
  .rb-wrap {
    padding: 24px 20px 100px !important;
    max-width: 100% !important;
  }
  .rb-topbar {
    padding-bottom: 16px !important;
    margin-bottom: 32px !important;
  }
  .rb-page-name {
    font-size: 20px !important;
  }
  .rb-hero {
    padding: 40px 0 32px !important;
  }
  .rb-hero-title {
    font-size: 22px !important;
  }
  .rb-vs-card {
    padding: 16px !important;
  }
  .rb-vs-avatar {
    width: 36px !important;
    height: 36px !important;
    font-size: 14px !important;
  }
  .rb-player {
    padding: 16px !important;
  }
  .rb-card {
    padding: 16px !important;
  }
  .rb-rec-card {
    padding: 16px !important;
  }
  .rb-timer-display {
    font-size: 48px !important;
  }
  .rb-mic-btn {
    width: 60px !important;
    height: 60px !important;
  }
  .rb-mic-btn svg {
    width: 22px !important;
    height: 22px !important;
  }
  .rb-quality-grid {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }
  .rb-stars {
    gap: 8px !important;
  }
  .rb-star-btn {
    width: 36px !important;
    height: 36px !important;
    font-size: 16px !important;
  }
  .rb-score-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}
`;

// ─────────────────────────────────────────────────────────
// INTERFACES (unchanged)
// ─────────────────────────────────────────────────────────
interface BattleState {
  currentBattle: Battle | null;
  currentPhase: string;
  user1Recording: BattleRecording | null;
  user2Recording: BattleRecording | null;
  beatUrl: string;
  recordingTime: number;
  recordingQuality: 'low' | 'medium' | 'high';
  isRecording: boolean;
  isPlayingBeat: boolean;
  hasRated: boolean;
  currentRound: 1 | 2;
  error: string;
  lastSaved: number;
}

interface BattlePersistence {
  saveBattleState: (state: Partial<BattleState>) => void;
  loadBattleState: () => BattleState | null;
  clearBattleState: () => void;
  autoSave: () => void;
}

// ─────────────────────────────────────────────────────────
// MIXED TRACK PLAYER — visual redesign, logic untouched
// ─────────────────────────────────────────────────────────
const MixedTrackPlayer = ({ voiceUrl, beatUrl, label, playerKey }: { voiceUrl: string; beatUrl: string; label: string; playerKey?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>('');
  const [voiceLoaded, setVoiceLoaded] = useState(false);
  const [beatLoaded, setBeatLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(80);
  const [beatVolume, setBeatVolume] = useState(40);
  const [masterVolume, setMasterVolume] = useState(100);

  const voiceAudioRef = useRef<HTMLAudioElement>(null);
  const beatAudioRef  = useRef<HTMLAudioElement>(null);
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    if (!voiceAudio || !voiceUrl) return;
    setLoading(true); setVoiceLoaded(false);
    const load = async () => {
      try {
        const fullUrl = voiceUrl.startsWith('http') ? voiceUrl : `http://localhost:5002${voiceUrl}`;
        voiceAudio.src = fullUrl; voiceAudio.crossOrigin = 'anonymous'; voiceAudio.load();
        await new Promise(res => { voiceAudio.oncanplay = () => res(void 0); voiceAudio.onerror = () => res(void 0); });
        setVoiceLoaded(true);
      } catch { setVoiceLoaded(true); } finally { setLoading(false); }
    };
    load();
  }, [voiceUrl, token]);

  useEffect(() => {
    const beatAudio = beatAudioRef.current;
    if (!beatAudio || !beatUrl) return;
    setLoading(true); setBeatLoaded(false);
    const load = async () => {
      try {
        const fullUrl = beatUrl.startsWith('http') ? beatUrl : `http://localhost:5002${beatUrl}`;
        beatAudio.src = fullUrl; beatAudio.crossOrigin = 'anonymous'; beatAudio.load();
        await new Promise(res => { beatAudio.oncanplay = () => res(void 0); beatAudio.onerror = () => res(void 0); });
        setBeatLoaded(true);
      } catch { setBeatLoaded(true); } finally { setLoading(false); }
    };
    load();
  }, [beatUrl, token]);

  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => new Promise(resolve => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const ab = new ArrayBuffer(44 + length); const view = new DataView(ab);
    const channels: Float32Array[] = []; let offset = 0; let pos = 0;
    const su16 = (d: number) => { view.setUint16(pos, d, true); pos += 2; };
    const su32 = (d: number) => { view.setUint32(pos, d, true); pos += 4; };
    su32(0x46464952); su32(36+length); su32(0x45564157);
    su32(0x20746d66); su32(16); su16(1); su16(buffer.numberOfChannels);
    su32(buffer.sampleRate); su32(buffer.sampleRate*2*buffer.numberOfChannels);
    su16(buffer.numberOfChannels*2); su16(16);
    su32(0x61746164); su32(length);
    for (let i=0;i<buffer.numberOfChannels;i++) channels.push(buffer.getChannelData(i));
    while (pos<44) { view.setUint8(pos,0); pos++; }
    while (offset<length) {
      for (let i=0;i<buffer.numberOfChannels;i++) {
        let s=Math.max(-1,Math.min(1,channels[i][offset]));
        s=s<0?s*0x8000:s*0x7FFF; view.setInt16(pos,s,true); pos+=2;
      }
      offset++;
    }
    resolve(new Blob([ab],{type:'audio/wav'}));
  });

  const playAudio = async () => {
    const v=voiceAudioRef.current, b=beatAudioRef.current;
    if (!v||!b||!voiceLoaded||!beatLoaded) { setError('Аудио ещё загружается...'); return; }
    try {
      v.currentTime=0; b.currentTime=0;
      v.volume=(voiceVolume/100)*(masterVolume/100);
      b.volume=(beatVolume/100)*(masterVolume/100);
      await Promise.allSettled([v.play(), b.play()]);
      setIsPlaying(true);
    } catch(e:any) { setError(`Ошибка: ${e.message}`); }
  };

  const stopAudio = () => {
    const v=voiceAudioRef.current, b=beatAudioRef.current;
    if(v){v.pause();v.currentTime=0;} if(b){b.pause();b.currentTime=0;}
    setIsPlaying(false);
  };

  useEffect(() => {
    const v=voiceAudioRef.current, b=beatAudioRef.current;
    if(!v||!b) return;
    const onEnd=()=>setIsPlaying(false);
    b.addEventListener('ended',onEnd);
    return ()=>b.removeEventListener('ended',onEnd);
  }, []);

  useEffect(()=>{ const v=voiceAudioRef.current; if(v) v.volume=(voiceVolume/100)*(masterVolume/100); },[voiceVolume,masterVolume]);
  useEffect(()=>{ const b=beatAudioRef.current;  if(b) b.volume=(beatVolume/100)*(masterVolume/100);  },[beatVolume,masterVolume]);

  const ready = voiceLoaded && beatLoaded;
  const statusClass = ready ? 'rb-badge-green' : loading ? 'rb-badge-muted' : 'rb-badge-red';
  const statusText  = ready ? 'Готово' : loading ? 'Загрузка' : 'Ошибка';

  return (
    <div className="rb-player">
      <div className="rb-player-hd">
        <span className="rb-player-title">{label}</span>
        <span className={`rb-badge ${statusClass}`}>{statusText}</span>
      </div>

      <div className="rb-player-indicators">
        <span className={`rb-badge ${voiceLoaded ? 'rb-badge-green' : 'rb-badge-muted'}`}>
          Голос {voiceLoaded ? '✓' : '—'}
        </span>
        <span className={`rb-badge ${beatLoaded ? 'rb-badge-green' : 'rb-badge-muted'}`}>
          Бит {beatLoaded ? '✓' : '—'}
        </span>
      </div>

      <div className="rb-player-controls">
        <button onClick={isPlaying ? stopAudio : playAudio}
          disabled={(!voiceLoaded && !beatLoaded) || loading}
          className={`rb-play-btn${isPlaying?' playing':''}`}>
          {isPlaying ? <Pause size={15}/> : <Play size={15}/>}
        </button>
        <button onClick={()=>setShowVolumeControls(!showVolumeControls)} className="rb-vol-btn">
          <Volume2 size={13}/>
        </button>
      </div>

      {showVolumeControls && (
        <div className="rb-vol-panel">
          <div className="rb-vol-head">Микшер</div>
          {([['Голос', voiceVolume, setVoiceVolume], ['Бит', beatVolume, setBeatVolume], ['Мастер', masterVolume, setMasterVolume]] as const).map(([name, val, set]) => (
            <div className="rb-vol-row" key={String(name)}>
              <div className="rb-vol-lbl">
                <span className="rb-vol-name">{name as string}</span>
                <span className="rb-vol-val">{val as number}%</span>
              </div>
              <input type="range" min="0" max="100" value={val as number}
                onChange={e=>(set as (v:number)=>void)(Number(e.target.value))}
                className="rb-slider"/>
            </div>
          ))}
          <div className="rb-vol-presets">
            <button className="rb-btn rb-btn-ghost" style={{fontSize:'11px',height:'30px',padding:'0 10px'}}
              onClick={()=>{setVoiceVolume(80);setBeatVolume(40);setMasterVolume(100);}}>Стандарт</button>
            <button className="rb-btn rb-btn-ghost" style={{fontSize:'11px',height:'30px',padding:'0 10px'}}
              onClick={()=>{setVoiceVolume(100);setBeatVolume(20);setMasterVolume(90);}}>Акцент голос</button>
            <button className="rb-btn rb-btn-ghost" style={{fontSize:'11px',height:'30px',padding:'0 10px'}}
              onClick={()=>{setVoiceVolume(60);setBeatVolume(80);setMasterVolume(100);}}>Акцент бит</button>
          </div>
        </div>
      )}

      {error && <div className="rb-alert rb-alert-error rb-mt8" style={{fontSize:'12px'}}>{error}</div>}
      <audio ref={voiceAudioRef} preload="auto"/>
      <audio ref={beatAudioRef}  preload="auto"/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// FORMAT TIME (unchanged)
// ─────────────────────────────────────────────────────────
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────
// AUDIO VISUALIZER — logic unchanged, visual restyled
// ─────────────────────────────────────────────────────────
const AudioVisualizer = ({ stream, isActive }: { stream?: MediaStream; isActive: boolean }) => {
  const [volumes, setVolumes] = useState<number[]>(new Array(12).fill(4));
  const animationRef = useRef<number>();
  const analyserRef  = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream || !isActive) { setVolumes(new Array(12).fill(4)); return; }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8;
    ctx.createMediaStreamSource(stream).connect(analyser);
    analyserRef.current = analyser;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(buf);
      const bars = 12;
      const w = Math.floor(buf.length / bars);
      setVolumes(Array.from({length:bars},(_,i)=>Math.max(4,(buf.slice(i*w,(i+1)*w).reduce((s,v)=>s+v,0)/w/255)*36)));
      animationRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if(animationRef.current)cancelAnimationFrame(animationRef.current); ctx.close(); };
  }, [stream, isActive]);

  return (
    <div className="rb-viz">
      {volumes.map((h, i) => (
        <div key={i} className={`rb-viz-bar${isActive?' active':''}`} style={{height:`${h}px`}}/>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// PERSISTENCE HOOK (unchanged)
// ─────────────────────────────────────────────────────────
const useBattlePersistence = (currentUserId: string): BattlePersistence => {
  const STORAGE_KEY = `rapbattle_state_${currentUserId}`;
  const AUTO_SAVE_INTERVAL = 5000;

  const saveBattleState = useCallback((state: Partial<BattleState>) => {
    try {
      const cur = loadBattleState() || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...state, lastSaved: Date.now() }));
    } catch {}
  }, [STORAGE_KEY]);

  const loadBattleState = useCallback((): BattleState | null => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }, [STORAGE_KEY]);

  const clearBattleState = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, [STORAGE_KEY]);

  const autoSave = useCallback(() => {}, []);

  useEffect(() => {
    const i = setInterval(autoSave, AUTO_SAVE_INTERVAL);
    return () => clearInterval(i);
  }, [autoSave]);

  return { saveBattleState, loadBattleState, clearBattleState, autoSave };
};

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function RapBattleNew() {
  const { user } = useAuthStore();
  const { saveBattleState, loadBattleState, clearBattleState } = useBattlePersistence(user?.id || '');
  const [lastSaved, setLastSaved] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPhase, setCurrentPhase] = useState<'waiting'|'creating'|'selecting_beat_creation'|'selecting_opponent'|'inviting'|'waiting_for_opponent'|'selecting_beat'|'waiting_for_beat'|'user1_turn'|'user2_turn'|'reviewing_recording'|'mutual_judging'|'waiting_for_opponent_rating'|'finished'|'history'>('waiting');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<User | null>(null);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [userBattles, setUserBattles] = useState<Battle[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [battleTitle, setBattleTitle] = useState('');
  const [battleDescription, setBattleDescription] = useState('');

  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [beatUrl, setBeatUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingBeat, setIsPlayingBeat] = useState(false);
  const [recordedVoice, setRecordedVoice] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<'user1'|'user2'>('user1');
  const [currentRound, setCurrentRound] = useState<1|2>(1);

  const [user1Recording, setUser1Recording] = useState<BattleRecording | null>(null);
  const [user2Recording, setUser2Recording] = useState<BattleRecording | null>(null);

  const [user1Rating, setUser1Rating] = useState<number | null>(null);
  const [user2Rating, setUser2Rating] = useState<number | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [opponentHasRated, setOpponentHasRated] = useState(false);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);

  const [recordingQuality, setRecordingQuality] = useState<'low'|'medium'|'high'>('high');
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);

  const [judgeResult, setJudgeResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const beatAudioRef     = useRef<HTMLAudioElement | null>(null);
  const timerRef         = useRef<number | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  const RECORDING_TIME_LIMIT = 30;

  // ── STATE RESTORE ──
  useEffect(() => {
    const saved = loadBattleState();
    if (saved) {
      if (saved.currentBattle)   setCurrentBattle(saved.currentBattle);
      if (saved.currentPhase)    setCurrentPhase(saved.currentPhase as any);
      if (saved.user1Recording)  setUser1Recording(saved.user1Recording);
      if (saved.user2Recording)  setUser2Recording(saved.user2Recording);
      if (saved.beatUrl)         setBeatUrl(saved.beatUrl);
      if (saved.recordingTime)   setRecordingTime(saved.recordingTime);
      if (saved.recordingQuality)setRecordingQuality(saved.recordingQuality);
      if (saved.isRecording  !== undefined) setIsRecording(saved.isRecording);
      if (saved.isPlayingBeat!== undefined) setIsPlayingBeat(saved.isPlayingBeat);
      if (saved.hasRated     !== undefined) setHasRated(saved.hasRated);
      if (saved.currentRound)    setCurrentRound(saved.currentRound);
      if (saved.error)           setError(saved.error);
      if (saved.lastSaved)       setLastSaved(saved.lastSaved);
      if (saved.currentBattle)   checkBattleStatus();
    }
    loadAvailableUsers();
    loadUserBattles();
  }, []);

  useEffect(() => {
    if (!currentBattle) return;
    setIsSaving(true);
    saveBattleState({ currentBattle, currentPhase, user1Recording, user2Recording, beatUrl, recordingTime, recordingQuality, isRecording, isPlayingBeat, hasRated, currentRound, error, lastSaved: Date.now() });
    const t = setTimeout(() => { setIsSaving(false); setLastSaved(Date.now()); }, 500);
    return () => clearTimeout(t);
  }, [currentBattle, currentPhase, user1Recording, user2Recording, beatUrl, recordingTime, recordingQuality, isRecording, isPlayingBeat, hasRated, currentRound, error]);

  const loadAvailableUsers  = async () => { try { setAvailableUsers(await getAvailableUsers()); } catch { setError('Не удалось загрузить пользователей'); } };
  const loadUserBattles     = async () => { try { setUserBattles(await getUserBattles()); } catch { setError('Не удалось загрузить баттлы'); } };

  const loadPendingInvitations = async () => {
    try {
      if (currentBattle) return;
      const invs = await getBattleInvitations();
      setPendingInvitations(invs);
      if (invs.length > 0) { setCurrentBattle(invs[0]); setCurrentPhase('inviting'); }
    } catch {}
  };

  const checkBattleStatus = async () => {
    if (!currentBattle) return;
    try {
      const battles = await getUserBattles();
      const upd = battles.find(b => b.id === currentBattle.id);
      if (upd && upd.status !== currentBattle.status) {
        setCurrentBattle(upd);
        if (upd.status === 'USER1_TURN')  setCurrentPhase('user1_turn');
        else if (upd.status === 'USER2_TURN') setCurrentPhase('user2_turn');
        else if (upd.status === 'JUDGING')    setCurrentPhase('mutual_judging');
        else if (upd.status === 'CANCELLED')  { setCurrentPhase('waiting'); setCurrentBattle(null); }
      }
    } catch {}
  };

  const getCurrentUserRole = () => {
    if (!currentBattle || !user) return null;
    if (String(currentBattle.creator.id) === user.id) return 'CREATOR';
    const opp = currentBattle.participants.find(p => p.role === 'OPPONENT');
    if (opp && String(opp.user.id) === user.id) return 'OPPONENT';
    return null;
  };

  const canCurrentUserRecord = () => {
    const role = getCurrentUserRole();
    if (!role) return false;
    if (currentPhase === 'user1_turn') return role === 'CREATOR';
    if (currentPhase === 'user2_turn') return role === 'OPPONENT';
    return false;
  };

  const createNewBattle = async () => {
    if (!selectedOpponent || !battleTitle || !beatFile) { setError('Выберите оппонента, введите название и загрузите бит'); return; }
    setLoading(true); setError('');
    try {
      const { url: serverBeatUrl } = await uploadBeatFile(beatFile);
      const battle = await createBattle(battleTitle, battleDescription, selectedOpponent.id);
      setCurrentBattle(battle);
      await updateBattleBeat(battle.id, serverBeatUrl, beatFile.name);
      setCurrentBattle({ ...battle, beatUrl: serverBeatUrl, beatName: beatFile.name, status: 'INVITING' as const });
      setCurrentPhase('waiting_for_opponent');
    } catch (e: any) { setError(e.message || 'Не удалось создать баттл'); }
    finally { setLoading(false); }
  };

  const handleBattleInvitation = async (accept: boolean) => {
    if (!currentBattle) return;
    setLoading(true);
    try {
      await respondToBattle(currentBattle.id, accept);
      if (accept) {
        const upd = { ...currentBattle, status: 'USER1_TURN' as const };
        setCurrentBattle(upd); setCurrentPhase('user1_turn'); setCurrentTurn('user1');
      } else { setCurrentPhase('waiting'); setCurrentBattle(null); loadPendingInvitations(); }
      loadUserBattles();
    } catch (e: any) { setError(e.message || 'Не удалось ответить на приглашение'); }
    finally { setLoading(false); }
  };

  const handleBeatUpload = async (file: File) => {
    if (file.type.startsWith('audio/')) {
      setBeatFile(file);
      const url = URL.createObjectURL(file);
      setBeatUrl(url);
      if (beatAudioRef.current) beatAudioRef.current.src = url;
    }
  };

  const toggleBeatPlayback = async () => {
    const url = beatUrl || currentBattle?.beatUrl;
    if (!beatAudioRef.current || !url) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      if (isPlayingBeat) { beatAudioRef.current.pause(); setIsPlayingBeat(false); }
      else { await beatAudioRef.current.play(); setIsPlayingBeat(true); beatAudioRef.current.onended = () => setIsPlayingBeat(false); }
    } catch {}
  };

  const startRecording = async () => {
    try {
      const constraints = {
        echoCancellation:false, noiseSuppression:false, autoGainControl:false,
        sampleRate: recordingQuality==='high'?48000:recordingQuality==='medium'?44100:22050,
        channelCount: recordingQuality==='high'?2:1
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      streamRef.current = stream;
      const url = beatUrl || currentBattle?.beatUrl;
      if (beatAudioRef.current && url) { beatAudioRef.current.currentTime=0; beatAudioRef.current.loop=true; await beatAudioRef.current.play(); setIsPlayingBeat(true); }
      const mime = 'audio/webm;codecs=opus';
      let actualMime = mime;
      if (!MediaRecorder.isTypeSupported(mime)) {
        for (const t of ['audio/webm','audio/ogg','audio/wav','audio/mp4']) { if (MediaRecorder.isTypeSupported(t)) { actualMime=t; break; } }
      }
      const mr = new MediaRecorder(stream, { mimeType:actualMime, audioBitsPerSecond:recordingQuality==='high'?128000:recordingQuality==='medium'?96000:64000 });
      mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.onerror = (e:any) => { setError(`Ошибка записи: ${e.error?.message||''}`); stopRecording(); };
      mr.ondataavailable = (e) => { if(e.data?.size>0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        if (beatAudioRef.current) { beatAudioRef.current.pause(); beatAudioRef.current.currentTime=0; beatAudioRef.current.loop=false; setIsPlayingBeat(false); }
        if (audioChunksRef.current.length===0) { setError('Ошибка записи: нет данных. Попробуйте снова.'); return; }
        const blob = new Blob(audioChunksRef.current, { type:actualMime });
        if (blob.size===0) { setError('Ошибка записи: пустой файл.'); return; }
        setRecordedVoice(URL.createObjectURL(blob));
        if (currentBattle) {
          try {
            const ext = actualMime.includes('webm')?'webm':actualMime.includes('ogg')?'ogg':actualMime.includes('wav')?'wav':'m4a';
            const file = new File([blob],`recording-${Date.now()}.${ext}`,{type:actualMime});
            const rec = await saveBattleRecording(currentBattle.id, file, currentBattle.beatUrl||'', recordingTime, recordingQuality, currentRound);
            const role = getCurrentUserRole();
            if (role==='CREATOR') { setUser1Recording(rec); setCurrentPhase('reviewing_recording'); }
            else if (role==='OPPONENT') { setUser2Recording(rec); setCurrentPhase('reviewing_recording'); await updateBattleStatus(currentBattle.id,'JUDGING'); setTimeout(()=>checkBattleStatus(),500); }
          } catch(e:any) { setError(e.message||'Не удалось сохранить запись'); }
        }
      };
      mr.start(100); setIsRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => { setRecordingTime(p => { if(p>=RECORDING_TIME_LIMIT){stopRecording();return p;} return p+1; }); }, 1000);
    } catch { alert('Не удалось получить доступ к микрофону.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current=null; }
      setRecordingTime(0);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    }
  };

  const loadBattleRecordings = async () => {
    if (!currentBattle) return;
    setIsLoadingRecordings(true);
    try {
      const recs = await getBattleRecordings(currentBattle.id);
      recs.forEach(r => { if(r.userId===currentBattle.creator.id) setUser1Recording(r); else setUser2Recording(r); });
    } catch(e:any) { setError(e.message||'Не удалось загрузить записи'); }
    finally { setIsLoadingRecordings(false); }
  };

  const handleRatingSubmit = async (rating: number) => {
    const role = getCurrentUserRole();
    if (!role || !currentBattle) return;
    try {
      try { await submitRating(currentBattle.id, rating); }
      catch { localStorage.setItem(`battle_rating_${currentBattle.id}_${role==='CREATOR'?'user1':'user2'}`, rating.toString()); }
      if (role==='CREATOR') setUser1Rating(rating); else setUser2Rating(rating);
      setHasRated(true);
      try { await updateBattleStatus(currentBattle.id,'WAITING_FOR_OPPONENT_RATING'); } catch {}
      setCurrentPhase('waiting_for_opponent_rating');
      setTimeout(() => { setOpponentHasRated(true); setCurrentPhase('mutual_judging'); }, 3000);
    } catch(e:any) { setError(e.message||'Не удалось сохранить оценку'); }
  };

  const startNewBattle = () => {
    setCurrentPhase('waiting'); setCurrentBattle(null); setSelectedOpponent(null);
    setBattleTitle(''); setBattleDescription(''); setBeatFile(null); setBeatUrl('');
    setUser1Recording(null); setUser2Recording(null); setRecordedVoice('');
    setCurrentTurn('user1'); setRecordingTime(0); setJudgeResult(null); setError('');
  };

  useEffect(() => {
    if (currentPhase==='waiting') {
      loadPendingInvitations();
      const i=setInterval(loadPendingInvitations,5000); return ()=>clearInterval(i);
    } else if (currentPhase==='waiting_for_opponent') {
      const i=setInterval(checkBattleStatus,1500); return ()=>clearInterval(i);
    } else if (currentPhase==='user1_turn'||currentPhase==='user2_turn') {
      const i=setInterval(checkBattleStatus,1000); return ()=>clearInterval(i);
    }
  }, [currentPhase]);

  useEffect(() => {
    if (beatAudioRef.current) { const u=beatUrl||currentBattle?.beatUrl; beatAudioRef.current.src=u||''; beatAudioRef.current.load(); }
  }, [beatUrl, currentBattle?.beatUrl]);

  const passTurnToOpponent = useCallback(async () => {
    if (!currentBattle) return;
    try {
      const role = getCurrentUserRole();
      if (role==='CREATOR') { setCurrentPhase('user2_turn'); await updateBattleStatus(currentBattle.id,'USER2_TURN'); setTimeout(()=>checkBattleStatus(),500); }
      else if (role==='OPPONENT') { setCurrentPhase('mutual_judging'); await updateBattleStatus(currentBattle.id,'JUDGING'); setTimeout(()=>checkBattleStatus(),500); }
    } catch { setError('Ошибка при передаче хода'); }
  }, [currentBattle]);

  const finishBattle = useCallback(() => {
    if (!currentBattle) return;
    if (!window.confirm(`Завершить баттл "${currentBattle.title}"? Несохранённые данные будут потеряны.`)) return;
    if (isRecording) stopRecording();
    if (beatAudioRef.current) { beatAudioRef.current.pause(); beatAudioRef.current.currentTime=0; }
    clearBattleState();
    setCurrentBattle(null); setCurrentPhase('waiting'); setUser1Recording(null);
    setUser2Recording(null); setBeatUrl(''); setRecordingTime(0); setIsRecording(false);
    setIsPlayingBeat(false); setHasRated(false); setError(''); setSelectedOpponent(null);
    setBattleTitle(''); setBattleDescription('');
    loadUserBattles();
  }, [currentBattle, isRecording, clearBattleState]);

  useEffect(() => {
    if (currentPhase==='finished'||currentPhase==='history') clearBattleState();
  }, [currentPhase]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
  }, []);

  // ─────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────

  const VsCard = ({ battle }: { battle: Battle }) => {
    const opp = battle.participants.find(p=>p.role==='OPPONENT')?.user;
    return (
      <div className="rb-vs-card rb-mt16">
        <div className="rb-vs-row">
          <div className="rb-vs-player">
            <div className="rb-vs-label">Создатель</div>
            <div className="rb-vs-avatar">{battle.creator.username[0].toUpperCase()}</div>
            <div className="rb-vs-name">{battle.creator.username}</div>
          </div>
          <div className="rb-vs-sep"><span className="rb-vs-sep-text">VS</span></div>
          <div className="rb-vs-player">
            <div className="rb-vs-label">Оппонент</div>
            <div className="rb-vs-avatar">{opp?.username[0].toUpperCase()}</div>
            <div className="rb-vs-name">{opp?.username}</div>
          </div>
        </div>
      </div>
    );
  };

  // ── WAITING ──
  const renderWaitingPhase = () => (
    <div className="rb-hero">
      <div className="rb-hero-icon"><Users/></div>
      <div className="rb-hero-title">Рэп Баттл</div>
      <div className="rb-hero-desc">Соревнования в реальном времени</div>
      <div className="rb-hero-actions">
        <button onClick={()=>setCurrentPhase('creating')} className="rb-btn rb-btn-primary tall full">
          <Sparkles/> Создать баттл
        </button>
        <button onClick={()=>setCurrentPhase('history')} className="rb-btn rb-btn-ghost tall full">
          <Trophy/> История баттлов
        </button>
      </div>
    </div>
  );

  // ── CREATING ──
  const renderCreatingPhase = () => (
    <div>
      <div className="rb-card-hd">
        <div>
          <div className="rb-card-title">Создание баттла</div>
          <div className="rb-card-sub">Заполните параметры и выберите оппонента</div>
        </div>
        <button onClick={()=>setCurrentPhase('waiting')} className="rb-btn rb-btn-ghost">Отмена</button>
      </div>

      <div className="rb-card">
        <span className="rb-section-label">Информация</span>
        <div className="rb-field">
          <label className="rb-label">Название баттла</label>
          <input className="rb-input" value={battleTitle} onChange={e=>setBattleTitle(e.target.value)} placeholder="Название..."/>
        </div>
        <div className="rb-field rb-mb0">
          <label className="rb-label">Описание</label>
          <textarea className="rb-input" value={battleDescription} onChange={e=>setBattleDescription(e.target.value)} placeholder="Условия и правила..." rows={3}/>
        </div>
      </div>

      <div className="rb-card">
        <span className="rb-section-label">Бит</span>
        <label>
          <div className="rb-upload-zone">
            <Upload/>
            <div className="rb-upload-label">Нажмите для загрузки</div>
            <div className="rb-upload-hint">MP3, WAV — до 10 MB</div>
          </div>
          <input type="file" accept="audio/mp3,audio/wav,audio/mpeg" className="hidden" onChange={e=>e.target.files?.[0]&&handleBeatUpload(e.target.files[0])}/>
        </label>
        {beatFile && (
          <div className="rb-beat-row rb-mt8">
            <div className="rb-beat-icon"><Disc style={{width:14,height:14,color:'var(--t3)'}}/></div>
            <span className="rb-beat-name">{beatFile.name}</span>
            <div className="rb-beat-actions">
              <button onClick={toggleBeatPlayback} className="rb-btn-icon">
                {isPlayingBeat ? <Pause/> : <Play/>}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rb-card">
        <span className="rb-section-label">Оппонент</span>
        {availableUsers.length === 0
          ? <div className="rb-loading"><div className="rb-spinner"/><span>Загрузка пользователей</span></div>
          : <div className="rb-user-list">
              {availableUsers.map(u => (
                <button key={u.id} onClick={()=>setSelectedOpponent(u)} className={`rb-user-row${selectedOpponent?.id===u.id?' sel':''}`}>
                  <div className="rb-user-avatar">{u.username[0].toUpperCase()}</div>
                  <div style={{flex:1,textAlign:'left'}}>
                    <div className="rb-user-name">@{u.username}</div>
                    <div className="rb-user-meta">{u._count.createdBattles + u._count.battleParticipants} баттлов</div>
                  </div>
                  {selectedOpponent?.id===u.id && <div className="rb-user-check"><CheckCircle/></div>}
                </button>
              ))}
            </div>
        }
      </div>

      <div className="rb-row" style={{justifyContent:'flex-end'}}>
        <button onClick={createNewBattle} disabled={!selectedOpponent||!battleTitle||!beatFile||loading} className="rb-btn rb-btn-primary tall">
          {loading ? <><div className="rb-spinner" style={{borderTopColor:'var(--bg)'}}/> Создание</> : <><Send/> Создать баттл</>}
        </button>
      </div>
    </div>
  );

  // ── INVITING (opponent receives) ──
  const renderInvitingPhase = () => {
    if (!currentBattle) return null;
    return (
      <div>
        <div className="rb-hero" style={{paddingTop:40}}>
          <div className="rb-pulse-ring"><Send style={{width:20,height:20}}/></div>
          <div className="rb-hero-title">Приглашение в баттл</div>
          <div className="rb-hero-desc">{currentBattle.creator.username} приглашает вас</div>
        </div>

        <div className="rb-card">
          <div className="rb-card-hd">
            <div>
              <div className="rb-card-title">{currentBattle.title}</div>
              {currentBattle.description && <div className="rb-card-sub">{currentBattle.description}</div>}
            </div>
            <span className="rb-badge rb-badge-amber">Ожидает ответа</span>
          </div>
          <VsCard battle={currentBattle}/>
        </div>

        <div className="rb-row rb-row center">
          <button onClick={()=>handleBattleInvitation(false)} disabled={loading} className="rb-btn rb-btn-danger">
            <XCircle/> Отклонить
          </button>
          <button onClick={()=>handleBattleInvitation(true)} disabled={loading} className="rb-btn rb-btn-green">
            <CheckCircle/> Принять
          </button>
        </div>
      </div>
    );
  };

  // ── WAITING FOR OPPONENT ──
  const renderWaitingForOpponentPhase = () => {
    if (!currentBattle) return null;
    return (
      <div>
        <div className="rb-hero" style={{paddingTop:40}}>
          <div className="rb-pulse-ring"><Clock/></div>
          <div className="rb-hero-title">Ожидание оппонента</div>
          <div className="rb-hero-desc">Приглашение отправлено. Ожидаем ответа...</div>
        </div>

        <div className="rb-card">
          <div className="rb-card-hd">
            <div>
              <div className="rb-card-title">{currentBattle.title}</div>
              {currentBattle.description && <div className="rb-card-sub">{currentBattle.description}</div>}
            </div>
            <span className="rb-badge rb-badge-amber">Ожидание</span>
          </div>
          <VsCard battle={currentBattle}/>
        </div>

        <div className="rb-row rb-row center">
          <button onClick={()=>{ setCurrentBattle(null); setCurrentPhase('waiting'); loadPendingInvitations(); }} className="rb-btn rb-btn-danger">
            <XCircle/> Отменить
          </button>
        </div>
      </div>
    );
  };

  // ── BATTLE PHASE ──
  const renderBattlePhase = () => {
    const canRecord = canCurrentUserRecord();
    const creator  = currentBattle?.creator;
    const opp      = currentBattle?.participants.find(p=>p.role==='OPPONENT')?.user;
    const timeLeft = RECORDING_TIME_LIMIT - recordingTime;
    const pct = (recordingTime / RECORDING_TIME_LIMIT) * 100;

    return (
      <div>
        {/* Turn indicator */}
        <div className="rb-centered rb-mt24" style={{marginBottom:32}}>
          <div className={`rb-turn-indicator${canRecord?' yours':' wait'}`}>
            {canRecord
              ? <><span className="rb-rec-dot"/> Ваш ход — запись</>
              : <><Clock style={{width:12,height:12}}/> Ход: {currentPhase==='user1_turn'?creator?.username:opp?.username}</>
            }
          </div>
        </div>

        {/* Beat player */}
        {(beatUrl || currentBattle?.beatUrl) && (
          <div className="rb-card">
            <div className="rb-card-hd rb-mb0" style={{marginBottom:12}}>
              <span className="rb-section-label" style={{marginBottom:0}}>Бит</span>
              <button onClick={()=>setShowRecordingSettings(!showRecordingSettings)} className="rb-btn rb-btn-ghost" style={{height:28,padding:'0 10px',fontSize:'11px'}}>
                Настройки
              </button>
            </div>
            <div className="rb-beat-row">
              <Disc style={{width:14,height:14,color:isPlayingBeat?'var(--t1)':'var(--t3)',flexShrink:0}}/>
              <span className="rb-beat-name">{beatFile?.name||currentBattle?.beatName||'Бит'}</span>
              <button onClick={toggleBeatPlayback} className="rb-btn-icon">{isPlayingBeat?<Pause/>:<Play/>}</button>
            </div>

            {showRecordingSettings && (
              <div style={{marginTop:14}}>
                <label className="rb-label">Качество записи</label>
                <div className="rb-quality-grid">
                  {(['low','medium','high'] as const).map(q => (
                    <button key={q} onClick={()=>setRecordingQuality(q)}
                      className={`rb-quality-btn${recordingQuality===q?` sel-${q}`:''}`}>
                      <div className="rb-quality-btn-label">{q==='low'?'Низкое':q==='medium'?'Среднее':'Высокое'}</div>
                      <div className="rb-quality-btn-sub">{q==='low'?'22kHz · 64k':q==='medium'?'44kHz · 96k':'48kHz · 128k'}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <audio ref={beatAudioRef} src={beatUrl||currentBattle?.beatUrl} preload="auto" className="hidden"/>
          </div>
        )}

        {/* Timer + recorder */}
        <div className="rb-card rb-centered">
          <div className={`rb-timer-display${timeLeft<=8?' warn':''}`}>{timeLeft}s</div>
          <div className="rb-timer-sub">{isRecording ? <><span className="rb-rec-dot"/> Запись...</> : 'Готов к записи'}</div>

          <div className="rb-progress-wrap">
            <div className={`rb-progress-bar${pct>70?' warn':pct>40?' mid':''}`} style={{width:`${pct}%`}}/>
          </div>

          <AudioVisualizer stream={streamRef.current||undefined} isActive={isRecording}/>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={(!beatUrl && !currentBattle?.beatUrl) || !canRecord}
            className={`rb-mic-btn rb-mt24${isRecording?' recording':''}`}
          >
            {isRecording ? <MicOff/> : <Mic/>}
          </button>

          <div style={{marginTop:12,fontFamily:"'DM Mono',monospace",fontSize:'10px',letterSpacing:'.08em',textTransform:'uppercase',color:'var(--t3)'}}>
            {isRecording ? 'Нажмите для остановки' : canRecord ? 'Нажмите для записи' : 'Ожидайте очереди'}
          </div>
        </div>

        {/* Existing recordings */}
        {(user1Recording || user2Recording) && (
          <div className="rb-mt24">
            <span className="rb-section-label">Записанные треки</span>
            {user1Recording && (
              <div className="rb-rec-card">
                <div className="rb-rec-card-hd">
                  <div className="rb-rec-avatar">{user1Recording.user.username[0].toUpperCase()}</div>
                  <div>
                    <div className="rb-rec-user">{user1Recording.user.username}</div>
                    <div className="rb-rec-meta">Раунд {user1Recording.round||1}</div>
                  </div>
                  <span className="rb-badge rb-badge-green" style={{marginLeft:'auto'}}>Сохранено</span>
                </div>
                <MixedTrackPlayer voiceUrl={user1Recording.voiceUrl} beatUrl={user1Recording.beatUrl} label={`${user1Recording.user.username} — трек`} playerKey={`u1-${user1Recording.id}`}/>
              </div>
            )}
            {user2Recording && (
              <div className="rb-rec-card">
                <div className="rb-rec-card-hd">
                  <div className="rb-rec-avatar">{user2Recording.user.username[0].toUpperCase()}</div>
                  <div>
                    <div className="rb-rec-user">{user2Recording.user.username}</div>
                    <div className="rb-rec-meta">Раунд {user2Recording.round||1}</div>
                  </div>
                  <span className="rb-badge rb-badge-green" style={{marginLeft:'auto'}}>Сохранено</span>
                </div>
                <MixedTrackPlayer voiceUrl={user2Recording.voiceUrl} beatUrl={user2Recording.beatUrl} label={`${user2Recording.user.username} — трек`} playerKey={`u2-${user2Recording.id}`}/>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── REVIEWING ──
  const renderReviewingRecordingPhase = () => {
    const role = getCurrentUserRole();
    const rec  = role==='CREATOR' ? user1Recording : user2Recording;
    if (!rec) return <div className="rb-loading"><div className="rb-spinner"/><span>Загрузка записи...</span></div>;

    return (
      <div>
        <div className="rb-card-hd">
          <div>
            <div className="rb-card-title">Прослушайте запись</div>
            <div className="rb-card-sub">Убедитесь в качестве перед передачей хода</div>
          </div>
          <span className="rb-badge rb-badge-green"><CheckCircle style={{width:10,height:10,display:'inline',marginRight:4}}/>Сохранено</span>
        </div>

        <div className="rb-card">
          <span className="rb-section-label">Ваш трек — Раунд {rec.round||1}</span>
          <MixedTrackPlayer voiceUrl={rec.voiceUrl} beatUrl={rec.beatUrl} label={`Ваша запись`} playerKey={`review-${rec.id}`}/>
          <hr className="rb-divider" style={{marginTop:16,marginBottom:16}}/>
          <div className="rb-info-row">
            <span className="rb-info-lbl">Длительность</span>
            <span>{Math.floor(rec.duration/60)}:{(rec.duration%60).toString().padStart(2,'0')}</span>
          </div>
          <div className="rb-info-row">
            <span className="rb-info-lbl">Качество</span>
            <span>{rec.recordingQuality||'medium'}</span>
          </div>
        </div>

        <div className="rb-row rb-row center rb-mt16">
          <button onClick={()=>{ if(role==='CREATOR'){setCurrentPhase('user1_turn');setUser1Recording(null);}else{setCurrentPhase('user2_turn');setUser2Recording(null);} }} className="rb-btn rb-btn-ghost">
            <Mic/> Перезаписать
          </button>
          <button onClick={passTurnToOpponent} className="rb-btn rb-btn-primary tall">
            <Send/> Передать ход оппоненту
          </button>
        </div>
      </div>
    );
  };

  // ── JUDGING ──
  const renderMutualJudgingPhase = () => {
    const role   = getCurrentUserRole();
    const oppRec = role==='CREATOR' ? user2Recording : user1Recording;

    if (!hasRated && oppRec) return (
      <div>
        <div className="rb-card-hd">
          <div>
            <div className="rb-card-title">Оцените трек оппонента</div>
            <div className="rb-card-sub">Прослушайте и поставьте оценку</div>
          </div>
          <span className="rb-badge rb-badge-purple">Судейство</span>
        </div>
        <div className="rb-card">
          <span className="rb-section-label">Трек оппонента</span>
          <MixedTrackPlayer voiceUrl={oppRec.voiceUrl} beatUrl={oppRec.beatUrl} label="Трек оппонента" playerKey={`opp-${oppRec.id}`}/>
        </div>
        <div className="rb-card rb-centered">
          <span className="rb-section-label">Ваша оценка</span>
          <div className="rb-stars">
            {[1,2,3,4,5].map(r => (
              <button key={r} onClick={()=>handleRatingSubmit(r)} className="rb-star-btn">⭐</button>
            ))}
          </div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',color:'var(--t3)',letterSpacing:'.06em'}}>Нажмите для оценки</div>
        </div>
      </div>
    );

    if (hasRated && !opponentHasRated) return (
      <div className="rb-hero" style={{paddingTop:40}}>
        <div className="rb-pulse-ring"><Clock/></div>
        <div className="rb-hero-title">Ожидание оценки</div>
        <div className="rb-hero-desc">Вы оценили трек. Ждём оппонента...</div>
        <div style={{marginTop:24}}>
          <div className="rb-stars">
            {[1,2,3,4,5].map(r=>(
              <div key={r} className={`rb-star-btn${r<=(role==='CREATOR'?(user1Rating||0):(user2Rating||0))?' lit':''}`} style={{cursor:'default'}}>⭐</div>
            ))}
          </div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',color:'var(--t3)',marginTop:8,letterSpacing:'.06em'}}>ВАША ОЦЕНКА</div>
        </div>
      </div>
    );

    if (hasRated && opponentHasRated) {
      const myScore  = role==='CREATOR'?(user1Rating||0):(user2Rating||0);
      const oppScore = role==='CREATOR'?(user2Rating||0):(user1Rating||0);
      return (
        <div>
          <div className="rb-card-hd">
            <div className="rb-card-title">Результаты</div>
            <span className="rb-badge rb-badge-purple">Завершено</span>
          </div>
          <div className="rb-score-grid">
            <div className={`rb-score-cell${myScore>oppScore?' winner':''}`}>
              <div className="rb-score-num">{myScore}</div>
              <div className="rb-score-label">Оппонент вам</div>
              <div className="rb-score-name">Вы</div>
            </div>
            <div className={`rb-score-cell${oppScore>myScore?' winner':''}`}>
              <div className="rb-score-num">{oppScore}</div>
              <div className="rb-score-label">Вы оппоненту</div>
              <div className="rb-score-name">Оппонент</div>
            </div>
          </div>
          <div className="rb-card rb-centered">
            <span className="rb-section-label">Итог</span>
            <div style={{fontSize:20,fontWeight:700,letterSpacing:'-.02em',marginBottom:20}}>
              {myScore>oppScore ? 'Вы победили' : myScore<oppScore ? 'Оппонент победил' : 'Ничья'}
            </div>
            <button onClick={()=>setCurrentPhase('finished')} className="rb-btn rb-btn-primary">
              Завершить
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rb-loading">
        {isLoadingRecordings
          ? <><div className="rb-spinner"/><span>Загрузка записей...</span></>
          : <><button onClick={loadBattleRecordings} className="rb-btn rb-btn-ghost">Загрузить записи</button></>
        }
      </div>
    );
  };

  // ── WAITING FOR OPPONENT RATING ──
  const renderWaitingForOpponentRatingPhase = () => {
    const role = getCurrentUserRole();
    return (
      <div className="rb-hero" style={{paddingTop:40}}>
        <div className="rb-pulse-ring"><Clock/></div>
        <div className="rb-hero-title">Ожидание оценки</div>
        <div className="rb-hero-desc">Вы оценили трек. Ждём оппонента...</div>
        <div style={{marginTop:24}}>
          <div className="rb-stars">
            {[1,2,3,4,5].map(r=>(
              <div key={r} className={`rb-star-btn${r<=(role==='CREATOR'?(user1Rating||0):(user2Rating||0))?' lit':''}`} style={{cursor:'default'}}>⭐</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── FINISHED ──
  const renderFinishedPhase = () => {
    if (!judgeResult || !currentBattle) return null;
    const { winner, user1Total, user2Total } = judgeResult;
    const u1 = currentBattle.participants.find(p=>p.role==='CREATOR')?.user;
    const u2 = currentBattle.participants.find(p=>p.role==='OPPONENT')?.user;
    return (
      <div>
        <div className="rb-card-hd">
          <div className="rb-card-title">Баттл завершён</div>
          <span className="rb-badge rb-badge-muted">Финал</span>
        </div>
        <div className="rb-score-grid">
          <div className={`rb-score-cell${winner==='USER1'?' winner':''}`}>
            <div className="rb-score-num">{user1Total}</div>
            <div className="rb-score-name">{u1?.username}</div>
          </div>
          <div className={`rb-score-cell${winner==='USER2'?' winner':''}`}>
            <div className="rb-score-num">{user2Total}</div>
            <div className="rb-score-name">{u2?.username}</div>
          </div>
        </div>
        {judgeResult.judge?.feedback && (
          <div className="rb-card">
            <span className="rb-section-label">AI Анализ</span>
            <p style={{fontSize:13,color:'var(--t2)',lineHeight:1.65}}>{judgeResult.judge.feedback}</p>
            <div style={{marginTop:10,fontFamily:"'DM Mono',monospace",fontSize:'9.5px',color:'var(--t3)'}}>
              Уверенность: {Math.round((judgeResult.judge.confidence||0)*100)}%
            </div>
          </div>
        )}
        <div className="rb-row rb-row center rb-mt16">
          <button onClick={startNewBattle} className="rb-btn rb-btn-primary tall"><Sparkles/> Новый баттл</button>
        </div>
      </div>
    );
  };

  // ── HISTORY ──
  const renderHistory = () => (
    <div>
      <div className="rb-card-hd">
        <div>
          <div className="rb-card-title">История баттлов</div>
          <div className="rb-card-sub">{userBattles.length} записей</div>
        </div>
        <button onClick={()=>setCurrentPhase('waiting')} className="rb-btn rb-btn-ghost">Назад</button>
      </div>

      {userBattles.length===0
        ? <div className="rb-hero" style={{paddingTop:32}}>
            <div className="rb-hero-icon"><Trophy/></div>
            <div className="rb-hero-title">Пусто</div>
            <div className="rb-hero-desc">Завершённых баттлов пока нет</div>
          </div>
        : userBattles.map(b => {
            const u1=b.participants.find(p=>p.role==='CREATOR')?.user;
            const u2=b.participants.find(p=>p.role==='OPPONENT')?.user;
            const statusMap: Record<string,{cls:string;label:string}> = {
              FINISHED:  {cls:'rb-badge-green',  label:'Завершён'},
              JUDGING:   {cls:'rb-badge-purple', label:'Судейство'},
              USER1_TURN:{cls:'rb-badge-amber',  label:'В процессе'},
              USER2_TURN:{cls:'rb-badge-amber',  label:'В процессе'},
            };
            const st = statusMap[b.status] || {cls:'rb-badge-muted', label:b.status};
            return (
              <div key={b.id} className="rb-history-row">
                <div className="rb-history-top">
                  <div className="rb-history-title">{b.title}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className={`rb-badge ${st.cls}`}>{st.label}</span>
                    <span className="rb-history-date">{new Date(b.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,fontFamily:"'DM Mono',monospace",fontSize:'11px',color:'var(--t3)'}}>
                  <span>{u1?.username}</span>
                  <span style={{color:'var(--t4)'}}>VS</span>
                  <span>{u2?.username}</span>
                  {b.winner && <><span style={{color:'var(--t4)'}}>·</span><span style={{color:'var(--t2)'}}>Победитель: {b.winner==='DRAW'?'Ничья':b.winner==='USER1'?u1?.username:u2?.username}</span></>}
                </div>
                {b.recordings.length>0 && b.recordings.map(r=>(
                  <MixedTrackPlayer key={r.id} voiceUrl={r.voiceUrl} beatUrl={r.beatUrl} label={r.user.username}/>
                ))}
              </div>
            );
          })
      }
    </div>
  );

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div className="rb">
      <style>{RAP_BATTLE_CSS}</style>

      <div className="rb-wrap">
        {/* Top bar */}
        <div className="rb-topbar">
          <div>
            <div className="rb-page-label">Соревнования</div>
            <div className="rb-page-name">Рэп Баттл</div>
          </div>
          <div className="rb-topbar-r">
            {currentBattle && (
              <>
                <span className="rb-badge rb-badge-purple">{currentBattle.title}</span>
                <button onClick={finishBattle} className="rb-btn-icon danger" title="Завершить баттл">
                  <XCircle/>
                </button>
                {isSaving
                  ? <div className="rb-btn-icon" title="Сохранение..."><Save style={{animation:'rb-spin 1.5s linear infinite'}}/></div>
                  : lastSaved>0
                    ? <div className="rb-btn-icon" title={`Сохранено в ${new Date(lastSaved).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`}><CheckCircle/></div>
                    : null
                }
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rb-alert rb-alert-error">
            <span>{error}</span>
            <button className="rb-alert-close" onClick={()=>setError('')}>×</button>
          </div>
        )}

        {/* Phase content */}
        {currentPhase==='waiting'                  && renderWaitingPhase()}
        {currentPhase==='creating'                 && renderCreatingPhase()}
        {currentPhase==='inviting'                 && renderInvitingPhase()}
        {currentPhase==='waiting_for_opponent'     && renderWaitingForOpponentPhase()}
        {(currentPhase==='user1_turn'||currentPhase==='user2_turn') && renderBattlePhase()}
        {currentPhase==='reviewing_recording'      && renderReviewingRecordingPhase()}
        {currentPhase==='mutual_judging'           && renderMutualJudgingPhase()}
        {currentPhase==='waiting_for_opponent_rating' && renderWaitingForOpponentRatingPhase()}
        {currentPhase==='finished'                 && renderFinishedPhase()}
        {currentPhase==='history'                  && renderHistory()}
      </div>
    </div>
  );
}