import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import SeoHead from '../components/SeoHead';
import PwaInstallButton from '../components/PwaInstallButton';
import { usePwaInstall } from '../hooks/usePwaInstall';

type LandingVariant = 'home' | 'studio' | 'record';

const VARIANT: Record<
  LandingVariant,
  { path: string; title: string; description: string; h1: string; lead: string }
> = {
  home: {
    path: '/',
    title: 'SoundLab вЂ” РѕРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё | Р—Р°РїРёСЃР°С‚СЊ С‚СЂРµРє РѕРЅР»Р°Р№РЅ',
    description:
      'SoundLab вЂ” РѕРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё РІ Р±СЂР°СѓР·РµСЂРµ. MIDI, РІРѕРєР°Р», Р±РёС‚С‹ Рё СЌС„С„РµРєС‚С‹. РџРѕСЃРјРѕС‚СЂРёС‚Рµ РѕРїРёСЃР°РЅРёРµ РїСЂРѕРµРєС‚Р° Рё СЃРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ СЃС‚СѓРґРёСЋ.',
    h1: 'РЎС‚СѓРґРёСЏ РІ Р±СЂР°СѓР·РµСЂРµ',
    lead: 'РџРёС€РёС‚Рµ Р±РёС‚С‹, Р·Р°РїРёСЃС‹РІР°Р№С‚Рµ РІРѕРєР°Р» Рё РґРµР»РёС‚РµСЃСЊ РґРµРјРѕ вЂ” Р±РµР· СѓСЃС‚Р°РЅРѕРІРєРё РїСЂРѕРіСЂР°РјРј. РЎР°РјР° СЃС‚СѓРґРёСЏ РѕС‚РєСЂС‹РІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ РІС…РѕРґР°.',
  },
  studio: {
    path: '/online-studiya-zvukozapisi',
    title: 'РћРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё вЂ” SoundLab Studio',
    description:
      'РћРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё SoundLab: MIDI, РІРѕРєР°Р» Рё РѕР±СЂР°Р±РѕС‚РєР° РІ Р±СЂР°СѓР·РµСЂРµ. Р—Р°СЂРµРіРёСЃС‚СЂРёСЂСѓР№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РІРѕР№С‚Рё РІ СЃС‚СѓРґРёСЋ.',
    h1: 'РћРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё',
    lead: 'SoundLab вЂ” РІРµР±-СЃС‚СѓРґРёСЏ Р±РµР· DAW РЅР° РґРёСЃРєРµ. РћРїРёСЃР°РЅРёРµ РЅРёР¶Рµ; РїРѕР»РЅС‹Р№ РґРѕСЃС‚СѓРї вЂ” РїРѕСЃР»Рµ СЂРµРіРёСЃС‚СЂР°С†РёРё.',
  },
  record: {
    path: '/zapisat-trek-online',
    title: 'Р—Р°РїРёСЃР°С‚СЊ С‚СЂРµРє РѕРЅР»Р°Р№РЅ вЂ” SoundLab',
    description:
      'Р—Р°РїРёСЃР°С‚СЊ С‚СЂРµРє РѕРЅР»Р°Р№РЅ РІ SoundLab: РІРѕРєР°Р» РїРѕРґ Р±РёС‚, MIDI Рё СЌС„С„РµРєС‚С‹. РЎРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚, С‡С‚РѕР±С‹ РЅР°С‡Р°С‚СЊ Р·Р°РїРёСЃСЊ.',
    h1: 'Р—Р°РїРёСЃР°С‚СЊ С‚СЂРµРє РѕРЅР»Р°Р№РЅ',
    lead: 'РЎРѕР±РµСЂРёС‚Рµ Р°СЂР°РЅР¶РёСЂРѕРІРєСѓ, Р·Р°РїРёС€РёС‚Рµ РІРѕРєР°Р» Рё СЃРѕС…СЂР°РЅРёС‚Рµ РїСЂРѕРµРєС‚ РІ РѕР±Р»Р°РєРµ. РќСѓР¶РµРЅ С‚РѕР»СЊРєРѕ Р°РєРєР°СѓРЅС‚ SoundLab.',
  },
};

const MODULES = [
  {
    name: 'MIDI Studio',
    text: 'РџР°С‚С‚РµСЂРЅС‹, РїР»РµР№Р»РёСЃС‚, СЃСЌРјРїР»С‹ Рё Р·Р°РїРёСЃСЊ РІРѕРєР°Р»Р° СЃ РїСЂРµСЃРµС‚Р°РјРё вЂ” СЂР°Р±РѕС‡Р°СЏ СЃРµСЃСЃРёСЏ РІ Р±СЂР°СѓР·РµСЂРµ.',
  },
  {
    name: 'SoundTok',
    text: 'РљРѕСЂРѕС‚РєРёРµ РІРёРґРµРѕ Рё С‡РµСЂРЅРѕРІРёРєРё С‚СЂРµРєРѕРІ: Р»РµРЅС‚Р°, Р»Р°Р№РєРё Рё РєРѕРјРјРµРЅС‚Р°СЂРёРё РІРЅСѓС‚СЂРё СЃРѕРѕР±С‰РµСЃС‚РІР°.',
  },
  {
    name: 'Rap Battle',
    text: 'Р Р°СѓРЅРґС‹ РїРѕРґ Р±РёС‚, РіРѕР»РѕСЃ СЃ FX Рё РІР·Р°РёРјРЅР°СЏ РѕС†РµРЅРєР° вЂ” Р±Р°С‚С‚Р» РѕРґРёРЅ РЅР° РѕРґРёРЅ РѕРЅР»Р°Р№РЅ.',
  },
  {
    name: 'AI Рё РїСЂРѕРµРєС‚С‹',
    text: 'РћР±Р»Р°С‡РЅС‹Рµ РїСЂРѕРµРєС‚С‹ Рё AI-РїРѕРјРѕС‰РЅРёРєРё, С‡С‚РѕР±С‹ Р±С‹СЃС‚СЂРµРµ РґРѕРІРµСЃС‚Рё РёРґРµСЋ РґРѕ РґРµРјРѕ.',
  },
  {
    name: 'РџСЂРёР»РѕР¶РµРЅРёРµ (PWA)',
    text: 'РЈСЃС‚Р°РЅРѕРІРёС‚Рµ SoundLab РЅР° РєРѕРјРїСЊСЋС‚РµСЂ РёР»Рё С‚РµР»РµС„РѕРЅ СЃ СЃР°Р№С‚Р°. РЇСЂР»С‹Рє РЅР° СЂР°Р±РѕС‡РµРј СЃС‚РѕР»Рµ / В«РџСѓСЃРєВ» Рё РѕС‚РґРµР»СЊРЅРѕРµ РѕРєРЅРѕ вЂ” Р±РµР· РјР°РіР°Р·РёРЅРѕРІ РїСЂРёР»РѕР¶РµРЅРёР№.',
  },
];

const STEPS = [
  { n: '01', t: 'РЎРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚', d: 'Р РµРіРёСЃС‚СЂР°С†РёСЏ Р·Р°РЅРёРјР°РµС‚ РјРёРЅСѓС‚Сѓ вЂ” email Рё РїР°СЂРѕР»СЊ.' },
  { n: '02', t: 'Р’РѕР№РґРёС‚Рµ РІ СЃС‚СѓРґРёСЋ', d: 'РџРѕСЃР»Рµ РІС…РѕРґР° РѕС‚РєСЂРѕСЋС‚СЃСЏ MIDI, SoundTok, Р±Р°С‚С‚Р»С‹ Рё РїСЂРѕРµРєС‚С‹.' },
  { n: '03', t: 'РџРёС€РёС‚Рµ Рё РїСѓР±Р»РёРєСѓР№С‚Рµ', d: 'Р—Р°РїРёСЃСЊ, СЌС„С„РµРєС‚С‹ Рё С€Р°СЂРёРЅРі вЂ” РІСЃС‘ РІ РѕРґРЅРѕР№ РїР»Р°С‚С„РѕСЂРјРµ.' },
];

const FAQ = [
  {
    q: 'РњРѕР¶РЅРѕ Р»Рё СЃРјРѕС‚СЂРµС‚СЊ СЃС‚СѓРґРёСЋ Р±РµР· СЂРµРіРёСЃС‚СЂР°С†РёРё?',
    a: 'РќРµС‚. Р‘РµР· Р°РєРєР°СѓРЅС‚Р° РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ СЌС‚Р° СЃС‚СЂР°РЅРёС†Р° СЃ РѕРїРёСЃР°РЅРёРµРј РїСЂРѕРµРєС‚Р°. MIDI, Р»РµРЅС‚Р°, С‡Р°С‚С‹ Рё РѕСЃС‚Р°Р»СЊРЅС‹Рµ СЂР°Р·РґРµР»С‹ РѕС‚РєСЂС‹РІР°СЋС‚СЃСЏ РїРѕСЃР»Рµ РІС…РѕРґР°.',
  },
  {
    q: 'Р§С‚Рѕ С‚Р°РєРѕРµ SoundLab?',
    a: 'РћРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё Рё С‚РІРѕСЂС‡РµСЃРєР°СЏ РїР»Р°С‚С„РѕСЂРјР°: MIDI-СЃРµРєРІРµРЅСЃРѕСЂ, Р·Р°РїРёСЃСЊ РІРѕРєР°Р»Р°, СЌС„С„РµРєС‚С‹, SoundTok Рё СЂСЌРї-Р±Р°С‚С‚Р»С‹.',
  },
  {
    q: 'РљР°Рє РЅР°С‡Р°С‚СЊ?',
    a: 'РќР°Р¶РјРёС‚Рµ В«Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏВ», РїРѕРґС‚РІРµСЂРґРёС‚Рµ email Рё РІРѕР№РґРёС‚Рµ. РЎС‚СѓРґРёСЏ СЃСЂР°Р·Сѓ РїРѕСЏРІРёС‚СЃСЏ РІ РјРµРЅСЋ.',
  },
  {
    q: 'Р­С‚Рѕ Р±РµСЃРїР»Р°С‚РЅРѕ?',
    a: 'РЎС‚Р°СЂС‚ Р±РµСЃРїР»Р°С‚РЅС‹Р№: Р°РєРєР°СѓРЅС‚ Рё Р±Р°Р·РѕРІР°СЏ СЃС‚СѓРґРёСЏ. Р›РёРјРёС‚С‹ РїСЂРѕРµРєС‚РѕРІ Рё СЃСЌРјРїР»РѕРІ Р·Р°РІРёСЃСЏС‚ РѕС‚ С‚Р°СЂРёС„Р°. РђРєС‚СѓР°Р»СЊРЅС‹Рµ С†РµРЅС‹ вЂ” РЅР° СЃС‚СЂР°РЅРёС†Рµ В«РўР°СЂРёС„С‹В».',
  },
  {
    q: 'Р§С‚Рѕ РІС…РѕРґРёС‚ РІ Pro Рё Platinum?',
    a: 'Pro РґР°С‘С‚ Р±РѕР»СЊС€Рµ РѕР±Р»Р°С‡РЅС‹С… РїСЂРѕРµРєС‚РѕРІ, С‚РѕРєРµРЅС‹ РґР»СЏ AI-РіРµРЅРµСЂР°С†РёР№ Рё РІРѕРєР°Р»СЊРЅС‹Рµ РїСЂРµСЃРµС‚С‹. Platinum вЂ” СЂР°СЃС€РёСЂРµРЅРЅС‹Рµ Р»РёРјРёС‚С‹, Р±РѕР»СЊС€Рµ С‚РѕРєРµРЅРѕРІ Рё СЃРѕС…СЂР°РЅРµРЅРёР№ РІ РѕР±Р»Р°РєРѕ. РџРѕРґСЂРѕР±РЅРѕСЃС‚Рё РЅР° /pricing.',
  },
  {
    q: 'РљР°Рє СЂР°Р±РѕС‚Р°СЋС‚ AI-РіРµРЅРµСЂР°С†РёРё?',
    a: 'Р“РµРЅРµСЂР°С†РёРё СЃРїРёСЃС‹РІР°СЋС‚ С‚РѕРєРµРЅС‹ СЃ Р±Р°Р»Р°РЅСЃР°. РўРѕРєРµРЅС‹ РїСЂРёС…РѕРґСЏС‚ СЃ РїРѕРґРїРёСЃРєРѕР№ РёР»Рё РїРѕРєСѓРїР°СЋС‚СЃСЏ РѕС‚РґРµР»СЊРЅС‹РјРё РїР°РєРµС‚Р°РјРё. РћРїР»Р°С‚Р° РїСЂРѕС…РѕРґРёС‚ С‡РµСЂРµР· Р®Kassa.',
  },
  {
    q: 'Р§С‚Рѕ С‚Р°РєРѕРµ SoundTok?',
    a: 'РљРѕСЂРѕС‚РєРёРµ РІРµСЂС‚РёРєР°Р»СЊРЅС‹Рµ РєР»РёРїС‹ РІРЅСѓС‚СЂРё SoundLab: РјРѕР¶РЅРѕ Р·Р°РіСЂСѓР·РёС‚СЊ РІРёРґРµРѕ, РїРѕСЃС‚Р°РІРёС‚СЊ Р»Р°Р№Рє, РєРѕРјРјРµРЅС‚РёСЂРѕРІР°С‚СЊ Рё РґРµР»РёС‚СЊСЃСЏ СЃ РґСЂСѓРіРёРјРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё.',
  },
  {
    q: 'Р•СЃС‚СЊ Р»Рё СЂСЌРї-Р±Р°С‚С‚Р»С‹?',
    a: 'Р”Р°. Р’ СЂР°Р·РґРµР»Рµ Rap Battle РјРѕР¶РЅРѕ РІС‹Р·РІР°С‚СЊ СЃРѕРїРµСЂРЅРёРєР° РёР»Рё РІСЃС‚Р°С‚СЊ РІ РѕС‡РµСЂРµРґСЊ РїРѕ СЂРµР№С‚РёРЅРіСѓ, Р·Р°РїРёСЃР°С‚СЊ СЂР°СѓРЅРґС‹ Рё РїРѕР»СѓС‡РёС‚СЊ РѕС†РµРЅРєСѓ.',
  },
  {
    q: 'РњРѕР¶РЅРѕ Р»Рё СЃРѕС…СЂР°РЅСЏС‚СЊ РїСЂРѕРµРєС‚С‹ РІ РѕР±Р»Р°РєРѕ?',
    a: 'Р”Р°. MIDI-РїСЂРѕРµРєС‚С‹ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РІ РѕР±Р»Р°РєРѕ Р°РєРєР°СѓРЅС‚Р°. РќР° Free Р»РёРјРёС‚ СЃРєСЂРѕРјРЅРµРµ, РЅР° РїР»Р°С‚РЅС‹С… С‚Р°СЂРёС„Р°С… вЂ” Р±РѕР»СЊС€Рµ РїСЂРѕРµРєС‚РѕРІ Рё СЃРѕС…СЂР°РЅРµРЅРёР№ РІ РґРµРЅСЊ.',
  },
  {
    q: 'РљР°Рє РєСѓРїРёС‚СЊ РїСЂРµСЃРµС‚?',
    a: 'Р’ РјР°СЂРєРµС‚РїР»РµР№СЃРµ РїСЂРµСЃРµС‚РѕРІ РѕС‚РєСЂРѕР№С‚Рµ РєР°СЂС‚РѕС‡РєСѓ Рё РѕС„РѕСЂРјРёС‚Рµ РїРѕРєСѓРїРєСѓ. РџРѕСЃР»Рµ РѕРїР»Р°С‚С‹ РїСЂРµСЃРµС‚ РїРѕСЏРІРёС‚СЃСЏ РІ РІР°С€РµР№ Р±РёР±Р»РёРѕС‚РµРєРµ Рё РµРіРѕ РјРѕР¶РЅРѕ СЃРєР°С‡Р°С‚СЊ.',
  },
  {
    q: 'РњРѕР¶РЅРѕ Р»Рё СѓСЃС‚Р°РЅРѕРІРёС‚СЊ SoundLab РЅР° РєРѕРјРїСЊСЋС‚РµСЂ РёР»Рё С‚РµР»РµС„РѕРЅ?',
    a: 'Р”Р°. SoundLab вЂ” СЌС‚Рѕ PWA. Р’ Chrome/Edge РЅР° Windows РёР»Рё macOS: РёРєРѕРЅРєР° СѓСЃС‚Р°РЅРѕРІРєРё РІ Р°РґСЂРµСЃРЅРѕР№ СЃС‚СЂРѕРєРµ РёР»Рё РјРµРЅСЋ в†’ В«РЈСЃС‚Р°РЅРѕРІРёС‚СЊ РїСЂРёР»РѕР¶РµРЅРёРµВ» вЂ” РїРѕСЏРІРёС‚СЃСЏ СЏСЂР»С‹Рє РЅР° СЂР°Р±РѕС‡РµРј СЃС‚РѕР»Рµ Рё РІ В«РџСѓСЃРєВ». РќР° iPhone: Safari в†’ РџРѕРґРµР»РёС‚СЊСЃСЏ в†’ В«РќР° СЌРєСЂР°РЅ Р”РѕРјРѕР№В». РњР°РіР°Р·РёРЅ РїСЂРёР»РѕР¶РµРЅРёР№ РЅРµ РЅСѓР¶РµРЅ.',
  },
  {
    q: 'РљР°Рє СЃРІСЏР·Р°С‚СЊСЃСЏ СЃ РїРѕРґРґРµСЂР¶РєРѕР№?',
    a: 'РќР°РїРёС€РёС‚Рµ РЅР° placement@soundlab-studio.ru РёР»Рё РѕС‚РєСЂРѕР№С‚Рµ СЂР°Р·РґРµР» В«РљРѕРЅС‚Р°РєС‚С‹В». Р•СЃР»Рё РІРёРґРёС‚Рµ РЅР°СЂСѓС€РµРЅРёРµ вЂ” РїРѕР¶Р°Р»СѓР№С‚РµСЃСЊ РЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РёР· РµРіРѕ РїСЂРѕС„РёР»СЏ.',
  },
];

export default function Landing({ variant = 'home' }: { variant?: LandingVariant }) {
  const token = useAuthStore((s) => s.token);
  const meta = VARIANT[variant];
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const { canOfferInstall } = usePwaInstall();

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
        keywords="SoundLab, РѕРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё, Р·Р°РїРёСЃР°С‚СЊ С‚СЂРµРє РѕРЅР»Р°Р№РЅ, СЃС‚СѓРґРёСЏ РѕРЅР»Р°Р№РЅ, Р·Р°РїРёСЃСЊ РІРѕРєР°Р»Р°, MIDI РѕРЅР»Р°Р№РЅ"
      />
      <style>{`

        .sl-boot {
          min-height: 100vh; background: #0c0b0a; color: #8a8580;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 600; letter-spacing: -0.02em;
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
          font-family: 'Syne', ui-sans-serif, sans-serif;
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
          margin: 0 0 14px; font-family: 'DM Mono', monospace;
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
          margin-left: 6px; font-family: 'DM Mono', monospace;
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
          font-family: 'DM Mono', monospace; font-size: 12px;
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

        .sl-pwa-card {
          margin-top: 8px;
          padding: 22px 20px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(232,168,124,0.1), transparent 55%), var(--panel);
          display: grid;
          gap: 14px;
        }
        @media (min-width: 720px) {
          .sl-pwa-card {
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 24px;
          }
        }
        .sl-pwa-card h2 { margin: 0 0 6px; font-size: 22px; letter-spacing: -0.03em; }
        .sl-pwa-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 52ch; }
        .sl-pwa-card .sl-pwa-install {
          display: inline-flex; align-items: center; gap: 8px;
          border: 0; border-radius: 999px; padding: 11px 16px;
          background: var(--ink); color: var(--bg); font-weight: 700; font-size: 13px;
          cursor: pointer; font-family: inherit; white-space: nowrap;
        }
        .sl-pwa-card .sl-pwa-install:hover { opacity: 0.92; }
        .sl-pwa-badge {
          display: inline-block; margin-bottom: 8px;
          font-family: 'DM Mono', monospace; font-size: 10px;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
        }

        .sl-foot {
          border-top: 1px solid var(--line); padding: 28px 0 48px;
          display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between;
          color: var(--dim); font-size: 13px;
        }
        .sl-foot a { color: var(--muted); text-decoration: none; }
        .sl-foot a:hover { color: var(--ink); }
      `}</style>

      <div className="sl-wrap">
        <nav className="sl-nav" aria-label="Р“Р»Р°РІРЅР°СЏ РЅР°РІРёРіР°С†РёСЏ">
          <Link to="/" className="sl-logo">SoundLab</Link>
          <div className="sl-nav-actions">
            <Link to="/login" className="sl-btn">Р’РѕР№С‚Рё</Link>
            <Link to="/register" className="sl-btn sl-btn-primary">Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ</Link>
          </div>
        </nav>

        <header className="sl-hero">
          <div className="sl-hero-copy">
            <p className="sl-kicker">РћРЅР»Р°Р№РЅ СЃС‚СѓРґРёСЏ Р·РІСѓРєРѕР·Р°РїРёСЃРё</p>
            <h1>
              SoundLab
              <span className="sl-brand-line">{meta.h1}</span>
            </h1>
            <p className="sl-hero-lead">{meta.lead}</p>
            <div className="sl-cta">
              <Link to="/register" className="sl-btn sl-btn-primary">Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ</Link>
              <Link to="/login" className="sl-btn">Р’РѕР№С‚Рё</Link>
            </div>
            <p className="sl-note">
              Р•СЃС‚СЊ PWA: СѓСЃС‚Р°РЅРѕРІРёС‚Рµ SoundLab РЅР° РєРѕРјРїСЊСЋС‚РµСЂ РёР»Рё С‚РµР»РµС„РѕРЅ вЂ” СЏСЂР»С‹Рє РЅР° СЂР°Р±РѕС‡РµРј СЃС‚РѕР»Рµ, РєР°Рє РѕР±С‹С‡РЅРѕРµ РїСЂРёР»РѕР¶РµРЅРёРµ.
            </p>
            <p className="sl-note" style={{ marginTop: 8 }}>
              Р­С‚Рѕ РїСЂРµРІСЊСЋ РїСЂРѕРµРєС‚Р°. РЎС‚СѓРґРёСЏ, Р»РµРЅС‚Р° Рё РѕСЃС‚Р°Р»СЊРЅС‹Рµ СЂР°Р·РґРµР»С‹ РґРѕСЃС‚СѓРїРЅС‹ С‚РѕР»СЊРєРѕ Р°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Рј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРј.
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
              <strong>РЎС‚СѓРґРёСЏ Р·Р°РєСЂС‹С‚Р° Р±РµР· РІС…РѕРґР°.</strong> Р—Р°СЂРµРіРёСЃС‚СЂРёСЂСѓР№С‚РµСЃСЊ РёР»Рё РІРѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ MIDI, Р·Р°РїРёСЃСЊ Рё РїСЂРѕРµРєС‚С‹.
            </div>
          </div>
        </header>

        <section className="sl-section" aria-labelledby="about-heading">
          <h2 id="about-heading">Рћ РїСЂРѕРµРєС‚Рµ</h2>
          <p className="sl-section-lead">
            SoundLab вЂ” РїР»Р°С‚С„РѕСЂРјР° РґР»СЏ РјСѓР·С‹РєР°РЅС‚РѕРІ Рё СЂСЌРїРµСЂРѕРІ: РёРґРµСЏ, Р·Р°РїРёСЃСЊ Рё РїСѓР±Р»РёРєР°С†РёСЏ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ.
            Р—РґРµСЃСЊ РјРѕР¶РЅРѕ СЃРѕР±СЂР°С‚СЊ Р±РёС‚, РЅР°Р»РѕР¶РёС‚СЊ РІРѕРєР°Р» СЃ СЌС„С„РµРєС‚Р°РјРё, РІС‹Р»РѕР¶РёС‚СЊ SoundTok РёР»Рё РїСЂРѕРІРµСЃС‚Рё СЂСЌРї-Р±Р°С‚С‚Р».
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
          <h2 id="how-heading">РљР°Рє РїРѕРїР°СЃС‚СЊ РІРЅСѓС‚СЂСЊ</h2>
          <p className="sl-section-lead">
            Р“РѕСЃС‚СЏРј РІРёРґРЅР° С‚РѕР»СЊРєРѕ РІРёС‚СЂРёРЅР°. Р§С‚РѕР±С‹ СЂР°Р±РѕС‚Р°С‚СЊ РІ СЃРµСЂРІРёСЃРµ вЂ” РЅСѓР¶РµРЅ Р°РєРєР°СѓРЅС‚.
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
            <p>Р“РѕС‚РѕРІС‹ РЅР°С‡Р°С‚СЊ? РЎРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚ РёР»Рё РІРѕР№РґРёС‚Рµ вЂ” С„РѕСЂРјС‹ РѕС‚РєСЂРѕСЋС‚СЃСЏ СЃСЂР°Р·Сѓ.</p>
            <div className="sl-cta" style={{ marginTop: 0 }}>
              <Link to="/register" className="sl-btn sl-btn-primary">Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ</Link>
              <Link to="/login" className="sl-btn">Р’РѕР№С‚Рё</Link>
            </div>
          </div>
        </section>

        {canOfferInstall && (
          <section className="sl-section" aria-labelledby="pwa-heading">
            <div className="sl-pwa-card">
              <div>
                <span className="sl-pwa-badge">PWA</span>
                <h2 id="pwa-heading">РџСЂРёР»РѕР¶РµРЅРёРµ РЅР° РєРѕРјРїСЊСЋС‚РµСЂ Рё С‚РµР»РµС„РѕРЅ</h2>
                <p>
                  SoundLab СЃС‚Р°РІРёС‚СЃСЏ СЃ СЃР°Р№С‚Р° РєР°Рє РЅР°СЃС‚РѕСЏС‰РµРµ РїСЂРёР»РѕР¶РµРЅРёРµ: СЏСЂР»С‹Рє РЅР° СЂР°Р±РѕС‡РµРј СЃС‚РѕР»Рµ Рё РІ В«РџСѓСЃРєВ»,
                  РѕС‚РґРµР»СЊРЅРѕРµ РѕРєРЅРѕ, Р±С‹СЃС‚СЂС‹Р№ Р·Р°РїСѓСЃРє. Р‘РµР· App Store Рё Google Play.
                </p>
              </div>
              <PwaInstallButton className="sl-pwa-install" variant="inline" />
            </div>
          </section>
        )}

        <section className="sl-section sl-faq" aria-label="Р§Р°СЃС‚С‹Рµ РІРѕРїСЂРѕСЃС‹">
          <h2>Р§Р°СЃС‚С‹Рµ РІРѕРїСЂРѕСЃС‹</h2>
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </section>

        <footer className="sl-foot">
          <div>В© {new Date().getFullYear()} SoundLab В· soundlab-studio.ru</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/">SoundLab</Link>
            <Link to="/offer">РћС„РµСЂС‚Р°</Link>
            <Link to="/privacy">РљРѕРЅС„РёРґРµРЅС†РёР°Р»СЊРЅРѕСЃС‚СЊ</Link>
            <Link to="/contacts">РљРѕРЅС‚Р°РєС‚С‹</Link>
            <Link to="/refunds">Р’РѕР·РІСЂР°С‚С‹</Link>
            <Link to="/delivery">РџРѕР»СѓС‡РµРЅРёРµ СѓСЃР»СѓРіРё</Link>
            <Link to="/login">Р’РѕР№С‚Рё</Link>
            <Link to="/register">Р РµРіРёСЃС‚СЂР°С†РёСЏ</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
