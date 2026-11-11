import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Leaf,
  Plus,
  ReceiptText,
  Sprout,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  emptyData,
  formatCurrency,
  formatQuantity,
  ledgerTotals,
  localDate,
  totalSales,
  totalStock,
  updateStock,
  type CooperativeData,
} from './model'
import { loadData, saveData } from './storage'

type Section = 'overview' | 'sales' | 'inventory' | 'ledger'
type ModalMode = 'sale' | 'stock' | 'ledger'

const navigation: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sales', label: 'Crop sales', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'ledger', label: 'Cash book', icon: ReceiptText },
]

const sectionTitles: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'A clear view of your cooperative today.' },
  sales: { title: 'Crop sales', description: 'Keep a record of every farmer delivery and sale.' },
  inventory: { title: 'Inventory', description: 'Track produce stored across your locations.' },
  ledger: { title: 'Cash book', description: 'Keep income and expenses in one simple ledger.' },
}

function getInitialState(): { data: CooperativeData; notice: string; canWrite: boolean } {
  try {
    return { data: loadData(), notice: '', canWrite: true }
  } catch (error) {
    return {
      data: emptyData,
      notice: error instanceof Error ? error.message : 'Saved records could not be read.',
      canWrite: false,
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The record could not be saved.'
}

function displayDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function readText(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim()
}

function readAmount(form: FormData, key: string): number {
  const amount = Number(form.get(key))
  if (!Number.isFinite(amount)) throw new Error('Enter a valid number.')
  return amount
}

function App() {
  const [initialState] = useState(getInitialState)
  const [data, setData] = useState(initialState.data)
  const [canWrite, setCanWrite] = useState(initialState.canWrite)
  const [section, setSection] = useState<Section>('overview')
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [modalError, setModalError] = useState('')
  const [notice, setNotice] = useState(initialState.notice)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const totals = ledgerTotals(data.ledger)
  const salesValue = totalSales(data.sales)
  const stockValue = totalStock(data.inventory)
  const heading = sectionTitles[section]

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])

  function commit(nextData: CooperativeData, successMessage: string): boolean {
    try {
      saveData(nextData)
      setData(nextData)
      setNotice(successMessage)
      setCanWrite(true)
      return true
    } catch (error) {
      const message = `Could not save this record on this device. ${messageOf(error)}`
      setNotice(message)
      setModalError(message)
      return false
    }
  }

  function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) {
      setModalError('Editing is disabled because saved records could not be read.')
      return
    }

    const form = new FormData(event.currentTarget)
    const id = crypto.randomUUID()
    try {
      if (modal === 'sale') {
        const farmer = readText(form, 'farmer')
        const crop = readText(form, 'crop')
        const quantityKg = readAmount(form, 'quantityKg')
        const pricePerKg = readAmount(form, 'pricePerKg')
        const soldAt = readText(form, 'date')
        if (!farmer || !crop || !soldAt || quantityKg <= 0 || pricePerKg <= 0) {
          throw new Error('Enter the farmer, crop, date, and positive quantity and price.')
        }
        const amount = quantityKg * pricePerKg
        if (!commit({
          ...data,
          sales: [{ id, farmer, crop, quantityKg, pricePerKg, soldAt }, ...data.sales],
          ledger: [{
            id: crypto.randomUUID(),
            type: 'income',
            description: `Crop sale · ${crop} · ${farmer}`,
            amount,
            recordedAt: soldAt,
          }, ...data.ledger],
        }, 'Sale recorded and added to the cash book.')) return
      } else if (modal === 'stock') {
        const inventory = updateStock(
          data.inventory,
          readText(form, 'crop'),
          readText(form, 'location'),
          readAmount(form, 'quantityChange'),
        )
        if (!commit({ ...data, inventory }, 'Inventory updated.')) return
      } else if (modal === 'ledger') {
        const description = readText(form, 'description')
        const amount = readAmount(form, 'amount')
        const type = readText(form, 'type')
        const recordedAt = readText(form, 'date')
        if (!description || !recordedAt || amount <= 0 || (type !== 'income' && type !== 'expense')) {
          throw new Error('Enter a description, date, transaction type, and positive amount.')
        }
        if (!commit({
          ...data,
          ledger: [{ id, type, description, amount, recordedAt }, ...data.ledger],
        }, 'Cash book entry recorded.')) return
      }
      setModal(null)
      setModalError('')
    } catch (error) {
      setModalError(messageOf(error))
    }
  }

  function openModal(mode: ModalMode) {
    setNotice('')
    setModalError('')
    setModal(mode)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection('overview') }}>
          <span className="brand-mark"><Sprout size={23} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>Mavuno</strong><small>COOPERATIVE</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${section === id ? 'active' : ''}`}
              key={id}
              onClick={() => { setSection(id); setNotice('') }}
              aria-current={section === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="cooperative-card">
            <span className="cooperative-icon"><Leaf size={17} /></span>
            <div><strong>Nakuru</strong><small>Farming cooperative</small></div>
          </div>
          <p className="sidebar-footnote">Your records are saved on this device.</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Sprout size={21} /></span><strong>Mavuno</strong></div>
          <div className={`connection ${isOnline ? 'connected' : 'offline'}`}>
            {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">NAKURU · COOPERATIVE RECORDS</p>
              <h1>{heading.title}</h1>
              <p className="page-description">{heading.description}</p>
            </div>
            <div className="heading-actions">
              {section === 'sales' && <button className="primary-button" disabled={!canWrite} onClick={() => openModal('sale')}><Plus size={17} /> Record sale</button>}
              {section === 'inventory' && <button className="primary-button" disabled={!canWrite} onClick={() => openModal('stock')}><Plus size={17} /> Adjust stock</button>}
              {section === 'ledger' && <button className="primary-button" disabled={!canWrite} onClick={() => openModal('ledger')}><Plus size={17} /> Add entry</button>}
            </div>
          </div>

          {notice && <div className={`notice ${canWrite ? 'notice-success' : 'notice-error'}`} role={canWrite ? 'status' : 'alert'}>{notice}</div>}

          {section === 'overview' && (
            <Overview
              data={data}
              salesValue={salesValue}
              stockValue={stockValue}
              income={totals.income}
              expenses={totals.expense}
              canWrite={canWrite}
              openModal={openModal}
              setSection={setSection}
            />
          )}
          {section === 'sales' && <SalesPage sales={data.sales} />}
          {section === 'inventory' && <InventoryPage inventory={data.inventory} />}
          {section === 'ledger' && <LedgerPage ledger={data.ledger} totals={totals} />}
          <footer className="page-footer"><span>Mavuno Cooperative Records</span><span>Amounts in Kenyan shillings · KES</span></footer>
        </main>
      </div>

      {modal && <RecordModal mode={modal} error={modalError} onClose={() => { setModal(null); setModalError('') }} onSubmit={submitRecord} />}
    </div>
  )
}

function Overview({
  data,
  salesValue,
  stockValue,
  income,
  expenses,
  canWrite,
  openModal,
  setSection,
}: {
  data: CooperativeData
  salesValue: number
  stockValue: number
  income: number
  expenses: number
  canWrite: boolean
  openModal: (mode: ModalMode) => void
  setSection: (section: Section) => void
}) {
  return (
    <>
      <section className="welcome-card">
        <div className="welcome-copy">
          <div className="welcome-tag"><span /> COOPERATIVE DASHBOARD</div>
          <h2>Good work starts with<br />good records.</h2>
          <p>Keep your sales, harvest stock, and cash book together — ready whenever you need them.</p>
          <button className="welcome-button" disabled={!canWrite} onClick={() => openModal('sale')}><Plus size={17} /> Record a crop sale</button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="sun-disc" />
          <div className="hill hill-back" />
          <div className="hill hill-front" />
          <div className="field-lines"><i /><i /><i /><i /><i /></div>
          <div className="art-stalk stalk-one"><b /><b /><b /></div>
          <div className="art-stalk stalk-two"><b /><b /><b /></div>
          <div className="art-stalk stalk-three"><b /><b /><b /></div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Cooperative totals">
        <Metric icon={CircleDollarSign} label="Recorded sales" value={formatCurrency(salesValue)} detail={`${data.sales.length} sale${data.sales.length === 1 ? '' : 's'} recorded`} tone="green" />
        <Metric icon={Boxes} label="Stock on hand" value={`${formatQuantity(stockValue)} kg`} detail={`${data.inventory.length} crop and storage record${data.inventory.length === 1 ? '' : 's'}`} tone="lime" />
        <Metric icon={ArrowDownLeft} label="Cash in" value={formatCurrency(income)} detail="Sales and other income" tone="blue" />
        <Metric icon={ArrowUpRight} label="Cash out" value={formatCurrency(expenses)} detail="Recorded expenses" tone="orange" />
      </section>

      <div className="overview-lower">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div><h2>Recent sales</h2><p>Your latest recorded crop deliveries</p></div>
            <button className="text-button" onClick={() => setSection('sales')}>All sales <ArrowUpRight size={15} /></button>
          </div>
          {data.sales.length === 0
            ? <EmptyState icon={ClipboardList} title="No sales recorded yet" description="Record a crop sale to start building your cooperative's history." />
            : <SalesTable sales={data.sales.slice(0, 5)} />}
        </section>
        <section className="panel shortcuts-panel">
          <div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your records up to date</p></div></div>
          <button className="shortcut-row" disabled={!canWrite} onClick={() => openModal('sale')}><span className="shortcut-icon sale-shortcut"><ClipboardList size={18} /></span><span><strong>Record a sale</strong><small>Log a farmer delivery</small></span><Plus size={17} /></button>
          <button className="shortcut-row" disabled={!canWrite} onClick={() => openModal('stock')}><span className="shortcut-icon stock-shortcut"><Boxes size={18} /></span><span><strong>Adjust stock</strong><small>Receive or dispatch produce</small></span><Plus size={17} /></button>
          <button className="shortcut-row" disabled={!canWrite} onClick={() => openModal('ledger')}><span className="shortcut-icon ledger-shortcut"><ReceiptText size={18} /></span><span><strong>Add cash entry</strong><small>Record other income or expense</small></span><Plus size={17} /></button>
          <div className="balance-strip"><span>Cash book balance</span><strong className={income - expenses < 0 ? 'negative' : ''}>{formatCurrency(income - expenses)}</strong></div>
        </section>
      </div>
    </>
  )
}

function Metric({ icon: Icon, label, value, detail, tone }: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.9} /></div>
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  )
}

function SalesPage({ sales }: { sales: CooperativeData['sales'] }) {
  const value = totalSales(sales)
  return (
    <section className="panel data-panel">
      <div className="panel-heading">
        <div><h2>Sales register</h2><p>{sales.length} recorded transaction{sales.length === 1 ? '' : 's'}</p></div>
        <div className="table-total"><small>Recorded value</small><strong>{formatCurrency(value)}</strong></div>
      </div>
      {sales.length === 0
        ? <EmptyState icon={ClipboardList} title="Your sales register is empty" description="Use “Record sale” to add a farmer delivery. Sale income is added to the cash book automatically." />
        : <SalesTable sales={sales} />}
    </section>
  )
}

function SalesTable({ sales }: { sales: CooperativeData['sales'] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Farmer</th><th>Crop</th><th>Quantity</th><th>Price / kg</th><th>Date</th><th className="align-right">Sale value</th></tr></thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td><span className="farmer-cell"><span className="avatar">{sale.farmer.trim().slice(0, 1).toUpperCase()}</span><strong>{sale.farmer}</strong></span></td>
              <td><span className="crop-pill">{sale.crop}</span></td>
              <td>{formatQuantity(sale.quantityKg)} kg</td>
              <td>{formatCurrency(sale.pricePerKg)}</td>
              <td>{displayDate(sale.soldAt)}</td>
              <td className="align-right amount-cell">{formatCurrency(sale.quantityKg * sale.pricePerKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InventoryPage({ inventory }: { inventory: CooperativeData['inventory'] }) {
  const stock = totalStock(inventory)
  return (
    <section className="panel data-panel">
      <div className="panel-heading">
        <div><h2>Stock register</h2><p>By crop and storage location</p></div>
        <div className="table-total"><small>Total stock</small><strong>{formatQuantity(stock)} kg</strong></div>
      </div>
      {inventory.length === 0
        ? <EmptyState icon={Boxes} title="No stock on record" description="Adjust stock when produce is received or dispatched from a store." />
        : <div className="table-wrap">
          <table>
            <thead><tr><th>Crop</th><th>Storage location</th><th className="align-right">Quantity on hand</th></tr></thead>
            <tbody>{inventory.map((item) => (
              <tr key={item.id}>
                <td><span className="crop-name"><span className="crop-icon"><Sprout size={16} /></span><strong>{item.crop}</strong></span></td>
                <td>{item.location}</td>
                <td className="align-right amount-cell">{formatQuantity(item.quantityKg)} kg</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      {inventory.length > 0 && <p className="table-hint">To dispatch produce, enter a negative quantity in “Adjust stock”. Stock cannot go below zero.</p>}
    </section>
  )
}

function LedgerPage({ ledger, totals }: { ledger: CooperativeData['ledger']; totals: ReturnType<typeof ledgerTotals> }) {
  return (
    <>
      <div className="ledger-summary">
        <div><span>Total income</span><strong className="income-text">{formatCurrency(totals.income)}</strong></div>
        <div><span>Total expenses</span><strong className="expense-text">{formatCurrency(totals.expense)}</strong></div>
        <div><span>Balance</span><strong className={totals.income - totals.expense < 0 ? 'negative' : ''}>{formatCurrency(totals.income - totals.expense)}</strong></div>
      </div>
      <section className="panel data-panel">
        <div className="panel-heading"><div><h2>Cash book</h2><p>Sales are entered here automatically; use “Add entry” for other cash movements.</p></div></div>
        {ledger.length === 0
          ? <EmptyState icon={ReceiptText} title="No cash entries yet" description="Record a sale or add an income or expense to start your cash book." />
          : <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Description</th><th>Date</th><th className="align-right">Amount</th></tr></thead>
              <tbody>{ledger.map((entry) => (
                <tr key={entry.id}>
                  <td><span className={`type-pill ${entry.type}`}>{entry.type === 'income' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{entry.type === 'income' ? 'Income' : 'Expense'}</span></td>
                  <td><strong className="description-cell">{entry.description}</strong></td>
                  <td>{displayDate(entry.recordedAt)}</td>
                  <td className={`align-right amount-cell ${entry.type === 'income' ? 'income-text' : 'expense-text'}`}>{entry.type === 'income' ? '+' : '−'}{formatCurrency(entry.amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
      </section>
    </>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

function RecordModal({ mode, error, onClose, onSubmit }: {
  mode: ModalMode
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const titles: Record<ModalMode, string> = { sale: 'Record a crop sale', stock: 'Adjust inventory', ledger: 'Add cash book entry' }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><div><p className="eyebrow">COOPERATIVE RECORDS</p><h2 id="modal-title">{titles[mode]}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
        <form onSubmit={onSubmit}>
          {error && <p className="modal-error" role="alert">{error}</p>}
          {mode === 'sale' && <>
            <label>Farmer name<input name="farmer" autoFocus required maxLength={80} placeholder="e.g. Wanjiku Njoroge" /></label>
            <div className="form-grid">
              <label>Crop<input name="crop" required maxLength={60} placeholder="e.g. Maize" /></label>
              <label>Date sold<input name="date" type="date" required defaultValue={localDate()} /></label>
            </div>
            <div className="form-grid">
              <label>Quantity (kg)<input name="quantityKg" type="number" min="0.1" step="0.1" required placeholder="0" /></label>
              <label>Price per kg (KES)<input name="pricePerKg" type="number" min="0.01" step="0.01" required placeholder="0" /></label>
            </div>
            <p className="form-note">The sale value will be added to the cash book as income.</p>
          </>}
          {mode === 'stock' && <>
            <label>Crop<input name="crop" autoFocus required maxLength={60} placeholder="e.g. Maize" /></label>
            <label>Storage location<input name="location" required maxLength={80} placeholder="e.g. Main store" /></label>
            <label>Quantity change (kg)<input name="quantityChange" type="number" step="0.1" required placeholder="e.g. 250 or -40" /></label>
            <p className="form-note">Use a positive number for produce received and a negative number for dispatch. Stock cannot go below zero.</p>
          </>}
          {mode === 'ledger' && <>
            <label>Entry type<select name="type" defaultValue="expense"><option value="expense">Expense</option><option value="income">Other income</option></select></label>
            <label>Description<input name="description" autoFocus required maxLength={120} placeholder="e.g. Transport to market" /></label>
            <div className="form-grid">
              <label>Amount (KES)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0" /></label>
              <label>Date<input name="date" type="date" required defaultValue={localDate()} /></label>
            </div>
          </>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Save record</button></div>
        </form>
      </section>
    </div>
  )
}

export default App
