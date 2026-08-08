import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date, opts?: Intl.DateTimeFormatOptions): string =>
  new Date(date).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });



export const truncate = (str: string, length: number): string =>
  str.length > length ? str.slice(0, length) + '…' : str;

export const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count !== 1 ? 's' : ''}`;

export const normalizeCompany = <T extends any>(item: T): T => {
  if (!item) return item;
  return {
    ...item,
    companyName:
      (item as any).companyName ||
      (item as any).company_name ||
      (item as any).company?.name ||
      (item as any).recruiter?.companyName ||
      (item as any).job?.companyName ||
      null,
  };
};
