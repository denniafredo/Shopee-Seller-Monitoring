const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`)
  }

  return data
}

export async function getDashboardSummary() {
  return request('/api/shopee/orders/dashboard-summary')
}

export async function getPendingOrdersGrouped() {
  try {
    return await request('/api/shopee/orders/pending/grouped')
  } catch (error) {
    const raw = await request('/api/shopee/orders/pending')
    return groupOrdersFallback(raw)
  }
}

export async function syncTodayOrders() {
  return request('/api/shopee/sync-orders', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

function groupOrdersFallback(raw) {
  const orders = raw.orders || []
  const fastTypes = ['INSTANT', 'SAMEDAY']
  const standardTypes = ['CARGO', 'REGULER']

  const fastDeliveryOrders = orders.filter((order) => fastTypes.includes(order.shippingType))
  const standardDeliveryOrders = orders.filter((order) => standardTypes.includes(order.shippingType))

  return {
    date: raw.date,
    lastUpdated: raw.lastUpdated,
    total: raw.total || orders.length,
    tables: {
      fastDelivery: {
        label: 'Priority Orders (Instant & Sameday)',
        shippingTypes: fastTypes,
        total: fastDeliveryOrders.length,
        orders: fastDeliveryOrders
      },
      standardDelivery: {
        label: 'Standard Orders (Cargo & Reguler)',
        shippingTypes: standardTypes,
        total: standardDeliveryOrders.length,
        orders: standardDeliveryOrders
      }
    }
  }
}
