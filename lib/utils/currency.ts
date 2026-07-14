/**
 * Currency Formatting Utilities
 * All amounts in Kenyan Shilling (KES)
 */

export function formatCurrency(amount: number, includeSymbol = true): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return includeSymbol ? 'KES 0' : '0'
  }

  const formatted = new Intl.NumberFormat('en-KE', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return formatted
}

export function parseCurrency(value: string): number {
  // Remove KES, commas, and spaces
  const cleaned = value.replace(/KES|\s|,/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function calculateMargin(costPrice: number, sellingPrice: number): number {
  if (costPrice === 0) return 0
  return ((sellingPrice - costPrice) / costPrice) * 100
}

export function calculateProfit(costPrice: number, sellingPrice: number, quantity: number): number {
  return (sellingPrice - costPrice) * quantity
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round((amount * taxRate) / 100 * 100) / 100
}
