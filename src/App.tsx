import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Plus,
  ReceiptText,
  Search,
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
  recordFarmerIntake,
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
  { id: 'sales', label: 'Farmer intake', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'ledger', label: 'Cash book', icon: ReceiptText },
]

const sectionTitles: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'A clear view of your cooperative today.' },
  sales: { title: 'Farmer intake', description: 'Record produce received from cooperative members.' },
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
  const [query, setQuery] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const totals = ledgerTotals(data.ledger)
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

  useEffect(() => {
    if (modal !== null) return
    returnFocusRef.current?.focus()
    returnFocusRef.current = null
  }, [modal])

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
        const nextData = recordFarmerIntake(data, {
          farmer: readText(form, 'farmer'),
          crop: readText(form, 'crop'),
          quantityKg: readAmount(form, 'quantityKg'),
          pricePerKg: readAmount(form, 'pricePerKg'),
          soldAt: readText(form, 'date'),
          location: readText(form, 'location'),
        })
        if (!commit(nextData, 'Farmer intake recorded, stock updated, and payout added to the cash book.')) return
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
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setNotice('')
    setModalError('')
    setModal(mode)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection('overview') }}>
          <img className="brand-mark" src="/mavuno-icon.jpg" alt="" />
          <span className="brand-copy"><strong>Mavuno <span>Co-op</span></strong><small>NAKURU COUNTY</small></span>
        </a>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${section === id ? 'active' : ''}`}
              key={id}
              onClick={() => { setSection(id); setNotice(''); setQuery('') }}
              aria-current={section === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="cooperative-card">
            <span className="cooperative-icon"><MapPin size={17} /></span>
            <div><strong>Nakuru</strong><small>Farming cooperative</small></div>
          </div>
          <p className="sidebar-footnote">Private to this device · ready offline</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><img className="brand-mark" src="/mavuno-icon.jpg" alt="" /><strong>Mavuno Co-op</strong></div>
          <div className="topbar-status">
            <span className="local-records"><span className="status-dot" /> On-device records</span>
            <span className={`connection ${isOnline ? 'connected' : 'offline'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow"><MapPin size={12} /> NAKURU · COOPERATIVE RECORDS</p>
              <h1>{heading.title}</h1>
              <p className="page-description">{heading.description}</p>
            </div>
            <div className="heading-actions">
              {section === 'sales' && <button className="primary-button" disabled={!canWrite} onClick={() => openModal('sale')}><Plus size={17} /> Record intake</button>}
              {section === 'inventory' && <button className="primary-button" disabled={!canWrite} onClick={() => openModal('stock')}><Plus size={17} /> Adjust stock</button>}
              {section === 'ledger' && <button className="primary-button" disabled={!canWrite} onClick={() => openModal('ledger')}><Plus size={17} /> Add entry</button>}
            </div>
          </div>

          {notice && <div className={`notice ${canWrite ? 'notice-success' : 'notice-error'}`} role={canWrite ? 'status' : 'alert'}>{notice}</div>}

          {section === 'overview' && (
            <Overview
              data={data}
              stockValue={stockValue}
              income={totals.income}
              expenses={totals.expense}
              canWrite={canWrite}
              openModal={openModal}
              setSection={setSection}
            />
          )}
          {section === 'sales' && <SalesPage sales={data.sales} query={query} setQuery={setQuery} />}
          {section === 'inventory' && <InventoryPage inventory={data.inventory} query={query} setQuery={setQuery} />}
          {section === 'ledger' && <LedgerPage ledger={data.ledger} totals={totals} query={query} setQuery={setQuery} />}
          <footer className="page-footer"><span>Mavuno Cooperative Records</span><span>Amounts in Kenyan shillings · KES</span></footer>
        </main>
      </div>

      {modal && <RecordModal mode={modal} error={modalError} onClose={() => { setModal(null); setModalError('') }} onSubmit={submitRecord} />}
    </div>
  )
}

function Overview({
  data,
  stockValue,
  income,
  expenses,
  canWrite,
  openModal,
  setSection,
}: {
  data: CooperativeData
  stockValue: number
  income: number
  expenses: number
  canWrite: boolean
  openModal: (mode: ModalMode) => void
  setSection: (section: Section) => void
}) {
  const intakeValueToday = data.sales
    .filter((sale) => sale.soldAt === localDate())
    .reduce((sum, sale) => sum + sale.quantityKg * sale.pricePerKg, 0)
  const locations = Array.from(new Set(data.inventory.map((item) => item.location.trim()).filter(Boolean)))
  const locationTotals = locations
    .map((location) => ({
      location,
      quantityKg: data.inventory
        .filter((item) => item.location.toLowerCase() === location.toLowerCase())
        .reduce((sum, item) => sum + item.quantityKg, 0),
    }))
    .sort((a, b) => b.quantityKg - a.quantityKg)

  return (
    <>
      <section className="welcome-card">
        <div className="welcome-copy">
          <div className="welcome-tag"><span /> YOUR CO-OP, AT A GLANCE</div>
          <h2>A better harvest<br />starts together.</h2>
          <p>Keep farmer deliveries, crop stores, and cooperative finances in one simple place.</p>
          <button className="welcome-button" disabled={!canWrite} onClick={() => openModal('sale')}><Plus size={17} /> Record farmer intake</button>
        </div>
        <img className="welcome-art" src="/images/hero-harvest.jpg" alt="" />
      </section>

      <section className="metric-grid" aria-label="Cooperative totals">
        <Metric icon={CircleDollarSign} label="Farmer intake today" value={formatCurrency(intakeValueToday)} detail="Recorded farmer payouts today" tone="green" />
        <Metric icon={Boxes} label="Stock on hand" value={`${formatQuantity(stockValue)} kg`} detail={`${data.inventory.length} crop and store records`} tone="lime" />
        <Metric icon={ArrowDownLeft} label="Cash book balance" value={formatCurrency(income - expenses)} detail="Income less recorded expenses" tone="blue" />
        <Metric icon={MapPin} label="Storage locations" value={String(locations.length)} detail="Locations with recorded stock" tone="orange" />
      </section>

      <section className="quick-actions panel">
        <div className="panel-heading">
          <div><h2>Quick actions</h2><p>Common tasks, ready when you are</p></div>
        </div>
        <div className="quick-action-grid">
          <button className="quick-action" disabled={!canWrite} onClick={() => openModal('sale')}><span className="quick-action-icon sale-shortcut"><ClipboardList size={18} /></span><span><strong>Receive farmer produce</strong><small>Record intake and farmer payment</small></span><Plus size={17} /></button>
          <button className="quick-action" disabled={!canWrite} onClick={() => openModal('stock')}><span className="quick-action-icon stock-shortcut"><Boxes size={18} /></span><span><strong>Update crop stock</strong><small>Receive or dispatch produce</small></span><Plus size={17} /></button>
          <button className="quick-action" disabled={!canWrite} onClick={() => openModal('ledger')}><span className="quick-action-icon ledger-shortcut"><ReceiptText size={18} /></span><span><strong>Add cash entry</strong><small>Record income or expenses</small></span><Plus size={17} /></button>
        </div>
      </section>

      <div className="overview-lower">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div><h2>Recent farmer intake</h2><p>Your latest recorded member deliveries</p></div>
            <button className="text-button" onClick={() => setSection('sales')}>View intake <ArrowUpRight size={15} /></button>
          </div>
          {data.sales.length === 0
            ? <EmptyState icon={ClipboardList} title="No farmer deliveries yet" description="Record a member delivery to start building your cooperative's intake history." />
            : <SalesTable sales={data.sales.slice(0, 5)} />}
        </section>
        <section className="panel locations-panel">
          <div className="panel-heading">
            <div><h2>Stock by location</h2><p>Recorded quantities across your stores</p></div>
            <button className="text-button" onClick={() => setSection('inventory')}>Inventory <ArrowUpRight size={15} /></button>
          </div>
          {locationTotals.length === 0
            ? <EmptyState icon={MapPin} title="No stored produce yet" description="Add a stock record to see quantities by location." />
            : <div className="location-list">
              {locationTotals.slice(0, 4).map(({ location, quantityKg }, index) => (
                <div className="location-row" key={location}>
                  <span className={`location-mark location-mark-${index % 3}`}><MapPin size={15} /></span>
                  <span className="location-name">{location}</span>
                  <strong>{formatQuantity(quantityKg)} <small>kg</small></strong>
                </div>
              ))}
              <div className="location-total"><span>Total stock</span><strong>{formatQuantity(stockValue)} kg</strong></div>
            </div>}
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

function SalesPage({ sales, query, setQuery }: { sales: CooperativeData['sales']; query: string; setQuery: (query: string) => void }) {
  const filteredSales = sales.filter((sale) => `${sale.farmer} ${sale.crop} ${sale.location ?? ''} ${sale.soldAt}`.toLowerCase().includes(query.toLowerCase()))
  const value = totalSales(filteredSales)
  return (
    <section className="panel data-panel">
      <div className="panel-heading">
        <div><h2>Farmer intake register</h2><p>{filteredSales.length} of {sales.length} recorded {sales.length === 1 ? 'delivery' : 'deliveries'}</p></div>
        <div className="table-total"><small>Farmer payouts</small><strong>{formatCurrency(value)}</strong></div>
      </div>
      {sales.length === 0
        ? <EmptyState icon={ClipboardList} title="No farmer deliveries recorded" description="Use “Record intake” to log produce received and the farmer payout. The produce is added to stock." />
        : <>
          <SearchField value={query} onChange={setQuery} placeholder="Search member or crop" />
          {filteredSales.length > 0
            ? <SalesTable sales={filteredSales} />
            : <EmptyState icon={Search} title="No matching deliveries" description="Try another farmer, crop, or receiving store." />}
        </>}
    </section>
  )
}

function SalesTable({ sales }: { sales: CooperativeData['sales'] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Farmer</th><th>Crop</th><th>Receiving store</th><th>Quantity received</th><th>Price / kg</th><th>Date received</th><th className="align-right">Farmer payout</th></tr></thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td><span className="farmer-cell"><span className="avatar">{sale.farmer.trim().slice(0, 1).toUpperCase()}</span><strong>{sale.farmer}</strong></span></td>
              <td><span className="crop-name"><CropImage crop={sale.crop} /><span className="crop-pill">{sale.crop}</span></span></td>
              <td>{sale.location || '—'}</td>
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

function InventoryPage({ inventory, query, setQuery }: { inventory: CooperativeData['inventory']; query: string; setQuery: (query: string) => void }) {
  const filteredInventory = inventory.filter((item) => `${item.crop} ${item.location}`.toLowerCase().includes(query.toLowerCase()))
  const stock = totalStock(filteredInventory)
  return (
    <section className="panel data-panel">
      <div className="panel-heading">
        <div><h2>Stock register</h2><p>{filteredInventory.length} of {inventory.length} crop and storage records</p></div>
        <div className="table-total"><small>Total stock</small><strong>{formatQuantity(stock)} kg</strong></div>
      </div>
      {inventory.length === 0
        ? <EmptyState icon={Boxes} title="No stock on record" description="Adjust stock when produce is received or dispatched from a store." />
        : <>
          <SearchField value={query} onChange={setQuery} placeholder="Search crop or location" />
          {filteredInventory.length === 0
            ? <EmptyState icon={Search} title="No matching stock" description="Try another crop or storage location." />
            : <div className="table-wrap">
          <table>
            <thead><tr><th>Crop</th><th>Storage location</th><th className="align-right">Quantity on hand</th></tr></thead>
            <tbody>{filteredInventory.map((item) => (
              <tr key={item.id}>
                <td><span className="crop-name"><CropImage crop={item.crop} /><strong>{item.crop}</strong></span></td>
                <td>{item.location}</td>
                <td className="align-right amount-cell">{formatQuantity(item.quantityKg)} kg</td>
              </tr>
            ))}</tbody>
          </table>
            </div>}
          <p className="table-hint">Use a negative quantity to dispatch produce. Stock cannot be reduced below zero.</p>
        </>}
    </section>
  )
}

function LedgerPage({ ledger, totals, query, setQuery }: { ledger: CooperativeData['ledger']; totals: ReturnType<typeof ledgerTotals>; query: string; setQuery: (query: string) => void }) {
  const filteredLedger = ledger.filter((entry) => `${entry.description} ${entry.type} ${entry.recordedAt}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <div className="ledger-summary">
        <div><span>Total income</span><strong className="income-text">{formatCurrency(totals.income)}</strong></div>
        <div><span>Total expenses</span><strong className="expense-text">{formatCurrency(totals.expense)}</strong></div>
        <div><span>Balance</span><strong className={totals.income - totals.expense < 0 ? 'negative' : ''}>{formatCurrency(totals.income - totals.expense)}</strong></div>
      </div>
      <section className="panel data-panel">
        <div className="panel-heading"><div><h2>Cash book</h2><p>{filteredLedger.length} of {ledger.length} entries · farmer payouts are recorded automatically</p></div></div>
        {ledger.length > 0 && <SearchField value={query} onChange={setQuery} placeholder="Search description or type" />}
        {ledger.length === 0
          ? <EmptyState icon={ReceiptText} title="No cash entries yet" description="Record a farmer intake or add an income or expense to start your cash book." />
          : filteredLedger.length === 0
            ? <EmptyState icon={Search} title="No matching entries" description="Try another description or entry type." />
            : <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Description</th><th>Date</th><th className="align-right">Amount</th></tr></thead>
              <tbody>{filteredLedger.map((entry) => (
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

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="table-search">
      <Search size={16} aria-hidden="true" />
      <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && <button type="button" className="clear-search" onClick={() => onChange('')} aria-label="Clear search"><X size={15} /></button>}
    </label>
  )
}

function CropImage({ crop }: { crop: string }) {
  const normalized = crop.toLowerCase()
  const image = normalized.includes('bean') || normalized.includes('gram')
    ? 'beans-harvest'
    : normalized.includes('sorghum')
      ? 'sorghum-field'
      : normalized.includes('maize') || normalized.includes('corn')
        ? 'maize-farmer'
        : null
  if (!image) return null
  return <img className={`crop-image crop-image-${image}`} src={`/images/${image}.jpg`} alt="" loading="lazy" />
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
  const titles: Record<ModalMode, string> = { sale: 'Receive farmer produce', stock: 'Adjust inventory', ledger: 'Add cash book entry' }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><div><p className="eyebrow">COOPERATIVE RECORDS</p><h2 id="modal-title">{titles[mode]}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
        <form onSubmit={onSubmit}>
          {error && <p className="modal-error" role="alert">{error}</p>}
          {mode === 'sale' && <>
            <label>Farmer name<input name="farmer" autoFocus required maxLength={80} placeholder="e.g. Wanjiku Njoroge" /></label>
            <div className="form-grid">
              <label>Crop<input name="crop" required maxLength={60} placeholder="e.g. Maize" /></label>
              <label>Date received<input name="date" type="date" required defaultValue={localDate()} /></label>
            </div>
            <div className="form-grid">
              <label>Quantity (kg)<input name="quantityKg" type="number" min="0.1" step="0.1" required placeholder="0" /></label>
              <label>Farmer price per kg (KES)<input name="pricePerKg" type="number" min="0.01" step="0.01" required placeholder="0" /></label>
            </div>
            <label>Receiving store<input name="location" required maxLength={80} placeholder="e.g. Nakuru Main Store" /></label>
            <p className="form-note">The farmer payout is recorded as a cash-book expense and the produce is added to the selected store.</p>
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
