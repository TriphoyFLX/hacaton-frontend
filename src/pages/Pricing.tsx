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
  { kind: 'TOKENS_800', tokens: 800, gens: 8, price: 359, badge: 'в€’10%' },
  { kind: 'TOKENS_1200', tokens: 1200, gens: 12, price: 499, badge: 'в€’16%', highlight: true },
  { kind: 'TOKENS_2400', tokens: 2400, gens: 24, price: 899, badge: 'в€’25%' },
];

const css = `
.pr {
  --bg:#0c0b0a; --ink:#f3efe8; --muted:#9a948c; --line:rgba(243,239,232,.12); --accent:#e8a87c;
  --save:#9dffa8; --save-dim:rgba(157,255,168,.12);
  min-height:100%; background:var(--bg); color:var(--ink);
  font-family:'Syne',sans-serif; padding:28px 24px 64px;
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
.pr-meta{font-family:'DM Mono',monospace;font-size:12px;color:var(--muted)}
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
  flex-shrink:0;padding:4px 8px;border-radius:999px;font:11px/1 'DM Mono',monospace;
  color:var(--save);background:var(--save-dim);border:1px solid rgba(157,255,168,.28);
}
.pr-pack-popular{
  position:absolute;top:-10px;left:16px;padding:3px 10px;border-radius:999px;
  font:10px/1 'DM Mono',monospace;letter-spacing:.04em;text-transform:uppercase;
  color:#12100e;background:var(--accent);
}
.pr-pack strong{font-size:18px;letter-spacing:-.02em}
.pr-pack-price-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pr-pack-price{font-size:28px;font-weight:700;letter-spacing:-.03em}
.pr-pack-old{font:13px 'DM Mono',monospace;color:var(--muted);text-decoration:line-through}
.pr-pack-unit{font:12px 'DM Mono',monospace;color:var(--muted)}
.pr-pack-save{font:12px 'DM Mono',monospace;color:var(--save)}
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
        setMsg('РџР»Р°С‚С‘Р¶ РѕР±СЂР°Р±РѕС‚Р°РЅ. РўР°СЂРёС„ Рё С‚РѕРєРµРЅС‹ РѕР±РЅРѕРІР»РµРЅС‹.');
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
      if (!created.confirmationUrl) throw new Error('РќРµС‚ СЃСЃС‹Р»РєРё РЅР° РѕРїР»Р°С‚Сѓ');
      window.location.href = created.confirmationUrl;
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїР»Р°С‚С‘Р¶');
      setBusy(null);
    }
  };

  const plan = billing?.plan || (user as any)?.plan || 'FREE';

  return (
    <div className="pr">
      <style>{css}</style>
      <div className="pr-wrap">
        <h1>РўР°СЂРёС„С‹ SoundLab</h1>
        <p className="pr-sub">
          Free вЂ” СЃС‚Р°СЂС‚. Pro Рё Platinum вЂ” РѕР±Р»Р°РєРѕ, AI-С‚РѕРєРµРЅС‹ Рё РІРѕРєР°Р»СЊРЅС‹Рµ РїСЂРµСЃРµС‚С‹.
          РўРѕРєРµРЅС‹ РјРѕР¶РЅРѕ РґРѕРєСѓРїРёС‚СЊ РІ Р»СЋР±РѕР№ РјРѕРјРµРЅС‚, РЅРµ РґРѕР¶РёРґР°СЏСЃСЊ РЅРѕРІРѕРіРѕ РјРµСЃСЏС†Р°.
        </p>

        <div className="pr-status">
          <div>
            <div className="pr-meta">РўРµРєСѓС‰РёР№ С‚Р°СЂРёС„</div>
            <strong>{plan}</strong>
            {billing?.planExpiresAt && (
              <div className="pr-meta">РґРѕ {new Date(billing.planExpiresAt).toLocaleDateString('ru-RU')}</div>
            )}
          </div>
          <div className="pr-meta">
            РўРѕРєРµРЅС‹: {billing?.tokenBalance ?? (user as any)?.tokenBalance ?? 0}
            {' В· '}
            Р“РµРЅРµСЂР°С†РёР№: {billing?.generationsAvailable ?? 0}
            {' В· '}
            РџСЂРѕРµРєС‚С‹: {billing?.cloudProjectCount ?? 0}
            {billing?.maxCloudProjects != null ? `/${billing.maxCloudProjects}` : ''}
          </div>
        </div>

        {err && <div className="pr-err">{err}</div>}
        {msg && <div className="pr-ok">{msg}</div>}
        {loading && <div className="pr-meta">РћР±РЅРѕРІР»РµРЅРёРµвЂ¦</div>}

        <div className="pr-grid">
          <article className={`pr-card${plan === 'FREE' ? ' current' : ''}`}>
            <h2>Free</h2>
            <div className="pr-price">0 в‚Ѕ <span>/ РІСЃРµРіРґР°</span></div>
            <ul>
              <li>5 РїСЂРѕРµРєС‚РѕРІ СЃРµРєРІРµРЅСЃРѕСЂР° РІ РѕР±Р»Р°РєРµ</li>
              <li>0 AI-РіРµРЅРµСЂР°С†РёР№</li>
              <li>Р’РѕРєР°Р»СЊРЅС‹Рµ РїСЂРµСЃРµС‚С‹ РЅРµРґРѕСЃС‚СѓРїРЅС‹</li>
            </ul>
            <button className="pr-btn" disabled>РўРµРєСѓС‰РёР№ / Р±Р°Р·РѕРІС‹Р№</button>
          </article>

          <article className={`pr-card${plan === 'PRO' ? ' current' : ''}`}>
            <h2>Pro</h2>
            <div className="pr-price">249 в‚Ѕ <span>/ 30 РґРЅРµР№</span></div>
            <ul>
              <li>30 РїСЂРѕРµРєС‚РѕРІ РІ РѕР±Р»Р°РєРµ</li>
              <li>300 С‚РѕРєРµРЅРѕРІ (3 РіРµРЅРµСЂР°С†РёРё)</li>
              <li>Р’РѕРєР°Р»СЊРЅС‹Рµ РїСЂРµСЃРµС‚С‹</li>
            </ul>
            <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay('PLAN_PRO')}>
              {busy === 'PLAN_PRO' ? 'РџРµСЂРµС…РѕРґвЂ¦' : 'РћС„РѕСЂРјРёС‚СЊ Pro'}
            </button>
          </article>

          <article className={`pr-card${plan === 'PLATINUM' ? ' current' : ''}`}>
            <h2>Platinum</h2>
            <div className="pr-price">499 в‚Ѕ <span>/ 30 РґРЅРµР№</span></div>
            <ul>
              <li>Р‘РµР·Р»РёРјРёС‚ С„СѓРЅРєС†РёР№</li>
              <li>Р”Рѕ 20 СЃРѕС…СЂР°РЅРµРЅРёР№ РІ РѕР±Р»Р°РєРѕ РІ РґРµРЅСЊ</li>
              <li>700 С‚РѕРєРµРЅРѕРІ (7 РіРµРЅРµСЂР°С†РёР№)</li>
              <li>Р’РѕРєР°Р»СЊРЅС‹Рµ РїСЂРµСЃРµС‚С‹</li>
            </ul>
            <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay('PLAN_PLATINUM')}>
              {busy === 'PLAN_PLATINUM' ? 'РџРµСЂРµС…РѕРґвЂ¦' : 'РћС„РѕСЂРјРёС‚СЊ Platinum'}
            </button>
          </article>
        </div>

        <div className="pr-packs-head">
          <h2 className="pr-packs-title">Р”РѕРї. РїР°РєРµС‚С‹ С‚РѕРєРµРЅРѕРІ</h2>
          <p className="pr-packs-hint">
            100 С‚РѕРєРµРЅРѕРІ = 1 AI-РіРµРЅРµСЂР°С†РёСЏ.{' '}
            <strong>Р§РµРј Р±РѕР»СЊС€Рµ РїР°РєРµС‚ вЂ” С‚РµРј РґРµС€РµРІР»Рµ РіРµРЅРµСЂР°С†РёСЏ.</strong>
          </p>
        </div>
        <div className="pr-packs">
          {packs.map((pack) => (
            <div className={`pr-pack${pack.highlight ? ' highlight' : ''}`} key={pack.kind}>
              {pack.highlight && <span className="pr-pack-popular">Р’С‹РіРѕРґРЅРµРµ</span>}
              <div className="pr-pack-top">
                <strong>{pack.tokens} С‚РѕРєРµРЅРѕРІ</strong>
                {pack.badge && <span className="pr-pack-badge">{pack.badge}</span>}
              </div>
              <div className="pr-pack-price-row">
                <span className="pr-pack-price">{pack.price} в‚Ѕ</span>
                {pack.saveRub > 0 && <span className="pr-pack-old">{pack.compareAt} в‚Ѕ</span>}
              </div>
              <div className="pr-pack-unit">
                в‰€ {pack.gens} РіРµРЅРµСЂР°С†РёР№ В· {pack.perGen} в‚Ѕ / РіРµРЅРµСЂР°С†РёСЏ
              </div>
              {pack.saveRub > 0 ? (
                <div className="pr-pack-save">
                  Р­РєРѕРЅРѕРјРёСЏ {pack.saveRub} в‚Ѕ (в€’{pack.savePercent}%) vs РјР°Р»РµРЅСЊРєРёР№ РїР°РєРµС‚
                </div>
              ) : (
                <div className="pr-pack-unit">Р‘Р°Р·РѕРІР°СЏ С†РµРЅР° Р·Р° РіРµРЅРµСЂР°С†РёСЋ</div>
              )}
              <button className="pr-btn primary" disabled={!!busy} onClick={() => void pay(pack.kind)}>
                {busy === pack.kind ? 'РџРµСЂРµС…РѕРґвЂ¦' : 'РљСѓРїРёС‚СЊ'}
              </button>
            </div>
          ))}
        </div>

        <p className="pr-sub" style={{ marginTop: 28 }}>
          РћРїР»Р°С‚Р° С‡РµСЂРµР· Р®Kassa. РџРѕСЃР»Рµ РѕРїР»Р°С‚С‹ РІРµСЂРЅС‘С‚РµСЃСЊ РЅР° СЌС‚Сѓ СЃС‚СЂР°РЅРёС†Сѓ.
          {' '}
          <Link to="/offer">РћС„РµСЂС‚Р°</Link>
          {' В· '}
          <Link to="/privacy">РљРѕРЅС„РёРґРµРЅС†РёР°Р»СЊРЅРѕСЃС‚СЊ</Link>
          {' В· '}
          <Link to="/refunds">Р’РѕР·РІСЂР°С‚С‹</Link>
          {' В· '}
          <Link to="/delivery">РџРѕР»СѓС‡РµРЅРёРµ СѓСЃР»СѓРіРё</Link>
          {' В· '}
          <Link to="/contacts">РљРѕРЅС‚Р°РєС‚С‹</Link>
        </p>
      </div>
    </div>
  );
}
