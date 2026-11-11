import { describe, expect, it } from 'vitest'
import { ledgerTotals, totalSales, totalStock, updateStock, type InventoryItem } from './model'

describe('cooperative record calculations', () => {
  it('totals sales, stock, and ledger entries by type', () => {
    expect(totalSales([
      { id: '1', farmer: 'A', crop: 'Maize', quantityKg: 20, pricePerKg: 50, soldAt: '2026-01-01' },
      { id: '2', farmer: 'B', crop: 'Beans', quantityKg: 10, pricePerKg: 100, soldAt: '2026-01-02' },
    ])).toBe(2000)
    expect(totalStock([{ id: '1', crop: 'Maize', quantityKg: 12, location: 'Shed A' }])).toBe(12)
    expect(ledgerTotals([
      { id: '1', type: 'income', description: 'Sale', amount: 2000, recordedAt: '2026-01-01' },
      { id: '2', type: 'expense', description: 'Seeds', amount: 500, recordedAt: '2026-01-02' },
    ])).toEqual({ income: 2000, expense: 500 })
  })

  it('adds to an existing crop and location regardless of letter case', () => {
    const current: InventoryItem[] = [
      { id: '1', crop: 'Maize', quantityKg: 20, location: 'Main store' },
    ]

    expect(updateStock(current, 'maize', 'MAIN STORE', 5)).toEqual([
      { id: '1', crop: 'Maize', quantityKg: 25, location: 'Main store' },
    ])
  })

  it('prevents dispatching more stock than is recorded', () => {
    const current: InventoryItem[] = [
      { id: '1', crop: 'Maize', quantityKg: 20, location: 'Main store' },
    ]

    expect(() => updateStock(current, 'Maize', 'Main store', -21))
      .toThrow('You cannot dispatch more stock than is recorded.')
  })
})
