import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import SeoHead from '../components/SeoHead';

type LandingVariant = 'home' | 'studio' | 'record';

const VARIANT: Record<
  LandingVariant,
  { path: string; title: string; description: string; h1: string; lead: string }
> = {
  home: {
    path: '/',
    title: 'SoundLab — онлайн студия звукозаписи | Записать трек онлайн',
    description:
      'SoundLab — онлайн студия звукозаписи в браузере. MIDI, вокал, биты и эффекты. Посмотрите описание проекта и создайте аккаунт, чтобы открыть студию.',
    h1: 'Студия в браузере',
    lead: 'Пишите биты, записывайте вокал и делитесь демо — без установки программ. Сама студия открывается только после входа.',
  },
  studio: {
    path: '/online-studiya-zvukozapisi',
    title: 'Онлайн студия звукозаписи — SoundLab Studio',
    description:
      'Онлайн студия звукозаписи SoundLab: MIDI, вокал и обработка в браузере. Зарегистрируйтесь, чтобы войти в студию.',
    h1: 'Онлайн студия звукозаписи',
    lead: 'SoundLab — веб-студия без DAW на диске. Описание ниже; полный доступ — после регистрации.',
  },
  record: {
    path: '/zapisat-trek-online',
    title: 'Записать трек онлайн — SoundLab',
    description:
      'Записать трек онлайн в SoundLab: вокал под бит, MIDI и эффекты. Создайте аккаунт, чтобы начать запись.',
    h1: 'Записать трек онлайн',
    lead: 'Соберите аранжировку, запишите вокал и сохраните проект в облаке. Нужен только аккаунт SoundLab.',
  },
};

const MODULES = [
  {
    name: 'MIDI Studio',
    text: 'Паттерны, плейлист, сэмплы и запись вокала с пресетами — рабочая сессия в браузере.',
  },
  {
    name: 'SoundTok',
    text: 'Короткие видео и черновики треков: лента, лайки и комментарии внутри сообщества.',
  },
  {
    name: 'Rap Battle',
    text: 'Раунды под бит, голос с FX и взаимная оценка — баттл один на один онлайн.',
  },
  {
    name: 'AI и проекты',
    text: 'Облачные проекты и AI-помощники, чтобы быстрее довести идею до демо.',
  },
];

const STEPS = [
  { n: '01', t: 'Создайте аккаунт', d: 'Регистрация занимает минуту — email и пароль.' },
  { n: '02', t: 'Войдите в студию', d: 'После входа откроются MIDI, SoundTok, баттлы и проекты.' },
  { n: '03', t: 'Пишите и публикуйте', d: 'Запись, эффекты и шаринг — всё в одной платформе.' },
];

const FAQ = [
  {
    q: 'Можно ли смотреть студию без регистрации?',
    a: 'Нет. Без аккаунта доступна только эта страница с описанием проекта. MIDI, лента, чаты и остальные разделы открываются после входа.',
  },
  {
    q: 'Что такое SoundLab?',
    a: 'Онлайн студия звукозаписи и творческая платформа: MIDI-секвенсор, запись вокала, эффекты, SoundTok и рэп-баттлы.',
  },
  {
    q: 'Как начать?',
    a: 'Нажмите «Зарегистрироваться», подтвердите email и войдите. Студия сразу появится в меню.',
  },
  {
    q: 'Это бесплатно?',
    a: 'Старт бесплатный: аккаунт и базовая студия. Лимиты проектов и сэмплов зависят от тарифа. Актуальные цены — на странице «Тарифы».',
  },
  {
    q: 'Что входит в Pro и Platinum?',
    a: 'Pro даёт больше облачных проектов, токены для AI-генераций и вокальные пресеты. Platinum — расширенные лимиты, больше токенов и сохранений в облако. Подробности на /pricing.',
  },
  {
    q: 'Как работают AI-генерации?',
    a: 'Генерации списывают токены с баланса. Токены приходят с подпиской или покупаются отдельными пакетами. Оплата проходит через ЮKassa.',
  },
  {
    q: 'Что такое SoundTok?',
    a: 'Короткие вертикальные клипы внутри SoundLab: можно загрузить видео, поставить лайк, комментировать и делиться с другими пользователями.',
  },
  {
    q: 'Есть ли рэп-баттлы?',
    a: 'Да. В разделе Rap Battle можно вызвать соперника или встать в очередь по рейтингу, записать раунды и получить оценку.',
  },
  {
    q: 'Можно ли сохранять проекты в облако?',
    a: 'Да. MIDI-проекты сохраняются в облако аккаунта. На Free лимит скромнее, на платных тарифах — больше проектов и сохранений в день.',
  },
  {
    q: 'Как купить пресет?',
    a: 'В маркетплейсе пресетов откройте карточку и оформите покупку. После оплаты пресет появится в вашей библиотеке и его можно скачать.',
  },
  {
    q: 'Как связаться с поддержкой?',
    a: 'Напишите на placement@soundlab-studio.ru или откройте раздел «Контакты». Если видите нарушение — пожалуйтесь на пользователя из его профиля.',
  },
];

export default function Landing({ variant = 'home' }: { variant?: LandingVariant }) {
  const token = useAuthStore((s) => s.token);
  const meta = VARIANT[variant];
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div className="sl-boot">
        <span>SoundLab</span>
      </div>
    );
  }

  if (token && variant === 'home') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="sl-land">
      <SeoHead
        title={meta.title}
        description={meta.description}
        path={meta.path}
        keywords="SoundLab, онлайн студия звукозаписи, записать трек онлайн, студия онлайн, запись вокала, MIDI онлайн"
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .sl-boot {
          min-height: 100vh; background: #0c0b0a; color: #8a8580;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Instrument Sans', sans-serif; font-weight: 600; letter-spacing: -0.02em;
        }

        .sl-land {
          --bg: #0c0b0a;
          --ink: #f3efe8;
          --muted: #9a948c;
          --dim: #6b6560;
          --line: rgba(243, 239, 232, 0.12);
          --accent: #e8a87c;
          --panel: #161412;
          min-height: 100vh;
          background:
            radial-gradient(120% 80% at 50% -10%, rgba(232, 168, 124, 0.14), transparent 55%),
            linear-gradient(180deg, #12100e 0%, var(--bg) 42%, #0a0908 100%);
          color: var(--ink);
          font-family: 'Instrument Sans', ui-sans-serif, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .sl-land * { box-sizing: border-box; }
        .sl-wrap { max-width: 1100px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 40px); }

        .sl-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0;
        }
        .sl-logo {
          font-weight: 700; font-size: clamp(22px, 3vw, 28px);
          letter-spacing: -0.04em; color: var(--ink); text-decoration: none;
        }
        .sl-nav-actions { display: flex; gap: 8px; align-items: center; }
        .sl-btn {
          height: 42px; padding: 0 18px; border-radius: 999px;
          border: 1px solid var(--line); background: transparent; color: var(--ink);
          font: inherit; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
          text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s, border-color .15s;
        }
        .sl-btn:hover { border-color: rgba(243,239,232,0.28); background: rgba(255,255,255,0.03); }
        .sl-btn-primary {
          background: var(--ink); color: #12100e; border-color: var(--ink);
        }
        .sl-btn-primary:hover { background: #fff; border-color: #fff; color: #0c0b0a; }

        .sl-hero {
          padding: clamp(36px, 8vh, 72px) 0 clamp(40px, 7vh, 64px);
          display: grid; gap: 28px;
        }
        @media (min-width: 900px) {
          .sl-hero { grid-template-columns: 1.05fr 0.95fr; align-items: end; gap: 40px; }
        }
        .sl-hero-copy { max-width: 34rem; }
        .sl-kicker {
          margin: 0 0 14px; font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent);
        }
        .sl-hero h1 {
          margin: 0; font-size: clamp(40px, 7vw, 72px); font-weight: 700;
          letter-spacing: -0.05em; line-height: 0.98;
        }
        .sl-brand-line {
          display: block; font-size: clamp(28px, 4.5vw, 44px);
          color: var(--muted); font-weight: 600; letter-spacing: -0.04em; margin-top: 6px;
        }
        .sl-hero-lead {
          margin: 18px 0 0; font-size: 17px; line-height: 1.55; color: var(--muted); max-width: 38ch;
        }
        .sl-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
        .sl-note {
          margin: 14px 0 0; font-size: 13px; color: var(--dim); max-width: 40ch; line-height: 1.45;
        }

        .sl-preview {
          border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
          background: var(--panel);
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
          min-height: 280px;
          position: relative;
        }
        .sl-preview-bar {
          display: flex; align-items: center; gap: 8px; padding: 12px 14px;
          border-bottom: 1px solid var(--line); background: rgba(0,0,0,0.25);
        }
        .sl-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(243,239,232,0.2); }
        .sl-preview-title {
          margin-left: 6px; font-family: 'IBM Plex Mono', monospace;
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim);
        }
        .sl-preview-body { padding: 18px; display: grid; gap: 10px; }
        .sl-lane {
          height: 38px; border-radius: 8px; border: 1px solid var(--line);
          background: linear-gradient(90deg, rgba(232,168,124,0.12), transparent 55%), #1c1916;
          position: relative; overflow: hidden;
        }
        .sl-lane::after {
          content: ''; position: absolute; inset: 8px auto 8px 12px; width: 42%;
          border-radius: 4px; background: rgba(232,168,124,0.35);
        }
        .sl-lane:nth-child(2)::after { width: 58%; left: 18%; background: rgba(243,239,232,0.18); }
        .sl-lane:nth-child(3)::after { width: 35%; left: 30%; background: rgba(232,168,124,0.22); }
        .sl-lane:nth-child(4)::after { width: 48%; left: 10%; background: rgba(243,239,232,0.12); }
        .sl-preview-lock {
          position: absolute; inset: auto 16px 16px 16px;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(12,11,10,0.82); border: 1px solid var(--line);
          font-size: 13px; color: var(--muted); line-height: 1.4;
          backdrop-filter: blur(8px);
        }
        .sl-preview-lock strong { color: var(--ink); font-weight: 600; }

        .sl-section { padding: 48px 0; border-top: 1px solid var(--line); }
        .sl-section h2 {
          margin: 0 0 10px; font-size: clamp(26px, 3.5vw, 36px);
          letter-spacing: -0.035em; font-weight: 700;
        }
        .sl-section-lead {
          margin: 0 0 28px; color: var(--muted); font-size: 16px; line-height: 1.55; max-width: 52ch;
        }

        .sl-modules {
          display: grid; gap: 0; border-top: 1px solid var(--line);
        }
        .sl-mod {
          display: grid; gap: 6px; padding: 22px 0;
          border-bottom: 1px solid var(--line);
        }
        @media (min-width: 720px) {
          .sl-mod { grid-template-columns: 200px 1fr; gap: 24px; align-items: baseline; }
        }
        .sl-mod h3 {
          margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -0.02em;
        }
        .sl-mod p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.5; }

        .sl-steps {
          display: grid; gap: 18px;
        }
        @media (min-width: 800px) {
          .sl-steps { grid-template-columns: repeat(3, 1fr); gap: 28px; }
        }
        .sl-step-n {
          font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          letter-spacing: 0.14em; color: var(--accent); margin-bottom: 10px;
        }
        .sl-step h3 { margin: 0 0 8px; font-size: 18px; letter-spacing: -0.02em; }
        .sl-step p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }

        .sl-faq details {
          border-bottom: 1px solid var(--line); padding: 16px 0;
        }
        .sl-faq summary {
          cursor: pointer; font-weight: 600; letter-spacing: -0.015em; list-style: none;
        }
        .sl-faq summary::-webkit-details-marker { display: none; }
        .sl-faq p { margin: 10px 0 0; color: var(--muted); font-size: 14px; line-height: 1.55; }

        .sl-bottom-cta {
          margin-top: 8px; padding: 28px 0 8px;
          display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;
        }
        .sl-bottom-cta p { margin: 0; color: var(--muted); max-width: 36ch; line-height: 1.45; }

        .sl-foot {
          border-top: 1px solid var(--line); padding: 28px 0 48px;
          display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between;
          color: var(--dim); font-size: 13px;
        }
        .sl-foot a { color: var(--muted); text-decoration: none; }
        .sl-foot a:hover { color: var(--ink); }
      `}</style>

      <div className="sl-wrap">
        <nav className="sl-nav" aria-label="Главная навигация">
          <Link to="/" className="sl-logo">SoundLab</Link>
          <div className="sl-nav-actions">
            <Link to="/login" className="sl-btn">Войти</Link>
            <Link to="/register" className="sl-btn sl-btn-primary">Зарегистрироваться</Link>
          </div>
        </nav>

        <header className="sl-hero">
          <div className="sl-hero-copy">
            <p className="sl-kicker">Онлайн студия звукозаписи</p>
            <h1>
              SoundLab
              <span className="sl-brand-line">{meta.h1}</span>
            </h1>
            <p className="sl-hero-lead">{meta.lead}</p>
            <div className="sl-cta">
              <Link to="/register" className="sl-btn sl-btn-primary">Зарегистрироваться</Link>
              <Link to="/login" className="sl-btn">Войти</Link>
            </div>
            <p className="sl-note">
              Это превью проекта. Студия, лента и остальные разделы доступны только авторизованным пользователям.
            </p>
          </div>

          <div className="sl-preview" aria-hidden="true">
            <div className="sl-preview-bar">
              <span className="sl-dot" />
              <span className="sl-dot" />
              <span className="sl-dot" />
              <span className="sl-preview-title">Studio preview</span>
            </div>
            <div className="sl-preview-body">
              <div className="sl-lane" />
              <div className="sl-lane" />
              <div className="sl-lane" />
              <div className="sl-lane" />
            </div>
            <div className="sl-preview-lock">
              <strong>Студия закрыта без входа.</strong> Зарегистрируйтесь или войдите, чтобы открыть MIDI, запись и проекты.
            </div>
          </div>
        </header>

        <section className="sl-section" aria-labelledby="about-heading">
          <h2 id="about-heading">О проекте</h2>
          <p className="sl-section-lead">
            SoundLab — платформа для музыкантов и рэперов: идея, запись и публикация в одном месте.
            Здесь можно собрать бит, наложить вокал с эффектами, выложить SoundTok или провести рэп-баттл.
          </p>
          <div className="sl-modules">
            {MODULES.map((m) => (
              <article key={m.name} className="sl-mod">
                <h3>{m.name}</h3>
                <p>{m.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sl-section" aria-labelledby="how-heading">
          <h2 id="how-heading">Как попасть внутрь</h2>
          <p className="sl-section-lead">
            Гостям видна только витрина. Чтобы работать в сервисе — нужен аккаунт.
          </p>
          <div className="sl-steps">
            {STEPS.map((s) => (
              <article key={s.n} className="sl-step">
                <div className="sl-step-n">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
          <div className="sl-bottom-cta">
            <p>Готовы начать? Создайте аккаунт или войдите — формы откроются сразу.</p>
            <div className="sl-cta" style={{ marginTop: 0 }}>
              <Link to="/register" className="sl-btn sl-btn-primary">Зарегистрироваться</Link>
              <Link to="/login" className="sl-btn">Войти</Link>
            </div>
          </div>
        </section>

        <section className="sl-section sl-faq" aria-label="Частые вопросы">
          <h2>Частые вопросы</h2>
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </section>

        <footer className="sl-foot">
          <div>© {new Date().getFullYear()} SoundLab · soundlab-studio.ru</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/">SoundLab</Link>
            <Link to="/offer">Оферта</Link>
            <Link to="/privacy">Конфиденциальность</Link>
            <Link to="/contacts">Контакты</Link>
            <Link to="/refunds">Возвраты</Link>
            <Link to="/delivery">Получение услуги</Link>
            <Link to="/login">Войти</Link>
            <Link to="/register">Регистрация</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
