import { emptyData, type CooperativeData } from './model'

const STORAGE_KEY = 'shamba.cooperative.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSale(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.farmer === 'string'
    && typeof value.crop === 'string'
    && typeof value.quantityKg === 'number'
    && Number.isFinite(value.quantityKg)
    && typeof value.pricePerKg === 'number'
    && Number.isFinite(value.pricePerKg)
    && typeof value.soldAt === 'string'
}

function isInventoryItem(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.crop === 'string'
    && typeof value.quantityKg === 'number'
    && Number.isFinite(value.quantityKg)
    && typeof value.location === 'string'
}

function isLedgerEntry(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.type === 'income' || value.type === 'expense')
    && typeof value.description === 'string'
    && typeof value.amount === 'number'
    && Number.isFinite(value.amount)
    && typeof value.recordedAt === 'string'
}

function isCooperativeData(value: unknown): value is CooperativeData {
  return isRecord(value)
    && Array.isArray(value.sales)
    && value.sales.every(isSale)
    && Array.isArray(value.inventory)
    && value.inventory.every(isInventoryItem)
    && Array.isArray(value.ledger)
    && value.ledger.every(isLedgerEntry)
}

export function loadData(): CooperativeData {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === null) return emptyData

  try {
    const data: unknown = JSON.parse(stored)
    if (isCooperativeData(data)) return data
    throw new Error('Stored records do not match the expected format.')
  } catch (error) {
    throw new Error(
      'Saved records could not be read. Your browser data was left unchanged.',
      { cause: error },
    )
  }
}

export function saveData(data: CooperativeData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
