import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { billingApi, type PaymentKind } from '../api/billing';
import { useBilling } from '../hooks/useBilling';
import { useAuthStore } from '../store/authStore';

const TOKEN_PACK_UI: Array<{
  kind: Extract<PaymentKind, `TOKENS_${number}`>;
  tokens: number;
  gens: number;
  price: number;
  badge: string | null;
  highlight?: boolean;
}> = [
  { kind: 'TOKENS_400', tokens: 400, gens: 4, price: 199, badge: null },
  { kind: 'TOKENS_800', tokens: 800, gens: 8, price: 359, badge: '−10%' },
  { kind: 'TOKENS_1200', tokens: 1200, gens: 12, price: 499, badge: '−16%', highlight: true },
  { kind: 'TOKENS_2400', tokens: 2400, gens: 24, price: 899, badge: '−25%' },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
.pr {
  --bg:#0c0b0a; --ink:#f3efe8; --muted:#9a948c; --line:rgba(243,239,232,.12); --accent:#e8a87c;
  --save:#9dffa8; --save-dim:rgba(157,255,168,.12);
  min-height:100%; background:var(--bg); color:var(--ink);
  font-family:'Instrument Sans',sans-serif; padding:28px 24px 64px;
}
.pr *{box-sizing:border-box}
.pr-wrap{max-width:980px;margin:0 auto}
.pr h1{margin:0 0 8px;font-size:clamp(28px,4vw,40px);letter-spacing:-.04em}
.pr-sub{color:var(--muted);margin:0 0 28px;line-height:1.5}
.pr-status{
  border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:28px;
  display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;
}
.pr-status strong{font-size:18px}
.pr-meta{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--muted)}
.pr-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-bottom:32px}
.pr-card{
  border:1px solid var(--line);border-radius:16px;padding:20px;background:#141210;
  display:flex;flex-direction:column;gap:10px;min-height:280px;
}
.pr-card.current{border-color:rgba(232,168,124,.55)}
.pr-card h2{margin:0;font-size:22px;letter-spacing:-.03em}
.pr-price{font-size:28px;font-weight:700;letter-spacing:-.03em}
.pr-price span{font-size:13px;color:var(--muted);font-weight:500}
.pr-card ul{margin:0;padding-left:18px;color:var(--muted);font-size:14px;line-height:1.55;flex:1}
.pr-btn{
  height:42px;border-radius:999px;border:1px solid var(--line);background:transparent;
  color:var(--ink);font:inherit;font-weight:600;cursor:pointer;
}
.pr-btn.primary{background:var(--ink);color:#12100e;border-color:var(--ink)}
.pr-btn:disabled{opacity:.45;cursor:not-allowed}
.pr-packs-head{margin:8px 0 8px}
.pr-packs-title{margin:0;font-size:22px;letter-spacing:-.03em}
.pr-packs-hint{margin:8px 0 16px;color:var(--muted);font-size:14px;line-height:1.5}
.pr-packs-hint strong{color:var(--accent);font-weight:600}
.pr-packs{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:8px}
.pr-pack{
  position:relative;border:1px solid var(--line);border-radius:16px;padding:18px;
  display:flex;flex-direction:column;gap:12px;background:#141210;min-height:210px;
}
.pr-pack.highlight{border-color:rgba(232,168,124,.55);box-shadow:0 0 0 1px rgba(232,168,124,.18)}
.pr-pack-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.pr-pack-badge{
  flex-shrink:0;padding:4px 8px;border-radius:999px;font:11px/1 'IBM Plex Mono',monospace;
  color:var(--save);background:var(--save-dim);border:1px solid rgba(157,255,168,.28);
}
.pr-pack-popular{
  position:absolute;top:-10px;left:16px;padding:3px 10px;border-radius:999px;
  font:10px/1 'IBM Plex Mono',monospace;letter-spacing:.04em;text-transform:uppercase;
  color:#12100e;background:var(--accent);
}
.pr-pack strong{font-size:18px;letter-spacing:-.02em}
.pr-pack-price-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pr-pack-price{font-size:28px;font-weight:700;letter-spacing:-.03em}
.pr-pack-old{font:13px 'IBM Plex Mono',monospace;color:var(--muted);text-decoration:line-through}
.pr-pack-unit{font:12px 'IBM Plex Mono',monospace;color:var(--muted)}
.pr-pack-save{font:12px 'IBM Plex Mono',monospace;color:var(--save)}
.pr-pack .pr-btn{width:100%;margin-top:auto}
.pr-err{color:#ff8a8a;margin:12px 0;font-size:14px}
.pr-ok{color:#9dffa8;margin:12px 0;font-size:14px}
.pr a{color:var(--accent)}
`;

export default function Pricing() {
  const user = useAuthStore((s) => s.user);
  const { billing, refresh, loading } = useBilling();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [params] = useSearchParams();

  const basePerGen = TOKEN_PACK_UI[0].price / TOKEN_PACK_UI[0].gens;

  const packs = useMemo(
    () =>
      TOKEN_PACK_UI.map((pack) => {
        const compareAt = Math.round(basePerGen * pack.gens);
        const saveRub = Math.max(0, compareAt - pack.price);
        const savePercent = compareAt > 0 ? Math.round((saveRub / compareAt) * 100) : 0;
        const perGen = Math.round((pack.price / pack.gens) * 10) / 10;
        return { ...pack, compareAt, saveRub, savePercent, perGen };
      }),
    [basePerGen]
  );

  useEffect(() => {
    const paymentId = params.get('paymentId') || localStorage.getItem('sl_pending_payment');
    if (!paymentId) return;
    void (async () => {
      try {
        await billingApi.syncPayment(paymentId);
        localStorage.removeItem('sl_pending_payment');
        setMsg('Платёж обработан. Тариф и токены обновлены.');
        await refresh();
      } catch {
        /* webhook may still complete */
      }
    })();
  }, [params, refresh]);

  const pay = async (kind: PaymentKind) => {
    setErr('');
    setMsg('');
    setBusy(kind);
    try {
      const returnUrl = `${window.location.origin}/pricing?payment=return`;
      const created = await billingApi.createPayment(kind, returnUrl);
      if (created.paymentId) localStorage.setItem('sl_pending_payment', created.paymentId);
      if (!created.confirmationUrl) throw new Error('Нет ссылки на оплату');
      window.location.href = created.confirmationUrl;
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Не удалось создать платёж');
      setBusy(null);
    }
  };

  const plan = billing?.plan || (user as any)?.plan || 'FREE';

  return (
    <div className="pr">
      <style>{css}</style>
      <div className="pr-wrap">
        <h1>Тарифы SoundLab</h1>
        <p className="pr-sub">
          Free — старт. Pro и Platinum — облако, AI-токены и вокальные пресеты.
          Токены можно докупить в любой момент, не дожидаясь нового месяца.
        </p>

        <div className="pr-status">
          <div>
            <div className="pr-meta">Текущий тариф</div>
            <strong>{plan}</strong>
            {billing?.planExpiresAt && (
              <div className="pr-meta">до {new Date(billing.planExpiresAt).toLocaleDateString('ru-RU')}</div>
            )}
          </div>
          <div className="pr-meta">
            Токены: {billing?.tokenBalance ?? (user as any)?.tokenBalance ?? 0}
            {' · '}
            Генераций: {billing?.generationsAvailable ?? 0}
            {' · '}
            Проекты: {billing?.cloudProjectCount ?? 0}
            {billing?.maxCloudProjects != null ? `/${billing.maxCloudProjects}` : ''}
          </div>
        </div>

        {err && <div className="pr-err">{err}</div>}
        {msg && <div className="pr-ok">{msg}</div>}
        {loading && <div className="pr-meta">Обновление…</div>}

        <div className="pr-grid">
          <article className={`pr-card${plan === 'FREE' ? ' current' : ''}`}>
            <h2>Free</h2>
            <div className="pr-price">0 ₽ <span>/ всегда</span></div>
            <ul>
              <li>5 проектов секвенсора в облаке</li>
              <li>0 AI-генераций</li>
              <li>Вокальные пресеты недоступны</li>
            </ul>
            <button className="pr-btn" disabled>Текущий / базовый</button>
          </article>

          <article className={`pr-card${plan === 'PRO' ? ' current' : ''}`}>
            <h2>Pro</h2>
            <div className="pr-price">249 ₽ <span>/ 30 дней</span></div>
            <ul>
              <li>30 проектов в облаке</li>
              <li>300 токенов (3 генерации)</li>
              <li>Вокальные пресеты</li>
            </ul>
            <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay('PLAN_PRO')}>
              {busy === 'PLAN_PRO' ? 'Переход…' : 'Оформить Pro'}
            </button>
          </article>

          <article className={`pr-card${plan === 'PLATINUM' ? ' current' : ''}`}>
            <h2>Platinum</h2>
            <div className="pr-price">499 ₽ <span>/ 30 дней</span></div>
            <ul>
              <li>Безлимит функций</li>
              <li>До 20 сохранений в облако в день</li>
              <li>700 токенов (7 генераций)</li>
              <li>Вокальные пресеты</li>
            </ul>
            <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay('PLAN_PLATINUM')}>
              {busy === 'PLAN_PLATINUM' ? 'Переход…' : 'Оформить Platinum'}
            </button>
          </article>
        </div>

        <div className="pr-packs-head">
          <h2 className="pr-packs-title">Доп. пакеты токенов</h2>
          <p className="pr-packs-hint">
            100 токенов = 1 AI-генерация.{' '}
            <strong>Чем больше пакет — тем дешевле генерация.</strong>
          </p>
        </div>
        <div className="pr-packs">
          {packs.map((pack) => (
            <div className={`pr-pack${pack.highlight ? ' highlight' : ''}`} key={pack.kind}>
              {pack.highlight && <span className="pr-pack-popular">Выгоднее</span>}
              <div className="pr-pack-top">
                <strong>{pack.tokens} токенов</strong>
                {pack.badge && <span className="pr-pack-badge">{pack.badge}</span>}
              </div>
              <div className="pr-pack-price-row">
                <span className="pr-pack-price">{pack.price} ₽</span>
                {pack.saveRub > 0 && <span className="pr-pack-old">{pack.compareAt} ₽</span>}
              </div>
              <div className="pr-pack-unit">
                ≈ {pack.gens} генераций · {pack.perGen} ₽ / генерация
              </div>
              {pack.saveRub > 0 ? (
                <div className="pr-pack-save">
                  Экономия {pack.saveRub} ₽ (−{pack.savePercent}%) vs маленький пакет
                </div>
              ) : (
                <div className="pr-pack-unit">Базовая цена за генерацию</div>
              )}
              <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay(pack.kind)}>
                {busy === pack.kind ? 'Переход…' : 'Купить'}
              </button>
            </div>
          ))}
        </div>

        <p className="pr-sub" style={{ marginTop: 28 }}>
          Оплата через ЮKassa. После оплаты вернётесь на эту страницу.
          {' '}
          <Link to="/offer">Оферта</Link>
          {' · '}
          <Link to="/privacy">Конфиденциальность</Link>
          {' · '}
          <Link to="/refunds">Возвраты</Link>
          {' · '}
          <Link to="/delivery">Получение услуги</Link>
          {' · '}
          <Link to="/contacts">Контакты</Link>
        </p>
      </div>
    </div>
  );
}
