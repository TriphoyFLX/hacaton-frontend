/**
 * Реквизиты продавца для оферты / политики / возвратов.
 * Тексты на сайте подставляются из этих полей.
 */
export const LEGAL = {
  brandName: 'SoundLab',
  siteUrl: 'https://soundlab-studio.ru',
  supportEmail: 'placement@soundlab-studio.ru',
  contactEmail: 'placement@soundlab-studio.ru',
  contactPhone: '+7 (908) 313-62-69',
  contactTelegram: '',

  /** ИП / ООО / самозанятый */
  sellerType: 'самозанятый (налогоплательщик НПД)',
  sellerFullName: 'Матвеев Дмитрий Дмитриевич',
  companyName: 'Матвеев Дмитрий Дмитриевич (самозанятый)',
  inn: '550367838850',
  /** У самозанятого ОГРН/ОГРНИП нет */
  ogrnOrOgrnip: 'не применяется (режим НПД)',
  legalAddress: 'г. Омск, Российская Федерация',
  actualAddress: '',

  /** Банк — не указан */
  bankName: '',
  bik: '',
  checkingAccount: '',
  correspondentAccount: '',

  /** Документы */
  docsUpdatedAt: '21.07.2026',
  offerEffectiveAt: '21.07.2026',

  /** Платежи */
  paymentProvider: 'ООО «ЮKassa» (НКО «ЮМани»)',
  currency: 'российский рубль (RUB)',
} as const;

export type LegalDocId = 'offer' | 'privacy' | 'contacts' | 'refunds' | 'delivery';

export const LEGAL_NAV: { id: LegalDocId; path: string; title: string }[] = [
  { id: 'offer', path: '/offer', title: 'Оферта' },
  { id: 'privacy', path: '/privacy', title: 'Политика конфиденциальности' },
  { id: 'contacts', path: '/contacts', title: 'Контакты' },
  { id: 'refunds', path: '/refunds', title: 'Возвраты' },
  { id: 'delivery', path: '/delivery', title: 'Получение услуги' },
];
