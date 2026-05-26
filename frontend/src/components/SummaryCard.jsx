import { Zap, Truck, Package, Bike } from 'lucide-react'

const ICONS = {
  INSTANT: Zap,
  SAMEDAY: Bike,
  CARGO: Truck,
  REGULER: Package
}

export default function SummaryCard({ type, label, pendingCount = 0 }) {
  const Icon = ICONS[type] || Package
  const className = `summary-card summary-card--${String(type).toLowerCase()}`

  return (
    <section className={className}>
      <div>
        <p className="summary-card__label">{label || type}</p>
        <h2>{pendingCount}</h2>
        <p className="summary-card__caption">Orders Pending</p>
      </div>
      <div className="summary-card__icon">
        <Icon size={24} strokeWidth={2.2} />
      </div>
    </section>
  )
}
