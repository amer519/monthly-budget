import type { Season } from '../types/models'

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/** One-time best guess for a brand-new month with no history to carry forward from. */
export function guessSeason(month: number): Season {
  return month >= 5 && month <= 9 ? 'summer' : 'winter'
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta
  const newYear = year + Math.floor(zeroBased / 12)
  const newMonth = ((zeroBased % 12) + 12) % 12
  return { year: newYear, month: newMonth + 1 }
}

export function isSameOrAfter(a: { year: number; month: number }, b: { year: number; month: number }): boolean {
  if (a.year !== b.year) return a.year > b.year
  return a.month >= b.month
}

export function formatDateReadable(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
