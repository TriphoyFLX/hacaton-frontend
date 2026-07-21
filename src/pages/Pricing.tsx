import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { billingApi, type PaymentKind } from '../api/billing';
import { useBilling } from '../hooks/useBilling';
import { useAuthStore } from '../store/authStore';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
.pr {
  --bg:#0c0b0a; --ink:#f3efe8; --muted:#9a948c; --line:rgba(243,239,232,.12); --accent:#e8a87c;
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
.pr-pack{
  border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-wrap:wrap;
  gap:12px;align-items:center;justify-content:space-between;background:#141210;
}
.pr-packs{display:grid;gap:12px;margin-bottom:8px}
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

        <h2 style={{ margin: '8px 0 14px', fontSize: 22, letterSpacing: '-0.03em' }}>Доп. пакеты токенов</h2>
        <div className="pr-packs">
          {([
            { kind: 'TOKENS_400' as const, tokens: 400, gens: 4, price: 199 },
            { kind: 'TOKENS_800' as const, tokens: 800, gens: 8, price: 379 },
            { kind: 'TOKENS_1200' as const, tokens: 1200, gens: 12, price: 529 },
            { kind: 'TOKENS_2400' as const, tokens: 2400, gens: 24, price: 949 },
          ]).map((pack) => (
            <div className="pr-pack" key={pack.kind}>
              <div>
                <strong>{pack.tokens} токенов</strong>
                <div className="pr-meta">≈ {pack.gens} AI-генераций · {pack.price} ₽</div>
              </div>
              <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay(pack.kind)}>
                {busy === pack.kind ? 'Переход…' : 'Купить'}
              </button>
            </div>
          ))}
        </div>

        <p className="pr-sub" style={{ marginTop: 28 }}>
          Оплата через ЮKassa (тест). После оплаты вернётесь на эту страницу.
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
