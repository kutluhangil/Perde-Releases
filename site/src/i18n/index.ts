import { tr, type Dict } from './tr';
import { en } from './en';

export const languages = ['tr', 'en'] as const;
export type Lang = (typeof languages)[number];

const dicts: Record<Lang, Dict> = { tr, en };

export const t = (lang: Lang): Dict => dicts[lang];
export const otherLang = (lang: Lang): Lang => (lang === 'tr' ? 'en' : 'tr');
export const langPath = (lang: Lang, hash = ''): string => `/${lang}/${hash}`;
