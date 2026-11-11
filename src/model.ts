export type Sale = {
  id: string
  farmer: string
  crop: string
  quantityKg: number
  pricePerKg: number
  soldAt: string
}

export type InventoryItem = {
  id: string
  crop: string
  quantityKg: number
  location: string
}

export type LedgerEntry = {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  recordedAt: string
}

export type CooperativeData = {
  sales: Sale[]
  inventory: InventoryItem[]
  ledger: LedgerEntry[]
}

export const emptyData: CooperativeData = {
  sales: [],
  inventory: [],
  ledger: [],
}

export function updateStock(
  inventory: InventoryItem[],
  cropName: string,
  locationName: string,
  quantityChange: number,
): InventoryItem[] {
  const crop = cropName.trim()
  const location = locationName.trim()
  if (!crop || !location || !Number.isFinite(quantityChange) || quantityChange === 0) {
    throw new Error('Enter a crop, a storage location, and a non-zero quantity change.')
  }

  const index = inventory.findIndex(
    (item) => item.crop.toLowerCase() === crop.toLowerCase()
      && item.location.toLowerCase() === location.toLowerCase(),
  )

  if (index === -1) {
    if (quantityChange < 0) throw new Error('You cannot dispatch more stock than is recorded.')
    return [...inventory, { id: crypto.randomUUID(), crop, location, quantityKg: quantityChange }]
  }

  const nextQuantity = inventory[index].quantityKg + quantityChange
  if (nextQuantity < 0) throw new Error('You cannot dispatch more stock than is recorded.')
  if (nextQuantity === 0) return inventory.filter((_, itemIndex) => itemIndex !== index)

  return inventory.map((item, itemIndex) =>
    itemIndex === index ? { ...item, quantityKg: nextQuantity } : item,
  )
}

export function totalSales(sales: Sale[]): number {
  return sales.reduce((total, sale) => total + sale.quantityKg * sale.pricePerKg, 0)
}

export function ledgerTotals(ledger: LedgerEntry[]) {
  return ledger.reduce(
    (totals, entry) => {
      totals[entry.type] += entry.amount
      return totals
    },
    { income: 0, expense: 0 },
  )
}

export function totalStock(inventory: InventoryItem[]): number {
  return inventory.reduce((total, item) => total + item.quantityKg, 0)
}

export function localDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatQuantity(amount: number): string {
  return new Intl.NumberFormat('en-KE', { maximumFractionDigits: 1 }).format(amount)
}
