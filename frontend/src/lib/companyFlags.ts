type HasCompanyName = {
  companyName?: string | null;
};

export const SPAZORLABS_COMPANY_NAME = 'spazorlabs';

const normalizeCompanyName = (companyName?: string | null): string =>
  (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const isSpazorlabsCompany = (companyName?: string | null): boolean =>
  normalizeCompanyName(companyName).includes(SPAZORLABS_COMPANY_NAME);

export const sortSpazorlabsFirst = <T extends HasCompanyName>(jobs: T[]): T[] => {
  const prioritized: T[] = [];
  const others: T[] = [];

  for (const job of jobs) {
    if (isSpazorlabsCompany(job.companyName)) {
      prioritized.push(job);
    } else {
      others.push(job);
    }
  }

  return [...prioritized, ...others];
};
