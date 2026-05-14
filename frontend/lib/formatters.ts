export function inr(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '₹0';
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}

export function inrPrecise(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '₹0.00';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d: string | Date | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysAgo(d: string | Date | undefined | null): number {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export function maskPan(pan: string | undefined): string {
  if (!pan) return '—';
  if (pan.length < 6) return pan;
  return pan.substring(0, 3) + 'XXXX' + pan.substring(pan.length - 3);
}

export function cn(...args: (string | undefined | null | false)[]): string {
  return args.filter(Boolean).join(' ');
}
