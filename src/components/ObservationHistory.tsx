import { Edit3, Trash2 } from 'lucide-react'
import type { Observation } from '../types'

interface Props {
  observations: Observation[]
  currentVideo: string
  editingId: string | null
  newestFirst: boolean
  onToggleSort: () => void
  onEdit: (observation: Observation) => void
  onDelete: (observation: Observation) => void
}

export function ObservationHistory({ observations, currentVideo, editingId, newestFirst, onToggleSort, onEdit, onDelete }: Props) {
  const filtered = observations
    .filter((item) => !currentVideo || item.videoFile === currentVideo)
    .sort((a, b) => newestFirst ? b.eventId - a.eventId : a.eventId - b.eventId)
  return (
    <section className="history">
      <div className="history-header"><div><span className="eyebrow">Current video</span><h2>Observation history <em>{filtered.length}</em></h2></div><button onClick={onToggleSort}>{newestFirst ? 'Newest first' : 'Oldest first'}</button></div>
      {!filtered.length ? (
        <div className="history-empty"><p>No observations yet</p><span>Saved events for this video will appear here.</span></div>
      ) : (
        <div className="history-list">
          {filtered.map((item) => <article className={`history-row${editingId === item.id ? ' history-row--editing' : ''}`} key={item.id} ref={editingId === item.id ? (element) => element?.scrollIntoView({ block: 'nearest' }) : undefined}>
            <button className="history-main" onClick={() => onEdit(item)} title="Edit this observation">
              <span className="event-number"><b>#{item.eventId}</b><i>{item.personId || '—'}</i></span><strong>{item.timestamp}</strong><span className="reaction-pill" title={item.reaction}>{item.reaction}</span><span className="gender-pill">{item.gender || '—'}</span><p>{item.notes || '—'}</p>
            </button>
            <div className="row-actions"><button aria-label={`Edit event ${item.eventId}`} onClick={() => onEdit(item)}><Edit3 /></button><button className="danger" aria-label={`Delete event ${item.eventId}`} onClick={() => onDelete(item)}><Trash2 /></button></div>
          </article>)}
        </div>
      )}
    </section>
  )
}
