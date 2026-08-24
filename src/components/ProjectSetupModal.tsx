import { ArrowLeft, ArrowRight, FilePlus2, Plus, Save, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DEFAULT_CATEGORIES } from '../config/categories'
import type { CodingGroup, ProjectTemplate } from '../types'

function copyGroups(groups: CodingGroup[]): CodingGroup[] {
  return groups.map((group) => ({ ...group, id: crypto.randomUUID(), items: group.items.map((item) => ({ ...item, id: crypto.randomUUID() })) }))
}

function snapshot(name: string, groups: CodingGroup[]) {
  return JSON.stringify({ name: name.trim(), groups })
}

export function defaultCodingGroups(): CodingGroup[] {
  return [
    { id: crypto.randomUUID(), label: 'Observables', kind: 'observable', selection: 'multiple', items: DEFAULT_CATEGORIES.map((item) => ({ ...item, id: crypto.randomUUID() })) },
    { id: crypto.randomUUID(), label: 'Demographics', kind: 'demographic', selection: 'single', items: ['Male', 'Female', 'Other'].map((label) => ({ id: crypto.randomUUID(), label, enabled: true })) },
  ]
}

interface Props {
  projectName: string
  templates: ProjectTemplate[]
  creating: boolean
  onClose: () => void
  onCreate: (groups: CodingGroup[], connectExcel: boolean) => Promise<void>
  onSaveTemplate: (templateId: string | undefined, name: string, groups: CodingGroup[]) => Promise<ProjectTemplate>
  onDeleteTemplate: (template: ProjectTemplate) => Promise<void>
}

export function ProjectSetupModal({ projectName, templates, creating, onClose, onCreate, onSaveTemplate, onDeleteTemplate }: Props) {
  const [screen, setScreen] = useState<'templates' | 'editor'>('templates')
  const [groups, setGroups] = useState<CodingGroup[]>([])
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>()
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [newGroup, setNewGroup] = useState('')
  const [newItems, setNewItems] = useState<Record<string, string>>({})
  const observableCount = useMemo(() => groups.filter((group) => group.kind === 'observable').flatMap((group) => group.items).filter((item) => item.enabled && item.label.trim()).length, [groups])
  const demographicCount = useMemo(() => groups.filter((group) => group.kind === 'demographic').flatMap((group) => group.items).filter((item) => item.enabled && item.label.trim()).length, [groups])
  const dirty = screen === 'editor' && snapshot(templateName, groups) !== savedSnapshot
  const updateGroup = (id: string, update: (group: CodingGroup) => CodingGroup) => setGroups((current) => current.map((group) => group.id === id ? update(group) : group))

  const openNewTemplate = () => {
    const nextGroups = defaultCodingGroups()
    setGroups(nextGroups); setTemplateName(''); setSelectedTemplateId(undefined); setNewItems({}); setSavedSnapshot('__new_unsaved_template__'); setScreen('editor')
  }
  const openTemplate = (template: ProjectTemplate) => {
    const nextGroups = copyGroups(template.groups)
    setGroups(nextGroups); setTemplateName(template.name); setSelectedTemplateId(template.id); setNewItems({}); setSavedSnapshot(snapshot(template.name, nextGroups)); setScreen('editor')
  }
  const confirmDiscard = () => !dirty || window.confirm('You have unsaved template changes. Click Cancel, then use “Save changes” to keep them. Click OK to continue and lose the changes.')
  const close = () => { if (confirmDiscard()) onClose() }
  const back = () => { if (confirmDiscard()) setScreen('templates') }
  const save = async () => {
    if (!templateName.trim() || !observableCount || !demographicCount) return
    setSavingTemplate(true)
    try {
      const saved = await onSaveTemplate(selectedTemplateId, templateName.trim(), groups)
      setSelectedTemplateId(saved.id); setTemplateName(saved.name); setSavedSnapshot(snapshot(saved.name, groups))
    } finally { setSavingTemplate(false) }
  }
  const create = async (connectExcel: boolean) => {
    if (!confirmDiscard()) return
    await onCreate(groups, connectExcel)
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className={`modal ${screen === 'editor' ? 'setup-modal' : 'template-list-modal'}`} role="dialog" aria-modal="true" aria-labelledby="setup-title">
      {screen === 'templates' ? <>
        <div className="modal-header"><div><span className="eyebrow">New project · {projectName}</span><h2 id="setup-title">Choose an analysis template</h2></div><button className="icon-button" onClick={close} aria-label="Close"><X /></button></div>
        {templates.length ? <>
          <p>Open a saved template to review its items before creating the project.</p>
          <div className="template-list">
            {templates.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((template) => {
              const selected = template.groups.flatMap((group) => group.items).filter((item) => item.enabled).length
              return <div className="template-list__row" key={template.id}><button className="template-list__open" onClick={() => openTemplate(template)}><span><strong>{template.name}</strong><small>{selected} selected items · Updated {new Date(template.updatedAt).toLocaleDateString()}</small></span><ArrowRight /></button><button className="template-list__delete" aria-label={`Delete ${template.name}`} onClick={() => { if (window.confirm(`Delete the “${template.name}” template?`)) void onDeleteTemplate(template) }}><Trash2 /></button></div>
            })}
          </div>
          <button className="button button--quiet make-template-button" onClick={openNewTemplate}><FilePlus2 /> Make a new analysis template</button>
        </> : <div className="template-empty"><FilePlus2 /><h3>No analysis templates yet</h3><p>Create one by choosing the observables, demographics, categories, and items you need.</p><button className="button button--primary" onClick={openNewTemplate}>Make a new analysis template</button></div>}
      </> : <>
        <div className="modal-header"><div className="editor-title"><button className="icon-button" onClick={back} aria-label="Back to templates"><ArrowLeft /></button><div><span className="eyebrow">Analysis template</span><h2 id="setup-title">{selectedTemplateId ? `Edit ${templateName}` : 'Make a new template'}</h2></div></div><button className="icon-button" onClick={close} aria-label="Close"><X /></button></div>
        <p>Choose the fields your coders will use, then save the template before creating the project.</p>
        {dirty && <div className="unsaved-banner"><span><strong>Unsaved changes</strong>Your edits will be lost unless you save them.</span><button className="button button--primary" disabled={!templateName.trim() || !observableCount || !demographicCount || savingTemplate} onClick={() => void save()}><Save /> {selectedTemplateId ? 'Save changes' : 'Save template'}</button></div>}
        <label className="template-name-field">Template name<input autoFocus value={templateName} placeholder="e.g. Hallway study template" onChange={(event) => setTemplateName(event.target.value)} /></label>

        <div className="setup-groups">
          {groups.map((group) => <section className="setup-group" key={group.id}>
            <div className="setup-group__heading"><input value={group.label} aria-label="Category name" onChange={(event) => updateGroup(group.id, (item) => ({ ...item, label: event.target.value }))} /><span>{group.kind === 'demographic' ? 'Choose one' : 'Select all that apply'}</span>{groups.length > 1 && <button onClick={() => setGroups((current) => current.filter((item) => item.id !== group.id))} aria-label={`Remove ${group.label}`}><Trash2 /></button>}</div>
            <div className="setup-items">
              {group.items.map((item) => <label key={item.id}><input type="checkbox" checked={item.enabled} onChange={(event) => updateGroup(group.id, (entry) => ({ ...entry, items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, enabled: event.target.checked } : candidate) }))} /><input value={item.label} aria-label="Item name" onChange={(event) => updateGroup(group.id, (entry) => ({ ...entry, items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, label: event.target.value } : candidate) }))} /><button onClick={() => updateGroup(group.id, (entry) => ({ ...entry, items: entry.items.filter((candidate) => candidate.id !== item.id) }))} aria-label={`Remove ${item.label}`}><X /></button></label>)}
            </div>
            <div className="setup-add-item"><input value={newItems[group.id] ?? ''} placeholder={`Add item to ${group.label}`} onChange={(event) => setNewItems((current) => ({ ...current, [group.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const label = (newItems[group.id] ?? '').trim(); if (label) { updateGroup(group.id, (entry) => ({ ...entry, items: [...entry.items, { id: crypto.randomUUID(), label, enabled: true }] })); setNewItems((current) => ({ ...current, [group.id]: '' })) } } }} /><button onClick={() => { const label = (newItems[group.id] ?? '').trim(); if (label) { updateGroup(group.id, (entry) => ({ ...entry, items: [...entry.items, { id: crypto.randomUUID(), label, enabled: true }] })); setNewItems((current) => ({ ...current, [group.id]: '' })) } }}><Plus /> Add item</button></div>
          </section>)}
        </div>

        <div className="add-setup-group"><input value={newGroup} placeholder="New category name" onChange={(event) => setNewGroup(event.target.value)} /><button disabled={!newGroup.trim()} onClick={() => { setGroups((current) => [...current, { id: crypto.randomUUID(), label: newGroup.trim(), kind: 'observable', selection: 'multiple', items: [] }]); setNewGroup('') }}><Plus /> Add category</button></div>
        {(!observableCount || !demographicCount) && <p className="setup-warning">Select at least one observable and one demographic item.</p>}
        <div className="modal-actions setup-actions"><button className="button button--quiet" onClick={back}>Back</button><button className="button button--quiet" disabled={!observableCount || !demographicCount || creating} onClick={() => void create(false)}>Create locally</button><button className="button button--primary" disabled={!observableCount || !demographicCount || creating} onClick={() => void create(true)}>Create + connect Excel</button></div>
      </>}
    </section>
  </div>
}
