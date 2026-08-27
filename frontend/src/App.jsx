import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import SummaryCard from './components/SummaryCard'
import OrderTable from './components/OrderTable'
import { formatIndonesianDate } from './utils/format'
import { getPendingOrdersGrouped, syncTodayOrders } from './services/shopeeApi'
import notificationSoundUrl from './assets/orderan_gofodd.mp3'
import './styles.css'

const NEW_ORDER_HIGHLIGHT_MS = 60_000

const DEFAULT_SUMMARY = [
  { type: 'INSTANT', label: 'INSTANT', pendingCount: 0 },
  { type: 'SAMEDAY', label: 'SAMEDAY', pendingCount: 0 },
  { type: 'CARGO', label: 'CARGO', pendingCount: 0 },
  { type: 'REGULER', label: 'REGULER', pendingCount: 0 }
]

export default function App() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY)
  const [groupedOrders, setGroupedOrders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('priorityOrderSound') !== 'disabled')
  const [newOrderIds, setNewOrderIds] = useState([])
  const [highlightedOrderIds, setHighlightedOrderIds] = useState([])
  const soundEnabledRef = useRef(soundEnabled)
  const previousOrderIdsRef = useRef(new Set())
  const hasLoadedOrdersRef = useRef(false)
  const notificationAudioRef = useRef(null)
  const newOrderTimeoutRef = useRef(null)
  const highlightTimersRef = useRef(new Map())

  const todayLabel = useMemo(() => formatIndonesianDate(), [])

  async function loadDashboard() {
    try {
      setError('')
      setLoading(true)

      const groupedRes = await getPendingOrdersGrouped()

      setSummary(mergeSummary(buildSummaryFromGrouped(groupedRes)))
      setGroupedOrders(groupedRes)
      setLastUpdated(groupedRes?.lastUpdated || '')
      notifyForNewOrders(groupedRes)
    } catch (err) {
      setError(err.message || 'Gagal mengambil data dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    try {
      setError('')
      setSyncing(true)
      if (soundEnabled) {
        await unlockAudio()
      }
      await syncTodayOrders()
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Gagal sync order Shopee')
    } finally {
      setSyncing(false)
    }
  }

  async function handleToggleSound() {
    const nextEnabled = !soundEnabled

    if (nextEnabled) {
      const unlocked = await unlockAudio()
      if (!unlocked) {
        setError('Browser memblokir suara. Klik tombol suara sekali lagi atau cek izin audio browser.')
        return
      }
    }

    localStorage.setItem('priorityOrderSound', nextEnabled ? 'enabled' : 'disabled')
    soundEnabledRef.current = nextEnabled
    setSoundEnabled(nextEnabled)
  }

  function notifyForNewOrders(groupedRes) {
    const nextOrderIds = getVisibleOrderIds(groupedRes)

    if (!hasLoadedOrdersRef.current) {
      previousOrderIdsRef.current = nextOrderIds
      hasLoadedOrdersRef.current = true
      return
    }

    const previousOrderIds = previousOrderIdsRef.current
    const newOrders = [...nextOrderIds].filter((orderId) => !previousOrderIds.has(orderId))
    const hasNewOrder = newOrders.length > 0

    previousOrderIdsRef.current = nextOrderIds

    if (hasNewOrder) {
      // Clear existing timeout if any
      if (newOrderTimeoutRef.current) {
        clearTimeout(newOrderTimeoutRef.current)
      }

      // Show new order IDs
      setNewOrderIds(newOrders)

      // Auto-clear after 5 seconds
      newOrderTimeoutRef.current = setTimeout(() => {
        setNewOrderIds([])
      }, 5000)

      // Highlight the rows green for 1 minute, each order on its own timer
      setHighlightedOrderIds((current) => [...new Set([...current, ...newOrders])])

      newOrders.forEach((orderId) => {
        const runningTimer = highlightTimersRef.current.get(orderId)
        if (runningTimer) {
          clearTimeout(runningTimer)
        }

        const timer = setTimeout(() => {
          highlightTimersRef.current.delete(orderId)
          setHighlightedOrderIds((current) => current.filter((id) => id !== orderId))
        }, NEW_ORDER_HIGHLIGHT_MS)

        highlightTimersRef.current.set(orderId, timer)
      })

      if (soundEnabledRef.current) {
        playOrderNotificationSound()
      }
    }
  }

  async function unlockAudio() {
    try {
      const audio = getNotificationAudio()
      const previousVolume = audio.volume

      audio.volume = 0
      await audio.play()
      audio.pause()
      audio.currentTime = 0
      audio.volume = previousVolume

      return true
    } catch {
      return false
    }
  }

  function getNotificationAudio() {
    if (!notificationAudioRef.current) {
      notificationAudioRef.current = new Audio(notificationSoundUrl)
      notificationAudioRef.current.preload = 'auto'
    }

    return notificationAudioRef.current
  }

  async function playOrderNotificationSound() {
    try {
      const audio = getNotificationAudio()

      audio.pause()
      audio.currentTime = 0
      audio.volume = 1

      await audio.play()
    } catch (err) {
      console.log('Gagal memutar suara notifikasi.', err)
      setError('Gagal memutar suara notifikasi di browser ini.')
    }
  }

  useEffect(() => {
    loadDashboard()
    const timer = setInterval(loadDashboard, 60_000)
    
    return () => {
      clearInterval(timer)
      if (newOrderTimeoutRef.current) {
        clearTimeout(newOrderTimeoutRef.current)
      }
      highlightTimersRef.current.forEach((timer) => clearTimeout(timer))
      highlightTimersRef.current.clear()
    }
  }, [])

  const fastOrders = groupedOrders?.tables?.fastDelivery?.orders || []
  const standardOrders = groupedOrders?.tables?.standardDelivery?.orders || []
  const highlightedOrderIdSet = useMemo(() => new Set(highlightedOrderIds), [highlightedOrderIds])

  return (
    <main className="dashboard">
      {/* <header className="page-header">
        <div>
          <h1>Monitoring Pesanan Shopee</h1>
          <p><CalendarDays size={18} /> {todayLabel}</p>
        </div>

        <button className="refresh-button" onClick={handleSync} disabled={syncing || loading}>
          <RefreshCw size={18} className={syncing ? 'spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Shopee'}
        </button>
      </header> */}

      {error && <div className="alert-error">{error}</div>}

      {newOrderIds.length > 0 && (
        <div className="alert-new-order">
          🎉 Pesanan baru: <strong>{newOrderIds.join(', ')}</strong>
        </div>
      )}

      <section className="summary-grid">
        {summary.map((item) => (
          <SummaryCard key={item.type} {...item} />
        ))}
      </section>

      <div className="monitoring-line">
        <span className="live-dot" /> Live Monitoring
        <button
          className={`sound-toggle ${soundEnabled ? 'sound-toggle--on' : ''}`}
          type="button"
          onClick={handleToggleSound}
          title={soundEnabled ? 'Matikan suara notifikasi' : 'Aktifkan suara notifikasi'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {soundEnabled ? 'Suara aktif' : 'Aktifkan suara'}
        </button>
        {soundEnabled && (
          <button
            className="test-play-button"
            type="button"
            onClick={playOrderNotificationSound}
            title="Coba putar suara notifikasi"
          >
            🔊 Test Play
          </button>
        )}
        <div className="last-updated-container">
          {loading && <span className="loading-dot"></span>}
          {lastUpdated && <span className="last-updated">Update: {lastUpdated}</span>}
        </div>
      </div>

      <section className="tables-grid">
        <OrderTable
          title="Priority Orders (Instant & Sameday)"
          tone="priority"
          orders={fastOrders}
          highlightedOrderIds={highlightedOrderIdSet}
        />
        <OrderTable
          title="Standard Orders (Cargo & Reguler)"
          tone="standard"
          orders={standardOrders}
          highlightedOrderIds={highlightedOrderIdSet}
        />
      </section>
    </main>
  )
}

function mergeSummary(apiSummary) {
  const map = new Map(apiSummary.map((item) => [item.type, item]))
  return DEFAULT_SUMMARY.map((item) => ({
    ...item,
    ...map.get(item.type),
    label: map.get(item.type)?.label || item.label
  }))
}

function getVisibleOrderIds(groupedRes) {
  const fastOrders = groupedRes?.tables?.fastDelivery?.orders || []
  const standardOrders = groupedRes?.tables?.standardDelivery?.orders || []
  const visibleOrders = [...fastOrders, ...standardOrders]

  return new Set(visibleOrders.map((order) => order.orderNo).filter(Boolean))
}

function buildSummaryFromGrouped(groupedRes) {
  const fastOrders = groupedRes?.tables?.fastDelivery?.orders || []
  const standardOrders = groupedRes?.tables?.standardDelivery?.orders || []
  const countMap = [...fastOrders, ...standardOrders].reduce((acc, order) => {
    acc[order.shippingType] = (acc[order.shippingType] || 0) + 1
    return acc
  }, {})

  return DEFAULT_SUMMARY.map((item) => ({
    type: item.type,
    pendingCount: countMap[item.type] || 0
  }))
}
