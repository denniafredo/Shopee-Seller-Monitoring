import { OrderIcon, MoneyIcon } from './OrderIcons'
import ProductImage from './ProductImage'
import StatusBadge from './StatusBadge'
import { formatVariantText, getDisplayImage, normalizeTime } from '../utils/format'

export default function OrderTable({ title, tone = 'standard', orders = [], highlightedOrderIds }) {
  return (
    <section className={`order-panel order-panel--${tone}`}>
      <div className="order-panel__header">
        <h2>{title}</h2>
      </div>

      <div className="order-table">
        <div className="order-table__head">
          <span>No. Pesanan</span>
          <span>Nama Barang</span>
          <span>Qty</span>
          <span>Status</span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">Belum ada pesanan.</div>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.orderNo}
              order={order}
              tone={order.shippingType || tone}
              isNew={Boolean(highlightedOrderIds?.has(order.orderNo))}
            />
          ))
        )}
      </div>
    </section>
  )
}

function OrderRow({ order, tone, isNew = false }) {
  const items = order.items || []
  const shippingType = order.shippingType ? order.shippingType.toLowerCase() : tone

  return (
    <div className={`order-row order-row--${shippingType} ${isNew ? 'order-row--new' : ''}`}>
      <div className="order-cell order-cell--number">
        <strong>{order.orderNo}</strong>
        <span className="order-time" title="Jam pesanan masuk">
          <OrderIcon size={22} />
          {normalizeTime(order.orderTime)}
        </span>
        {order.payTime && (
          <span className="order-time order-time--paid" title="Jam pesanan dibayar">
            <MoneyIcon size={22} />
            {normalizeTime(order.payTime)}
          </span>
        )}
      </div>

      <div className="order-cell order-cell--items">
        {items.map((item, index) => {
          const maxNameLength = 40
          const needsMarquee = item.productName && item.productName.length > maxNameLength
          const displayName = item.productName
            ? item.productName.length > maxNameLength
              ? item.productName.slice(0, maxNameLength) + '....'
              : item.productName
            : ''

          return (
            <div className="item-row" key={`${order.orderNo}-${item.itemId || item.modelId || index}`}>
              <ProductImage src={getDisplayImage(item)} alt={item.productName} />
              <div className="item-row__details">
                <p className={`item-row__name ${needsMarquee ? 'is-truncated' : ''}`} title={item.productName}>
                  {displayName}
                </p>

                <p className="item-row__variant">{formatVariantText(item)}</p>
                {(item.modelSku || item.sku) && <p className="item-row__sku">SKU: {item.modelSku || item.sku}</p>}
              </div>
              <span className="item-row__qty">{item.qty}</span>
            </div>
          )
        })}
      </div>

      <div className="order-cell order-cell--qty" aria-hidden="true" />

      <div className="order-cell order-cell--status">
        <StatusBadge status={order.status} />
        {order.shippingDeadlineText && order.status === 'BARU' && <span className="deadline-text">{order.shippingDeadlineText}</span>}
      </div>
    </div>
  )
}
