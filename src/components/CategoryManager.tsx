import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Category } from '../types'

export function CategoryManager({ categories, onChange, onClose }: { categories: Category[]; onChange: (categories: Category[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(categories.map((category) => ({ ...category })))
  const [newLabel, setNewLabel] = useState('')
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= draft.length) return
    const next = [...draft]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraft(next)
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="category-title">
      <div className="modal-header"><div><span className="eyebrow">Workspace settings</span><h2 id="category-title">Manage categories</h2></div><button className="icon-button" onClick={onClose}><X /></button></div>
      <p>Rename, reorder, or hide reactions. Existing observations are not changed.</p>
      <div className="category-settings">
        {draft.map((category, index) => <div className="category-setting" key={category.id}>
          <input type="checkbox" checked={category.enabled} onChange={(event) => setDraft(draft.map((item) => item.id === category.id ? { ...item, enabled: event.target.checked } : item))} aria-label={`Enable ${category.label}`} />
          <input value={category.label} onChange={(event) => setDraft(draft.map((item) => item.id === category.id ? { ...item, label: event.target.value } : item))} />
          <button disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp /></button><button disabled={index === draft.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown /></button>
        </div>)}
      </div>
      <div className="add-category"><input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="New category name" /><button disabled={!newLabel.trim()} onClick={() => { setDraft([...draft, { id: crypto.randomUUID(), label: newLabel.trim(), enabled: true }]); setNewLabel('') }}><Plus /> Add</button></div>
      <div className="modal-actions"><button className="button button--quiet" onClick={onClose}>Cancel</button><button className="button button--primary" onClick={() => { onChange(draft.filter((item) => item.label.trim()).map((item) => ({ ...item, label: item.label.trim() }))); onClose() }}>Save changes</button></div>
    </section>
  </div>
}
