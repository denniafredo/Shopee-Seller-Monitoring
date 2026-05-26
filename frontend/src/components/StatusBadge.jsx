import { getStatusLabel } from '../utils/format'

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${String(status || '').toLowerCase()}`}>{getStatusLabel(status)}</span>
}
