import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('record entry dialog', () => {
  it('closes with Escape without changing saved cooperative records', () => {
    render(<App />)

    const trigger = screen.getByRole('button', { name: 'Record farmer intake' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Receive farmer produce' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(localStorage.getItem('shamba.cooperative.v1')).toBeNull()
  })

  it('does not show a maize photo for an unsupported crop', () => {
    localStorage.setItem('shamba.cooperative.v1', JSON.stringify({
      sales: [],
      inventory: [{ id: '1', crop: 'Potatoes', quantityKg: 50, location: 'Nakuru Main Store' }],
      ledger: [],
    }))
    render(<App />)

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main navigation' }))
      .getByRole('button', { name: 'Inventory' }))

    expect(screen.getByText('Potatoes')).toBeInTheDocument()
    expect(document.querySelector('.crop-image')).toBeNull()
  })
})
