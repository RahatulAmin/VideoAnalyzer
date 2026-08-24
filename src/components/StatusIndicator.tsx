import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react'
import type { DataStatus } from '../types'

const labels: Record<DataStatus, string> = {
  saved: 'All observations saved',
  saving: 'Saving securely…',
  'sync-needed': 'Excel synchronization needed',
  error: 'Saved locally · Excel sync failed',
}

export function StatusIndicator({ status, onRetry }: { status: DataStatus; onRetry?: () => void }) {
  const Icon = status === 'saved' ? CheckCircle2 : status === 'saving' ? LoaderCircle : AlertTriangle
  return (
    <button className={`status status--${status}`} onClick={onRetry} disabled={!onRetry || status === 'saving'} title={onRetry ? 'Retry Excel synchronization' : undefined}>
      <Icon size={15} className={status === 'saving' ? 'spin' : ''} />
      <span>{labels[status]}</span>
    </button>
  )
}
