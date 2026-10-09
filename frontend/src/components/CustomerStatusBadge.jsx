import { CircleAlert, TriangleAlert, UserRoundCheck, UserRoundPlus } from 'lucide-react'
import { formatShortDate, formatTimeAgo } from '../utils/format'

export default function CustomerStatusBadge({ customer }) {
  if (!customer) return null

  const { status, previousOrderCount, returnCount, lastReturn, historySince } = customer
  const since = historySince ? ` (data sejak ${formatShortDate(historySince)})` : ''

  if (status === 'PERNAH_RETUR') {
    const isRepeat = returnCount > 1
    const timeAgo = formatTimeAgo(lastReturn?.createdAt)
    const detail = [isRepeat && timeAgo ? `terakhir ${timeAgo}` : timeAgo, lastReturn?.reasonLabel]
      .filter(Boolean)
      .join(' · ')
    const title = [
      `Pernah retur ${returnCount}x${previousOrderCount ? ` dari ${previousOrderCount}x order sebelumnya` : ''}${since}`,
      lastReturn?.reasonText && `Alasan pembeli: "${lastReturn.reasonText}"`,
      lastReturn?.orderSn && `Order retur terakhir: ${lastReturn.orderSn}`
    ]
      .filter(Boolean)
      .join('\n')

    return (
      <Badge
        tone={isRepeat ? 'danger' : 'warning'}
        icon={isRepeat ? CircleAlert : TriangleAlert}
        title={title}
        detail={detail}
      >
        Pernah Retur ({returnCount}x)
      </Badge>
    )
  }

  if (status === 'PELANGGAN_LAMA') {
    const orderCount = previousOrderCount + 1 // including this order

    return (
      <Badge tone="clean" icon={UserRoundCheck} title={`Order ke-${orderCount} dari pembeli ini, belum pernah retur${since}`}>
        Pelanggan Lama ({orderCount}x order)
      </Badge>
    )
  }

  if (status === 'PELANGGAN_BARU') {
    return (
      <Badge tone="new" icon={UserRoundPlus} title={`Belum pernah order sebelumnya${since}`}>
        Pelanggan Baru
      </Badge>
    )
  }

  return null
}

// Built from <div>s on purpose: `.order-cell--number span/strong` styles would otherwise restyle them.
function Badge({ tone, icon: Icon, title, detail, children }) {
  return (
    <div className={`customer-status customer-status--${tone}`} title={title}>
      <Icon size={14} />
      <div>
        <div>{children}</div>
        {detail && <div className="customer-status__detail">{detail}</div>}
      </div>
    </div>
  )
}
