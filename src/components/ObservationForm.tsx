import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import type { Category, CodingGroup } from '../types'
import { formatTimestamp } from '../utils/time'

interface Props {
  timestamp: number
  categories: Category[]
  codingGroups?: CodingGroup[]
  selectedReactions: string[]
  selectedGender: string
  notes: string
  saving: boolean
  editing: boolean
  editingEventId?: number
  canMovePrevious?: boolean
  canMoveNext?: boolean
  canSave: boolean
  onToggleReaction: (reaction: string) => void
  onGender: (gender: string) => void
  onNotes: (notes: string) => void
  onSave: () => void
  onCancelEdit: () => void
  onMovePrevious?: () => void
  onMoveNext?: () => void
}

export function ObservationForm(props: Props) {
  const observableGroups = props.codingGroups?.filter((group) => group.kind === 'observable') ?? [{ id: 'legacy', label: 'Observed reactions', kind: 'observable' as const, selection: 'multiple' as const, items: props.categories }]
  const demographicItems = props.codingGroups?.filter((group) => group.kind === 'demographic').flatMap((group) => group.items).filter((item) => item.enabled) ?? ['Male', 'Female', 'Other'].map((label) => ({ id: label, label, enabled: true }))
  return (
    <section className="observation-form">
      <div className="section-heading">
        <div><span className="eyebrow">{props.editing ? `Reviewing event #${props.editingEventId}` : 'Live coding'}</span><h2>{props.editing ? 'Edit observation' : 'New observation'}</h2></div>
        <div className="captured-time"><span>Timestamp</span><strong>{formatTimestamp(props.timestamp)}</strong></div>
      </div>
      {observableGroups.map((group) => <div className="coding-group" key={group.id}><div className="selector-label"><span>{group.label}</span><small>Select all that apply</small></div>
      <div className="category-grid" aria-label={group.label}>
        {group.items.filter((category) => category.enabled).map((category, index) => (
          <button key={category.id} type="button" aria-pressed={props.selectedReactions.includes(category.label)} className={props.selectedReactions.includes(category.label) ? 'category-card selected' : 'category-card'} onClick={() => props.onToggleReaction(category.label)}>
            <span>{String(index + 1).padStart(2, '0')}</span>{category.label}
          </button>
        ))}
      </div></div>)}
      <fieldset className="gender-fieldset">
        <legend>{props.codingGroups?.find((group) => group.kind === 'demographic')?.label ?? 'Person gender'}</legend>
        <div className="gender-options" role="radiogroup" aria-label="Person gender">
          {demographicItems.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={props.selectedGender === item.label} className={props.selectedGender === item.label ? 'gender-option selected' : 'gender-option'} onClick={() => props.onGender(item.label)}>{item.label}</button>
          ))}
        </div>
      </fieldset>
      <label className="notes-label">Notes <span>optional</span>
        <textarea value={props.notes} onChange={(event) => props.onNotes(event.target.value)} placeholder="Optional notes about what happened..." rows={3} />
      </label>
      <div className="form-actions">
        {props.editing && <div className="review-navigation"><button className="button button--quiet" disabled={!props.canMovePrevious} onClick={props.onMovePrevious} title="Previous observation (Up arrow)"><ChevronLeft size={17} /> Previous</button><button className="button button--quiet" disabled={!props.canMoveNext} onClick={props.onMoveNext} title="Next observation (Down arrow)">Next <ChevronRight size={17} /></button></div>}
        {props.editing && <button className="button button--quiet" onClick={props.onCancelEdit}><X size={17} /> Cancel</button>}
        <button className="button button--save" disabled={!props.selectedReactions.length || !props.selectedGender || !props.canSave || props.saving} onClick={props.onSave} title={!props.canSave ? 'Select a video before saving an observation' : !props.selectedGender ? 'Select the person’s gender before saving' : undefined}>
          <Save size={19} />{props.saving ? 'Saving…' : props.editing && props.canMoveNext ? 'Update & next' : props.editing ? 'Update observation' : 'Save observation'}<kbd>{props.editing ? 'Ctrl ↵' : 'Ctrl S'}</kbd>
        </button>
      </div>
    </section>
  )
}
