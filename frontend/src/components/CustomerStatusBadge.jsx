import { CircleAlert, CircleCheck, TriangleAlert, UserRoundPlus } from 'lucide-react'
import { formatShortDate, formatTimeAgo } from '../utils/format'

// Badges are <p> on purpose: `.order-cell--number span` styles would otherwise recolor them.
export default function CustomerStatusBadge({ customer }) {
  if (!customer) return null

  const { status, previousOrderCount, returnCount, lastReturn, historySince } = customer
  const since = historySince ? ` (data sejak ${formatShortDate(historySince)})` : ''

  if (status === 'PERNAH_RETUR') {
    const isRepeat = returnCount > 1
    const Icon = isRepeat ? CircleAlert : TriangleAlert
    const timeAgo = formatTimeAgo(lastReturn?.createdAt)
    const reason = lastReturn?.reasonLabel ? ` (${lastReturn.reasonLabel})` : ''
    const label = isRepeat
      ? `Retur ${returnCount}x${timeAgo ? `, terakhir ${timeAgo}` : ''}${reason}`
      : `Retur${timeAgo ? `: ${timeAgo}` : ''}${reason}`
    const title = [
      `Pernah retur ${returnCount}x${since}`,
      lastReturn?.reasonText && `Alasan pembeli: "${lastReturn.reasonText}"`,
      lastReturn?.orderSn && `Order retur terakhir: ${lastReturn.orderSn}`
    ]
      .filter(Boolean)
      .join('\n')

    return (
      <p className={`customer-status customer-status--${isRepeat ? 'danger' : 'warning'}`} title={title}>
        <Icon size={14} strokeWidth={2.4} />
        {label}
      </p>
    )
  }

  if (status === 'TIDAK_PERNAH_RETUR') {
    return (
      <p
        className="customer-status customer-status--clean"
        title={`Sudah ${previousOrderCount}x belanja, tidak pernah retur${since}`}
      >
        <CircleCheck size={14} />
        Tidak Pernah Retur
      </p>
    )
  }

  return (
    <p className="customer-status customer-status--new" title={`Belum ada pesanan lain${since}`}>
      <UserRoundPlus size={14} />
      Pelanggan Baru
    </p>
  )
}
