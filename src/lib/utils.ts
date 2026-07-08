export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}
