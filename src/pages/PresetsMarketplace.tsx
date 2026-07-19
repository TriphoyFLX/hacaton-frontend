import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Download, Music2, PackageOpen, Plus, Search, ShoppingBag, Trash2, Upload, X } from 'lucide-react';
import { Preset, presetMediaUrl, presetsApi } from '../api/presets';

type Tab = 'catalog' | 'sell' | 'library';
type FormState = { title: string; description: string; price: string; tags: string; package?: File; preview?: File; cover?: File };

const emptyForm: FormState = { title: '', description: '', price: '0', tags: '' };
const formatPrice = (value: number) => value === 0 ? 'Бесплатно' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value / 100);

const css = `
.preset-market { min-height:100vh; background:#0b0b0b; color:#f0ede8; font-family:Syne,Arial,sans-serif; padding:42px 28px 90px; }
.preset-shell { max-width:1200px; margin:auto; }
.preset-head { display:flex; justify-content:space-between; gap:24px; align-items:flex-end; border-bottom:1px solid #252525; padding-bottom:24px; }
.preset-kicker { color:#8f8270; font:11px 'DM Mono',monospace; letter-spacing:.14em; text-transform:uppercase; }
.preset-head h1 { font-size:clamp(32px,5vw,56px); letter-spacing:-.06em; margin:6px 0 0; }
.preset-head p { color:#98938a; max-width:500px; margin:0; line-height:1.5; }
.preset-tabs { display:flex; gap:8px; margin:24px 0; flex-wrap:wrap; }
.preset-tabs button,.preset-filter button { cursor:pointer; background:#141414; color:#aaa59b; border:1px solid #2b2b2b; padding:10px 15px; border-radius:9px; font:600 13px Syne,Arial; }
.preset-tabs button.active,.preset-filter button:hover { background:#ece6dc; color:#101010; border-color:#ece6dc; }
.preset-toolbar { display:flex; gap:12px; margin:22px 0; flex-wrap:wrap; }
.preset-search { flex:1; min-width:210px; display:flex; gap:9px; align-items:center; background:#141414; border:1px solid #292929; border-radius:10px; padding:0 13px; }
.preset-search input { background:transparent;border:0;outline:0;color:#f0ede8;width:100%;padding:12px 0;font:14px Syne,Arial; }
.preset-filter { display:flex; gap:8px; }
.preset-filter button { padding:8px 12px; }
.preset-create { display:inline-flex; gap:8px; align-items:center; background:#ece6dc; color:#111; border:0; border-radius:10px; padding:12px 15px; cursor:pointer; font-weight:700; }
.preset-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
.preset-card { overflow:hidden; border:1px solid #282828; border-radius:15px; background:#121212; display:flex; flex-direction:column; min-height:320px; }
.preset-art { height:142px; background:linear-gradient(135deg,#29231d,#121212); position:relative; display:grid; place-items:center; overflow:hidden; }
.preset-art img { width:100%;height:100%;object-fit:cover; }
.preset-art svg { width:44px;height:44px;color:#c6b49e; }
.preset-status { position:absolute; top:10px; left:10px; background:#111c; backdrop-filter:blur(5px); border:1px solid #ffffff1c; border-radius:6px; padding:4px 7px; font:10px 'DM Mono',monospace; }
.preset-info { padding:16px; display:flex; flex:1; flex-direction:column; }
.preset-tags { display:flex; gap:5px; flex-wrap:wrap; min-height:22px; }
.preset-tags span { font:10px 'DM Mono',monospace; padding:3px 5px; border-radius:4px; color:#b2a895; background:#1d1b18; }
.preset-info h3 { font-size:17px; margin:10px 0 6px; letter-spacing:-.03em; }
.preset-author,.preset-desc { color:#908b82;font-size:12px;line-height:1.45;margin:0; }
.preset-desc { margin-top:8px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
.preset-card-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto; padding-top:16px; }
.preset-price { font-weight:700; font-size:14px; }.preset-price.free { color:#b5e8b9; }
.preset-buy { display:inline-flex;align-items:center;gap:6px;border:1px solid #353535;background:#202020;color:#eee;border-radius:8px;padding:8px 10px;cursor:pointer;font:600 12px Syne,Arial; }
.preset-buy:hover { border-color:#e8e1d7; }.preset-buy.owned { color:#b5e8b9; }.preset-buy:disabled { opacity:.5; cursor:wait; }
.preset-empty { border:1px dashed #303030;border-radius:14px;padding:58px 20px;text-align:center;color:#8d877d; grid-column:1/-1; }
.preset-modal { position:fixed; inset:0; background:#000a; display:grid; place-items:center; padding:20px; z-index:200; }
.preset-dialog { width:min(620px,100%); max-height:90vh; overflow:auto; background:#151515; border:1px solid #343434; border-radius:16px; padding:24px; }
.preset-dialog-top { display:flex;justify-content:space-between;align-items:center; margin-bottom:18px; }.preset-dialog h2{margin:0;letter-spacing:-.04em}.preset-close{background:transparent;border:0;color:#aaa;cursor:pointer}
.preset-form { display:grid;gap:13px; }.preset-form label { display:grid;gap:6px;color:#b0aaa0;font-size:12px;font-weight:600; }.preset-form input,.preset-form textarea { background:#0d0d0d;border:1px solid #333;border-radius:8px;padding:10px;color:#eee;font:14px Syne,Arial; }.preset-form textarea{min-height:100px;resize:vertical}
.preset-files { display:grid;grid-template-columns:repeat(3,1fr);gap:10px; }.preset-file { border:1px dashed #484848;border-radius:9px;padding:10px;cursor:pointer;color:#aaa;font-size:11px;min-height:72px }.preset-file input{display:none}.preset-file b{display:block;color:#ddd;margin-bottom:5px}
.preset-form-actions { display:flex;justify-content:flex-end;gap:9px;margin-top:5px }.preset-secondary {background:#202020;border:1px solid #353535;color:#ddd;border-radius:8px;padding:10px 13px;cursor:pointer}.preset-primary{background:#ece6dc;color:#111;border:0;border-radius:8px;padding:10px 13px;font-weight:700;cursor:pointer}
.preset-alert { margin:12px 0; background:#302016;color:#e9c895;border:1px solid #6c4c2b;padding:10px 12px;border-radius:8px;font-size:13px; }
@media(max-width:700px){.preset-market{padding:28px 16px 100px}.preset-head{align-items:flex-start;flex-direction:column}.preset-files{grid-template-columns:1fr}.preset-grid{grid-template-columns:1fr 1fr}.preset-card{min-height:300px}} @media(max-width:470px){.preset-grid{grid-template-columns:1fr}}
`;

export default function PresetsMarketplace() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [catalog, setCatalog] = useState<Preset[]>([]);
  const [mine, setMine] = useState<Preset[]>([]);
  const [library, setLibrary] = useState<Preset[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Preset | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [items, own, bought] = await Promise.all([presetsApi.list({ q: query || undefined, sort }), presetsApi.mine(), presetsApi.library()]);
      setCatalog(items); setMine(own); setLibrary(bought);
    } catch {
      setMessage('Не удалось загрузить маркетплейс. Проверьте подключение к API.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [sort]);

  const displayed = useMemo(() => tab === 'catalog' ? catalog.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())) : tab === 'sell' ? mine : library, [tab, catalog, mine, library, query]);

  const updateForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = event.target as HTMLInputElement;
    setForm((current) => ({ ...current, [name]: files?.[0] ?? value }));
  };
  const createPreset = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!editing && !form.package) {
      setFormError('Добавьте ZIP-набор с пресетом, чтобы опубликовать его.');
      return;
    }
    setSubmitting(true); setMessage('');
    try {
      const data = { title: form.title, description: form.description, priceCents: Math.round(Number(form.price || 0) * 100), tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) };
      const preset = editing ? await presetsApi.update(editing.id, data) : await presetsApi.create(data);
      if (form.package || form.preview || form.cover) await presetsApi.uploadAssets(preset.id, form);
      await presetsApi.update(preset.id, { status: 'PUBLISHED' });
      setForm(emptyForm); setEditing(null); setFormOpen(false); setTab('sell'); setMessage(editing ? 'Пресет обновлён.' : 'Пресет опубликован и доступен в каталоге.'); await load();
    } catch (error: any) {
      setFormError(error?.response?.data?.error || 'Не удалось создать пресет. Проверьте поля и файлы.');
    } finally { setSubmitting(false); }
  };
  const checkout = async (preset: Preset) => {
    setSubmitting(true); setMessage('');
    try { await presetsApi.checkout(preset.id); setMessage(`«${preset.title}» добавлен в вашу библиотеку.`); await load(); }
    catch (error: any) { setMessage(error?.response?.data?.error || 'Не удалось оформить пресет.'); }
    finally { setSubmitting(false); }
  };
  const remove = async (preset: Preset) => {
    if (!window.confirm(`Удалить «${preset.title}»?`)) return;
    await presetsApi.remove(preset.id); await load();
  };
  const openEdit = (preset: Preset) => {
    setEditing(preset);
    setFormError('');
    setForm({ title: preset.title, description: preset.description, price: String(preset.priceCents / 100), tags: preset.tags.join(', ') });
    setFormOpen(true);
  };

  const card = (preset: Preset) => (
    <article className="preset-card" key={preset.id}>
      <div className="preset-art">
        {preset.coverUrl ? <img src={presetMediaUrl(preset.coverUrl)} alt="" /> : <Music2 />}
        {tab === 'sell' && <span className="preset-status">{preset.status === 'PUBLISHED' ? 'ОПУБЛИКОВАН' : 'ЧЕРНОВИК'}</span>}
      </div>
      <div className="preset-info">
        <div className="preset-tags">{preset.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <h3>{preset.title}</h3>
        <p className="preset-author">от @{preset.seller?.username || 'вас'}</p>
        <p className="preset-desc">{preset.description}</p>
        <div className="preset-card-foot">
          <span className={`preset-price ${preset.priceCents === 0 ? 'free' : ''}`}>{formatPrice(preset.priceCents)}</span>
          {tab === 'sell' ? <><button className="preset-buy" onClick={() => openEdit(preset)}>Изменить</button><button className="preset-buy" onClick={() => void remove(preset)}><Trash2 size={14}/></button></>
            : tab === 'library' || preset.purchased || preset.isSeller ? <button className="preset-buy owned" onClick={() => void presetsApi.download(preset.id)}><Download size={14}/>Скачать</button>
              : <button className="preset-buy" disabled={submitting} onClick={() => void checkout(preset)}><ShoppingBag size={14}/>{preset.priceCents ? 'Купить' : 'Получить'}</button>}
        </div>
      </div>
    </article>
  );

  return <main className="preset-market">
    <style>{css}</style><div className="preset-shell">
      <header className="preset-head"><div><div className="preset-kicker">SoundLab market</div><h1>Пресеты, которые звучат</h1></div><p>Публикуйте собственные наборы, открывайте новые звуки и собирайте библиотеку для следующих треков.</p></header>
      <nav className="preset-tabs">
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>Каталог</button>
        <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>Мои продажи</button>
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>Моя библиотека</button>
      </nav>
      {message && <div className="preset-alert">{message}</div>}
      <div className="preset-toolbar">
        {tab === 'catalog' && <><div className="preset-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Искать пресеты и звуки..." /></div><div className="preset-filter"><button onClick={() => setSort(sort === 'newest' ? 'price_asc' : 'newest')}>{sort === 'newest' ? 'Сначала новые' : 'По цене'}</button></div></>}
        {tab === 'sell' && <button className="preset-create" onClick={() => { setEditing(null); setForm(emptyForm); setFormError(''); setFormOpen(true); }}><Plus size={17}/>Создать пресет</button>}
      </div>
      <section className="preset-grid">{loading ? <div className="preset-empty">Загружаем пресеты…</div> : displayed.length ? displayed.map(card) : <div className="preset-empty"><PackageOpen size={34}/><p>{tab === 'sell' ? 'У вас ещё нет пресетов. Создайте первый набор.' : tab === 'library' ? 'Ваша библиотека пока пуста.' : 'По этому запросу ничего не найдено.'}</p></div>}</section>
    </div>
    {formOpen && <div className="preset-modal" role="dialog" aria-modal="true"><form className="preset-dialog preset-form" onSubmit={createPreset}>
      <div className="preset-dialog-top"><h2>{editing ? 'Редактировать пресет' : 'Новый пресет'}</h2><button className="preset-close" type="button" onClick={() => { setEditing(null); setFormError(''); setFormOpen(false); }}><X/></button></div>
      <label>Название<input required name="title" value={form.title} onChange={updateForm} placeholder="Например, Dark Trap Vocals"/></label>
      <label>Описание<textarea required name="description" value={form.description} onChange={updateForm} minLength={10} placeholder="Расскажите, для какого звука и жанра создан набор."/></label>
      <label>Цена, ₽<input required type="number" min="0" max="100000" name="price" value={form.price} onChange={updateForm}/></label>
      <label>Теги через запятую<input name="tags" value={form.tags} onChange={updateForm} placeholder="trap, vocal, dark"/></label>
      {formError && <div className="preset-alert" role="alert">{formError}</div>}
      <div className="preset-files">
        <label className="preset-file"><b><Upload size={14}/> ZIP-набор</b>{form.package?.name || (editing ? 'оставьте пустым, чтобы не заменять' : 'обязателен для публикации')}<input type="file" name="package" accept=".zip,application/zip" onChange={updateForm}/></label>
        <label className="preset-file"><b><Music2 size={14}/> Превью</b>{form.preview?.name || 'MP3, WAV (необязательно)'}<input type="file" name="preview" accept="audio/*" onChange={updateForm}/></label>
        <label className="preset-file"><b><PackageOpen size={14}/> Обложка</b>{form.cover?.name || 'JPG, PNG (необязательно)'}<input type="file" name="cover" accept="image/jpeg,image/png,image/webp" onChange={updateForm}/></label>
      </div>
      <div className="preset-form-actions"><button className="preset-secondary" type="button" onClick={() => setFormOpen(false)}>Отмена</button><button className="preset-primary" disabled={submitting} type="submit"><Check size={15}/>{submitting ? 'Публикуем…' : 'Опубликовать'}</button></div>
    </form></div>}
  </main>;
}
