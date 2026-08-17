/** All money math happens in integer cents; these are the only places we cross to/from dollars. */

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function parseDollarInputToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[$,]/g, '')
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const currencyFormatterNoCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCents(cents: number, opts?: { noCents?: boolean }): string {
  const dollars = centsToDollars(cents)
  return opts?.noCents ? currencyFormatterNoCents.format(dollars) : currencyFormatter.format(dollars)
}

export function formatCentsCompact(cents: number): string {
  const dollars = Math.round(centsToDollars(cents))
  return currencyFormatterNoCents.format(dollars)
}
