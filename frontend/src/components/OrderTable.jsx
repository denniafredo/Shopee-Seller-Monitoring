import ProductImage from './ProductImage'
import StatusBadge from './StatusBadge'
import { formatVariantText, getDisplayImage, normalizeTime } from '../utils/format'

export default function OrderTable({ title, tone = 'standard', orders = [] }) {
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
          orders.map((order) => <OrderRow key={order.orderNo} order={order} tone={order.shippingType || tone} />)
        )}
      </div>
    </section>
  )
}

function OrderRow({ order, tone }) {
  const items = order.items || []
  const shippingType = order.shippingType ? order.shippingType.toLowerCase() : tone
  
  return (
    <div className={`order-row order-row--${shippingType}`}>
      <div className="order-cell order-cell--number">
        <strong>{order.orderNo}</strong>
        <span>{normalizeTime(order.orderTime)}</span>
      </div>

      <div className="order-cell order-cell--items">
        {items.map((item, index) => (
          <div className="item-row" key={`${order.orderNo}-${item.itemId || item.modelId || index}`}>
            <ProductImage src={getDisplayImage(item)} alt={item.productName} />
            <div>
              <p className="item-row__name">{item.productName}</p>
              <p className="item-row__variant">{formatVariantText(item)}</p>
              {(item.modelSku || item.sku) && <p className="item-row__sku">SKU: {item.modelSku || item.sku}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="order-cell order-cell--qty">
        {items.map((item, index) => (
          <span key={`${order.orderNo}-qty-${index}`}>{item.qty}</span>
        ))}
      </div>

      <div className="order-cell order-cell--status">
        <StatusBadge status={order.status} />
        {order.shippingDeadlineText && order.status === 'BARU' && <span className="deadline-text">{order.shippingDeadlineText}</span>}
      </div>
    </div>
  )
}
