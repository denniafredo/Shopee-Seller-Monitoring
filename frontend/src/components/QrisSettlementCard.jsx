import { QrCode } from 'lucide-react'
import { formatRupiah } from '../utils/format'

export default function QrisSettlementCard({ total = 0, count = 0, loading = false, onOpen }) {
  return (
    <section
      className="summary-card qris-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      title="Buka detail settlement QRIS"
    >
      <div className="qris-card__body">
        <div className="qris-card__head">
          <span className="qris-card__title">QRIS SETTLEMENT</span>
          <span className="qris-card__badge">{count} Trx</span>
        </div>
        <h2 className="qris-card__amount">{loading ? '…' : formatRupiah(total)}</h2>
        <span className="qris-card__caption">🏦 Buka Mutasi (Pop-up)</span>
      </div>
      <div className="qris-card__icon">
        <QrCode size={26} strokeWidth={2.2} />
      </div>
    </section>
  )
}
