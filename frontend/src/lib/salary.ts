/**
 * Formats a salary amount into a readable string using Indian numbering abbreviations (k, L, Cr).
 */
export function formatSalaryAmount(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  return `₹${amount}`;
}

/**
 * Determines the salary unit (/mo or /yr) based on the amount and job type.
 */
export function getSalaryUnit(min: number | null, max: number | null, type?: string): string {
  const val = min ?? max ?? 0;
  
  // Explicitly monthly for internships
  if (type === 'internship') return '/mo';
  
  // Heuristic: amounts below 1 Lakh are likely monthly stipends, above are annual
  if (val > 0 && val < 100000) return '/mo';
  
  return '/yr';
}

/**
 * Formats a salary range with its appropriate unit.
 */
export function formatSalaryRange(
  min: number | null,
  max: number | null,
  type?: string
): string {
  if (!min && !max) return 'Competitive';

  const unit = getSalaryUnit(min, max, type);

  if (min && max) {
    if (min === max) return `${formatSalaryAmount(min)}${unit}`;
    return `${formatSalaryAmount(min)} - ${formatSalaryAmount(max)}${unit}`;
  }
  
  if (min) return `${formatSalaryAmount(min)}+${unit}`;
  
  return `Up to ${formatSalaryAmount(max!)}${unit}`;
}
