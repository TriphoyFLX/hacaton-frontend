import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Users,
  FileText,
  Video,
  Trash2,
  Shield,
  Ban,
  BarChart3,
  CreditCard,
  Coins,
  Package,
  RefreshCw,
  Search,
  Crown,
  Flag,
} from 'lucide-react';
import { API_ORIGIN } from '../api/client';
import { getAuthToken } from '../lib/authToken';
import { REPORT_REASON_OPTIONS } from '../api/reports';

const ADMIN_API = `${API_ORIGIN}/api/admin`;
const PAGE_SIZE = 40;
const ADMIN_CACHE_TTL = 30_000;

const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

.admin-root {
  --admin-bg: #0a0a0a;
  --admin-surface: rgba(17, 17, 17, 0.92);
  --admin-raised: rgba(23, 23, 23, 0.94);
  --admin-hover: #1d1d1d;
  --admin-border: #242424;
  --admin-border-strong: #323232;
  --admin-text: #f0ede8;
  --admin-secondary: #b7b1a8;
  --admin-muted: #77736d;
  --admin-accent: #ded8cd;
  position: relative;
  isolation: isolate;
  color: var(--admin-text);
  background:
    radial-gradient(circle at 82% -10%, rgba(112, 96, 74, 0.12), transparent 34%),
    radial-gradient(circle at -8% 55%, rgba(80, 88, 94, 0.08), transparent 30%),
    var(--admin-bg) !important;
  font-family: 'Syne', sans-serif;
}
.admin-root::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  opacity: 0.18;
  background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 70%);
}
.admin-root button,
.admin-root input,
.admin-root select,
.admin-root textarea {
  font-family: inherit;
}
.admin-root button {
  transition: color .16s ease, border-color .16s ease, background .16s ease, transform .16s ease;
}
.admin-root button:focus-visible,
.admin-root input:focus-visible,
.admin-root select:focus-visible,
.admin-root textarea:focus-visible {
  outline: 1px solid var(--admin-accent);
  outline-offset: 2px;
}
.admin-root * {
  scrollbar-width: thin;
  scrollbar-color: #343434 transparent;
}
.admin-topbar {
  min-height: 72px;
  padding: 16px 22px !important;
  border-color: var(--admin-border) !important;
  background: rgba(10, 10, 10, .82) !important;
  backdrop-filter: blur(18px);
}
.admin-title {
  color: var(--admin-text) !important;
  font-size: clamp(18px, 2vw, 25px) !important;
  letter-spacing: -.035em;
}
.admin-title svg {
  color: var(--admin-secondary);
  stroke-width: 1.5;
}
.admin-refresh {
  min-height: 38px;
  padding: 8px 13px !important;
  border: 1px solid var(--admin-border) !important;
  border-radius: 9px !important;
  background: var(--admin-surface) !important;
  color: var(--admin-secondary) !important;
}
.admin-refresh:hover {
  border-color: var(--admin-border-strong) !important;
  background: var(--admin-hover) !important;
  color: var(--admin-text) !important;
}
.admin-tabs {
  position: sticky;
  z-index: 20;
  top: 0;
  border-color: var(--admin-border) !important;
  background: rgba(12, 12, 12, .92) !important;
  backdrop-filter: blur(18px);
}
.admin-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  color: var(--admin-muted);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
.admin-tab::after {
  content: '';
  position: absolute;
  right: 18px;
  bottom: 0;
  left: 18px;
  height: 1px;
  background: transparent;
}
.admin-tab:hover {
  color: var(--admin-secondary);
  background: rgba(255,255,255,.025);
}
.admin-tab.active {
  color: var(--admin-text);
}
.admin-tab.active::after {
  background: var(--admin-accent);
}
.admin-tab svg {
  margin-right: 7px;
  stroke-width: 1.6;
}
.admin-content {
  padding: clamp(14px, 2.2vw, 26px) !important;
}
.admin-root [class~="bg-gray-800"],
.admin-root [class*="bg-gray-800/"],
.admin-root [class*="bg-gray-900/"] {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface) !important;
  box-shadow: 0 14px 34px rgba(0, 0, 0, .16);
}
.admin-root [class~="bg-gray-700"] {
  background: var(--admin-raised) !important;
}
.admin-root [class*="border-gray-7"],
.admin-root [class*="border-gray-8"] {
  border-color: var(--admin-border) !important;
}
.admin-root .text-white,
.admin-root .text-gray-200 {
  color: var(--admin-text) !important;
}
.admin-root .text-gray-300,
.admin-root .text-gray-400 {
  color: var(--admin-secondary) !important;
}
.admin-root .text-gray-500 {
  color: var(--admin-muted) !important;
}
.admin-root .text-emerald-400 {
  color: #d5c5a8 !important;
}
.admin-root .bg-emerald-600 {
  border: 1px solid #82745e !important;
  background: #655a49 !important;
}
.admin-root [class*="bg-amber-700"] {
  border: 1px solid #786447 !important;
  background: #5c4d39 !important;
}
.admin-root .text-amber-400 {
  color: #d9aa68 !important;
}
.admin-root .text-sky-400 {
  color: #94b8cf !important;
}
.admin-root .bg-red-600,
.admin-root [class*="bg-red-900"] {
  border: 1px solid #663737 !important;
  background: #402323 !important;
}
.admin-root .text-red-200 {
  color: #e4a2a2 !important;
}
.admin-root input,
.admin-root select,
.admin-root textarea {
  border: 1px solid var(--admin-border-strong) !important;
  border-radius: 9px !important;
  background: #101010 !important;
  color: var(--admin-text) !important;
}
.admin-root input::placeholder,
.admin-root textarea::placeholder {
  color: #5f5b55;
}
.admin-root table {
  border-collapse: separate;
  border-spacing: 0;
  font-family: 'DM Mono', monospace;
}
.admin-root thead {
  color: var(--admin-muted) !important;
}
.admin-root tbody tr:hover {
  background: rgba(255,255,255,.025);
}
.admin-root .font-mono,
.admin-root time {
  font-family: 'DM Mono', monospace !important;
}

@media (max-width: 640px) {
  .admin-topbar {
    min-height: 60px;
    padding: 11px 13px !important;
  }
  .admin-refresh {
    min-width: 38px;
    padding: 8px !important;
  }
  .admin-refresh span {
    display: none;
  }
  .admin-tab {
    min-height: 44px;
    padding: 0 13px;
    font-size: 12px;
  }
  .admin-tab::after {
    right: 13px;
    left: 13px;
  }
}
`;

type Tab = 'overview' | 'purchases' | 'reports' | 'users' | 'posts' | 'soundtoks';
type PurchaseFilter = 'all' | 'subscriptions' | 'tokens' | 'presets';
type PaymentStatusFilter = 'ALL' | 'SUCCEEDED' | 'PENDING' | 'CANCELED';
type ReportStatusFilter = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED' | 'ALL';
type UserRoleFilter = 'ALL' | 'ADMIN' | 'USER';

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
}

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${ADMIN_API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'Нужна роль ADMIN' : `Ошибка ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminStats {
  totals: {
    users: number;
    posts: number;
    soundToks: number;
    presetsPublished: number;
    pendingPayments: number;
    openReports?: number;
  };
  plans: {
    activePro: number;
    activePlatinum: number;
    activePaid: number;
  };
  purchases: {
    subscriptions: { count: number; revenueRub: number };
    tokens: { count: number; revenueRub: number };
    presets: { count: number; revenueRub: number; revenueCents: number };
    paymentsRevenueRub: number;
    totalRevenueRub: number;
  };
  byKind: Record<string, { count: number; revenueRub: number }>;
  funnel?: {
    clicked: number;
    pending: number;
    paid: number;
    canceled: number;
    abandonedPending: number;
    conversionPct: number;
    cancelPct: number;
    uniquePayers: number;
    avgTicketRub: number;
    last7d: {
      clicked: number;
      paid: number;
      canceled: number;
      revenueRub: number;
      conversionPct: number;
    };
    last30d: {
      clicked: number;
      paid: number;
      canceled: number;
      revenueRub: number;
      conversionPct: number;
    };
    byKind: Record<
      string,
      {
        started: number;
        paid: number;
        canceled: number;
        pending: number;
        revenueRub: number;
        conversionPct: number;
      }
    >;
    daily: Array<{
      date: string;
      clicked: number;
      paid: number;
      canceled: number;
      revenueRub: number;
    }>;
  };
  recent: {
    payments: Array<{
      id: string;
      kind: string;
      amountRub: number;
      status: string;
      createdAt: string;
      user: { id: string; username: string };
    }>;
    presetPurchases: Array<{
      id: string;
      amountCents: number;
      currency: string;
      purchasedAt: string;
      buyer: { id: string; username: string };
      preset: { id: string; title: string };
    }>;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  planExpiresAt: string | null;
  tokenBalance: number;
  createdAt: string;
  updatedAt: string;
}

interface Post {
  id: string;
  content: string;
  author: { id: string; username: string };
  createdAt: string;
  media: Array<{ id: string; type: string; url: string }>;
}

interface SoundTok {
  id: string;
  description: string;
  videoUrl: string;
  author: { id: string; username: string };
  createdAt: string;
  likes: number;
}

interface PaymentRow {
  id: string;
  kind: string;
  status: string;
  amountRub: number;
  description: string;
  createdAt: string;
  user: { id: string; username: string; email: string };
}

interface PresetPurchaseRow {
  id: string;
  amountCents: number;
  currency: string;
  purchasedAt: string;
  buyer: { id: string; username: string; email: string };
  preset: { id: string; title: string; priceCents: number };
}

interface ReportRow {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; username: string; email: string; role: string };
  reported: { id: string; username: string; email: string; role: string };
}

const KIND_LABELS: Record<string, string> = {
  PLAN_PRO: 'Подписка Pro',
  PLAN_PLATINUM: 'Подписка Platinum',
  TOKENS_400: 'Токены 400',
  TOKENS_800: 'Токены 800',
  TOKENS_1200: 'Токены 1200',
  TOKENS_2400: 'Токены 2400',
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ru-RU');
}

function formatRub(n: number) {
  return `${n.toLocaleString('ru-RU')} ₽`;
}

function kindLabel(kind: string) {
  return KIND_LABELS[kind] || kind;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('ALL');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [soundToks, setSoundToks] = useState<SoundTok[]>([]);
  const [soundToksTotal, setSoundToksTotal] = useState(0);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [presetPurchases, setPresetPurchases] = useState<PresetPurchaseRow[]>([]);
  const [presetPurchasesTotal, setPresetPurchasesTotal] = useState(0);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsOpenCount, setReportsOpenCount] = useState(0);
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>('OPEN');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('ALL');
  const [userQuery, setUserQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedAtRef = useRef(new Map<string, number>());

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(userQuery.trim()), 300);
    return () => window.clearTimeout(t);
  }, [userQuery]);

  const loadOverview = useCallback(async (force = false) => {
    const data = await adminFetch<AdminStats>(force ? '/stats?refresh=1' : '/stats');
    setStats(data);
  }, []);

  const loadUsers = useCallback(async (q: string, role: UserRoleFilter) => {
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
    if (q) qs.set('q', q);
    if (role !== 'ALL') qs.set('role', role);
    const data = await adminFetch<Paged<User>>(`/users?${qs}`);
    setUsers(data.items);
    setUsersTotal(data.total);
  }, []);

  const loadPosts = useCallback(async () => {
    const data = await adminFetch<Paged<Post>>(`/posts?limit=${PAGE_SIZE}&offset=0`);
    setPosts(data.items);
    setPostsTotal(data.total);
  }, []);

  const loadSoundToks = useCallback(async () => {
    const data = await adminFetch<Paged<SoundTok>>(`/soundtoks?limit=${PAGE_SIZE}&offset=0`);
    setSoundToks(data.items);
    setSoundToksTotal(data.total);
  }, []);

  const loadPurchases = useCallback(async (filter: PurchaseFilter, status: PaymentStatusFilter) => {
    if (filter === 'presets') {
      const data = await adminFetch<Paged<PresetPurchaseRow>>(
        `/preset-purchases?limit=${PAGE_SIZE}&offset=0`,
      );
      setPresetPurchases(data.items);
      setPresetPurchasesTotal(data.total);
      setPayments([]);
      setPaymentsTotal(0);
      return;
    }

    const qs = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: '0',
      status,
    });
    if (filter === 'subscriptions' || filter === 'tokens') qs.set('kind', filter);
    const [data, presets] = await Promise.all([
      adminFetch<Paged<PaymentRow>>(`/payments?${qs}`),
      filter === 'all'
        ? adminFetch<Paged<PresetPurchaseRow>>(
            `/preset-purchases?limit=${PAGE_SIZE}&offset=0`,
          )
        : Promise.resolve(null),
    ]);
    setPayments(data.items);
    setPaymentsTotal(data.total);

    if (presets) {
      setPresetPurchases(presets.items);
      setPresetPurchasesTotal(presets.total);
    } else {
      setPresetPurchases([]);
      setPresetPurchasesTotal(0);
    }
  }, []);

  const loadReports = useCallback(async (status: ReportStatusFilter) => {
    const qs = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: '0',
      status,
    });
    const data = await adminFetch<Paged<ReportRow> & { openCount?: number }>(`/reports?${qs}`);
    setReports(data.items);
    setReportsTotal(data.total);
    setReportsOpenCount(data.openCount ?? 0);
  }, []);

  const fetchData = useCallback(async (force = false) => {
    const cacheKey = [
      activeTab,
      activeTab === 'purchases' ? `${purchaseFilter}:${paymentStatusFilter}` : '',
      activeTab === 'reports' ? reportStatusFilter : '',
      activeTab === 'users' ? `${userRoleFilter}:${debouncedQuery}` : '',
    ].join(':');

    const loadedAt = loadedAtRef.current.get(cacheKey) ?? 0;
    if (!force && Date.now() - loadedAt < ADMIN_CACHE_TTL) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'overview':
          await loadOverview(force);
          break;
        case 'purchases':
          await loadPurchases(purchaseFilter, paymentStatusFilter);
          break;
        case 'reports':
          await loadReports(reportStatusFilter);
          break;
        case 'users':
          await loadUsers(debouncedQuery, userRoleFilter);
          break;
        case 'posts':
          await loadPosts();
          break;
        case 'soundtoks':
          await loadSoundToks();
          break;
      }
      loadedAtRef.current.set(cacheKey, Date.now());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Ошибка загрузки';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    purchaseFilter,
    paymentStatusFilter,
    reportStatusFilter,
    userRoleFilter,
    debouncedQuery,
    loadOverview,
    loadPurchases,
    loadReports,
    loadUsers,
    loadPosts,
    loadSoundToks,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const deleteUser = async (userId: string) => {
    if (!confirm('Удалить этого пользователя?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Не удалось удалить');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setUsersTotal((n) => Math.max(0, n - 1));
    } catch {
      alert('Не удалось удалить пользователя');
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm('Забанить (удалить) этого пользователя?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}/ban`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Не удалось забанить');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setUsersTotal((n) => Math.max(0, n - 1));
    } catch {
      alert('Не удалось забанить пользователя');
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Удалить этот пост?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/posts/${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Не удалось удалить');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPostsTotal((n) => Math.max(0, n - 1));
    } catch {
      alert('Не удалось удалить пост');
    }
  };

  const deleteSoundTok = async (soundTokId: string) => {
    if (!confirm('Удалить это видео?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/soundtoks/${soundTokId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Не удалось удалить');
      setSoundToks((prev) => prev.filter((s) => s.id !== soundTokId));
      setSoundToksTotal((n) => Math.max(0, n - 1));
    } catch {
      alert('Не удалось удалить видео');
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const res = await fetch(`${ADMIN_API}/reports/${reportId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Не удалось обновить');
      await loadReports(reportStatusFilter);
      if (stats) {
        void loadOverview(true);
      }
    } catch {
      alert('Не удалось обновить жалобу');
    }
  };

  const tabs = useMemo(
    () =>
      [
        { id: 'overview' as const, label: 'Обзор', icon: BarChart3 },
        { id: 'purchases' as const, label: 'Покупки', icon: CreditCard },
        {
          id: 'reports' as const,
          label: `Жалобы${
            stats?.totals.openReports != null
              ? ` (${stats.totals.openReports})`
              : reportsOpenCount
                ? ` (${reportsOpenCount})`
                : ''
          }`,
          icon: Flag,
        },
        {
          id: 'users' as const,
          label: `Пользователи${stats ? ` (${stats.totals.users})` : usersTotal ? ` (${usersTotal})` : ''}`,
          icon: Users,
        },
        {
          id: 'posts' as const,
          label: `Посты${stats ? ` (${stats.totals.posts})` : postsTotal ? ` (${postsTotal})` : ''}`,
          icon: FileText,
        },
        {
          id: 'soundtoks' as const,
          label: `Видео${stats ? ` (${stats.totals.soundToks})` : soundToksTotal ? ` (${soundToksTotal})` : ''}`,
          icon: Video,
        },
      ] as const,
    [stats, usersTotal, postsTotal, soundToksTotal, reportsOpenCount],
  );

  return (
    <div className="admin-root h-full flex flex-col bg-gray-900 min-h-0">
      <style>{ADMIN_CSS}</style>
      <div className="admin-topbar bg-gray-800 border-b border-gray-700 p-3 sm:p-4 flex items-center justify-between gap-3">
        <h1 className="admin-title text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={22} className="sm:w-6 sm:h-6" />
          Админ панель
        </h1>
        <button
          type="button"
          onClick={() => void fetchData(true)}
          className="admin-refresh inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
          title="Обновить"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Обновить</span>
        </button>
      </div>

      {error && (
        <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="admin-tabs bg-gray-800 border-b border-gray-700 overflow-x-auto">
        <div className="flex min-w-max sm:min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`admin-tab ${active ? 'active' : ''}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="admin-content flex-1 overflow-y-auto p-3 sm:p-4">
        {loading && !stats && activeTab === 'overview' ? (
          <div className="h-40 flex items-center justify-center text-gray-400">Загрузка…</div>
        ) : null}

        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<Crown size={18} />}
                label="Покупки подписок"
                value={String(stats.purchases.subscriptions.count)}
                hint={formatRub(stats.purchases.subscriptions.revenueRub)}
              />
              <StatCard
                icon={<Coins size={18} />}
                label="Покупки токенов"
                value={String(stats.purchases.tokens.count)}
                hint={formatRub(stats.purchases.tokens.revenueRub)}
              />
              <StatCard
                icon={<Package size={18} />}
                label="Покупки пресетов"
                value={String(stats.purchases.presets.count)}
                hint={formatRub(stats.purchases.presets.revenueRub)}
              />
              <StatCard
                icon={<CreditCard size={18} />}
                label="Выручка всего"
                value={formatRub(stats.purchases.totalRevenueRub)}
                hint={`Ожидают оплаты: ${stats.totals.pendingPayments}`}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <MiniStat label="Пользователи" value={stats.totals.users} />
              <MiniStat label="Активные Pro" value={stats.plans.activePro} />
              <MiniStat label="Активные Platinum" value={stats.plans.activePlatinum} />
              <MiniStat label="Пресеты в каталоге" value={stats.totals.presetsPublished} />
              <MiniStat label="Открытые жалобы" value={stats.totals.openReports ?? 0} />
            </div>

            {stats.funnel && (
              <section className="bg-gray-800/80 rounded-xl border border-gray-700 p-4 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 className="text-white font-semibold">Воронка оплаты</h2>
                  <p className="text-xs text-gray-500">
                    Клик «Оплатить» = попытка · письмо только после реальной оплаты
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={<CreditCard size={18} />}
                    label="Нажали оплатить"
                    value={String(stats.funnel.clicked)}
                    hint={`Конверсия ${stats.funnel.conversionPct}%`}
                  />
                  <StatCard
                    icon={<Coins size={18} />}
                    label="Оплатили"
                    value={String(stats.funnel.paid)}
                    hint={`Средний чек ${formatRub(stats.funnel.avgTicketRub)}`}
                  />
                  <StatCard
                    icon={<Package size={18} />}
                    label="Отменили / ушли"
                    value={String(stats.funnel.canceled)}
                    hint={`Отвал ${stats.funnel.cancelPct}%`}
                  />
                  <StatCard
                    icon={<BarChart3 size={18} />}
                    label="Ждут оплаты"
                    value={String(stats.funnel.pending)}
                    hint={`Брошено >1ч: ${stats.funnel.abandonedPending}`}
                  />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MiniStat label="Уник. плательщики" value={stats.funnel.uniquePayers} />
                  <MiniStat
                    label="7д клики → оплата"
                    value={`${stats.funnel.last7d.clicked} → ${stats.funnel.last7d.paid}`}
                  />
                  <MiniStat
                    label="7д конверсия"
                    value={`${stats.funnel.last7d.conversionPct}%`}
                  />
                  <MiniStat
                    label="7д выручка"
                    value={formatRub(stats.funnel.last7d.revenueRub)}
                  />
                  <MiniStat
                    label="30д клики → оплата"
                    value={`${stats.funnel.last30d.clicked} → ${stats.funnel.last30d.paid}`}
                  />
                  <MiniStat
                    label="30д конверсия"
                    value={`${stats.funnel.last30d.conversionPct}%`}
                  />
                  <MiniStat
                    label="30д выручка"
                    value={formatRub(stats.funnel.last30d.revenueRub)}
                  />
                  <MiniStat
                    label="30д отмены"
                    value={stats.funnel.last30d.canceled}
                  />
                </div>

                {Object.keys(stats.funnel.byKind).length > 0 && (
                  <div>
                    <h3 className="text-gray-300 text-sm font-medium mb-2">По продуктам</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(stats.funnel.byKind).map(([kind, row]) => (
                        <div
                          key={kind}
                          className="rounded-lg bg-gray-900/60 px-3 py-2 text-sm space-y-1"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-300">{kindLabel(kind)}</span>
                            <span className="text-emerald-400">{row.conversionPct}%</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            клик {row.started} · оплата {row.paid} · отмена {row.canceled} · ждёт{' '}
                            {row.pending}
                          </p>
                          <p className="text-xs text-gray-400">{formatRub(row.revenueRub)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.funnel.daily.some((d) => d.clicked > 0) && (
                  <div>
                    <h3 className="text-gray-300 text-sm font-medium mb-2">14 дней</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-gray-500 border-b border-gray-700">
                          <tr>
                            <th className="py-1.5 pr-3 font-medium">Дата</th>
                            <th className="py-1.5 pr-3 font-medium">Клики</th>
                            <th className="py-1.5 pr-3 font-medium">Оплаты</th>
                            <th className="py-1.5 pr-3 font-medium">Отмены</th>
                            <th className="py-1.5 font-medium">Выручка</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.funnel.daily.map((d) => (
                            <tr key={d.date} className="border-b border-gray-800 text-gray-300">
                              <td className="py-1.5 pr-3 font-mono text-gray-500">{d.date}</td>
                              <td className="py-1.5 pr-3">{d.clicked}</td>
                              <td className="py-1.5 pr-3 text-emerald-400">{d.paid}</td>
                              <td className="py-1.5 pr-3 text-amber-400/90">{d.canceled}</td>
                              <td className="py-1.5">{formatRub(d.revenueRub)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {Object.keys(stats.byKind).length > 0 && (
              <section className="bg-gray-800/80 rounded-xl border border-gray-700 p-4">
                <h2 className="text-white font-semibold mb-3">Разбивка платежей</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(stats.byKind).map(([kind, row]) => (
                    <div
                      key={kind}
                      className="flex items-center justify-between gap-2 rounded-lg bg-gray-900/60 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-300">{kindLabel(kind)}</span>
                      <span className="text-gray-400">
                        {row.count} · {formatRub(row.revenueRub)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="bg-gray-800/80 rounded-xl border border-gray-700 p-4">
                <h2 className="text-white font-semibold mb-3">Последние платежи</h2>
                {stats.recent.payments.length === 0 ? (
                  <p className="text-gray-500 text-sm">Пока нет успешных платежей</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start justify-between gap-3 text-sm border-b border-gray-700/60 pb-2 last:border-0"
                      >
                        <div>
                          <p className="text-white">{kindLabel(p.kind)}</p>
                          <p className="text-gray-400">@{p.user.username}</p>
                          <p className="text-gray-500 text-xs">{formatDate(p.createdAt)}</p>
                        </div>
                        <span className="text-emerald-400 font-medium whitespace-nowrap">
                          {formatRub(p.amountRub)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-gray-800/80 rounded-xl border border-gray-700 p-4">
                <h2 className="text-white font-semibold mb-3">Последние покупки пресетов</h2>
                {stats.recent.presetPurchases.length === 0 ? (
                  <p className="text-gray-500 text-sm">Пока нет покупок пресетов</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.presetPurchases.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start justify-between gap-3 text-sm border-b border-gray-700/60 pb-2 last:border-0"
                      >
                        <div>
                          <p className="text-white">{p.preset.title}</p>
                          <p className="text-gray-400">@{p.buyer.username}</p>
                          <p className="text-gray-500 text-xs">{formatDate(p.purchasedAt)}</p>
                        </div>
                        <span className="text-emerald-400 font-medium whitespace-nowrap">
                          {formatRub(Math.round(p.amountCents / 100))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Все'],
                  ['subscriptions', 'Подписки'],
                  ['tokens', 'Токены'],
                  ['presets', 'Пресеты'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPurchaseFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    purchaseFilter === id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {purchaseFilter !== 'presets' && (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['ALL', 'Все статусы'],
                    ['SUCCEEDED', 'Оплачено'],
                    ['PENDING', 'Нажали / ждут'],
                    ['CANCELED', 'Отменено'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentStatusFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      paymentStatusFilter === id
                        ? 'bg-amber-700/80 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="h-32 flex items-center justify-center text-gray-400">Загрузка…</div>
            ) : (
              <>
                {purchaseFilter !== 'presets' && (
                  <section className="space-y-3">
                    <h2 className="text-white font-medium">
                      Платежи ({paymentsTotal})
                    </h2>
                    {payments.length === 0 ? (
                      <p className="text-gray-500 text-sm">Нет платежей</p>
                    ) : (
                      payments.map((p) => (
                        <div key={p.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-white font-medium">{kindLabel(p.kind)}</p>
                              <p className="text-gray-400 text-sm">
                                @{p.user.username} · {p.user.email}
                              </p>
                              <p className="text-gray-500 text-xs">{formatDate(p.createdAt)}</p>
                              <p className="text-gray-500 text-xs mt-1 truncate max-w-xl">
                                {p.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 font-semibold">
                                {formatRub(p.amountRub)}
                              </p>
                              <p
                                className={`text-xs ${
                                  p.status === 'SUCCEEDED'
                                    ? 'text-emerald-400'
                                    : p.status === 'CANCELED'
                                      ? 'text-amber-400'
                                      : 'text-sky-400'
                                }`}
                              >
                                {p.status === 'SUCCEEDED'
                                  ? 'Оплачено'
                                  : p.status === 'CANCELED'
                                    ? 'Отменено'
                                    : 'Нажали / ждут'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                )}

                {(purchaseFilter === 'presets' || purchaseFilter === 'all') && (
                  <section className="space-y-3">
                    <h2 className="text-white font-medium">
                      Пресеты ({presetPurchasesTotal})
                    </h2>
                    {presetPurchases.length === 0 ? (
                      <p className="text-gray-500 text-sm">Нет покупок пресетов</p>
                    ) : (
                      presetPurchases.map((p) => (
                        <div key={p.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-white font-medium">{p.preset.title}</p>
                              <p className="text-gray-400 text-sm">
                                @{p.buyer.username} · {p.buyer.email}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatDate(p.purchasedAt)}
                              </p>
                            </div>
                            <p className="text-emerald-400 font-semibold">
                              {formatRub(Math.round(p.amountCents / 100))}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['OPEN', 'Открытые'],
                  ['REVIEWING', 'В работе'],
                  ['RESOLVED', 'Решено'],
                  ['DISMISSED', 'Отклонено'],
                  ['ALL', 'Все'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReportStatusFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    reportStatusFilter === id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs">
              Показано: {reportsTotal} · открытых всего: {reportsOpenCount}
            </p>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-gray-400">Загрузка…</div>
            ) : reports.length === 0 ? (
              <p className="text-gray-500 text-sm">Жалоб нет</p>
            ) : (
              reports.map((report) => {
                const reasonLabel =
                  REPORT_REASON_OPTIONS.find((r) => r.id === report.reason)?.label || report.reason;
                return (
                  <div key={report.id} className="bg-gray-800 rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">{reasonLabel}</p>
                        <p className="text-gray-300 text-sm mt-1">
                          На{' '}
                          <a
                            className="text-emerald-400 hover:underline"
                            href={`/profile/${report.reported.username}`}
                          >
                            @{report.reported.username}
                          </a>
                          {' · '}от @{report.reporter.username}
                        </p>
                        {report.details && (
                          <p className="text-gray-400 text-sm mt-2 whitespace-pre-wrap">{report.details}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-2">{formatDate(report.createdAt)}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 h-fit">
                        {report.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.status !== 'REVIEWING' && (
                        <button
                          type="button"
                          onClick={() => void updateReportStatus(report.id, 'REVIEWING')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-amber-700 hover:bg-amber-600 text-white"
                        >
                          В работу
                        </button>
                      )}
                      {report.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => void updateReportStatus(report.id, 'RESOLVED')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white"
                        >
                          Решено
                        </button>
                      )}
                      {report.status !== 'DISMISSED' && (
                        <button
                          type="button"
                          onClick={() => void updateReportStatus(report.id, 'DISMISSED')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-gray-600 hover:bg-gray-500 text-white"
                        >
                          Отклонить
                        </button>
                      )}
                      {report.status !== 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => void updateReportStatus(report.id, 'OPEN')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-sky-800 hover:bg-sky-700 text-white"
                        >
                          Открыть снова
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['ALL', 'Все'],
                  ['ADMIN', 'Админы'],
                  ['USER', 'Юзеры'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUserRoleFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    userRoleFilter === id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Поиск по username или email…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-gray-500 text-xs">Найдено: {usersTotal}</p>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-gray-400">Загрузка…</div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">@{user.username}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                        <p className="text-gray-500 text-xs">{formatDate(user.createdAt)}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs rounded ${
                              user.role === 'ADMIN'
                                ? 'bg-emerald-700 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {user.role}
                          </span>
                          <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-200">
                            {user.plan}
                          </span>
                          <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-200">
                            {user.tokenBalance} ток.
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => banUser(user.id)}
                          className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white"
                          title="Забанить"
                        >
                          <Ban size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(user.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">Всего: {postsTotal}</p>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-gray-400">Загрузка…</div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white mb-2 line-clamp-3">{post.content}</p>
                      <p className="text-gray-400 text-sm mb-1">
                        Автор: @{post.author.username}
                      </p>
                      <p className="text-gray-500 text-xs">{formatDate(post.createdAt)}</p>
                      {post.media?.length > 0 && (
                        <p className="text-gray-400 text-xs mt-2">
                          Медиа: {post.media.map((m) => m.type).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                      title="Удалить пост"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'soundtoks' && (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">Всего: {soundToksTotal}</p>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-gray-400">Загрузка…</div>
            ) : (
              soundToks.map((soundTok) => (
                <div key={soundTok.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white mb-2 line-clamp-3">{soundTok.description}</p>
                      <p className="text-gray-400 text-sm mb-1">
                        Автор: @{soundTok.author.username} · Лайки: {soundTok.likes}
                      </p>
                      <p className="text-gray-500 text-xs">{formatDate(soundTok.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSoundTok(soundTok.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                      title="Удалить видео"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
        {icon}
        {label}
      </div>
      <p className="text-white text-2xl font-semibold">{value}</p>
      <p className="text-gray-400 text-sm mt-1">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800/50 px-4 py-3">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-white text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
