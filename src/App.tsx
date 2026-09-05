import { useCallback, useEffect, useRef, useState } from 'react'
import { Database, Download, FileSpreadsheet, HelpCircle, MoreHorizontal, Settings2 } from 'lucide-react'
import { DEFAULT_CATEGORIES, upgradeLegacyDefaultCategories } from './config/categories'
import { CategoryManager } from './components/CategoryManager'
import { ObservationForm } from './components/ObservationForm'
import { ObservationHistory } from './components/ObservationHistory'
import { ProjectManager } from './components/ProjectManager'
import { defaultCodingGroups } from './components/ProjectSetupModal'
import { StatusIndicator } from './components/StatusIndicator'
import { VideoPlayer } from './components/VideoPlayer'
import { dbService } from './services/indexedDb'
import { excelService } from './services/excel'
import { chooseDesktopVideo, isDesktopApp } from './services/desktop'
import type { AnalysisProject, Category, CodingGroup, DataStatus, Observation, ProjectTemplate, WorkbookTarget } from './types'
import { formatDateCoded, formatTimestamp } from './utils/time'

function editableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'))
}

export default function App() {
  const [projects, setProjects] = useState<AnalysisProject[]>([])
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [project, setProject] = useState<AnalysisProject | null>(null)
  const [observations, setObservations] = useState<Observation[]>([])
  const [videoFile, setVideoFile] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [reactions, setReactions] = useState<string[]>([])
  const [gender, setGender] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [status, setStatus] = useState<DataStatus>('saved')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [manageCategories, setManageCategories] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showDataMenu, setShowDataMenu] = useState(false)
  const [newestFirst, setNewestFirst] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const saveLock = useRef(false)
  const reviewRows = observations
    .filter((item) => !videoFile || item.videoFile === videoFile)
    .slice()
    .sort((a, b) => newestFirst ? b.eventId - a.eventId : a.eventId - b.eventId)
  const editingIndex = editingId ? reviewRows.findIndex((item) => item.id === editingId) : -1

  const beginEditing = useCallback((item: Observation) => {
    if (videoRef.current && item.videoFile === videoFile) videoRef.current.currentTime = item.timestampSeconds
    setEditingId(item.id)
    setReactions(item.reaction.split(', ').filter(Boolean))
    setGender(item.gender || '')
    setNotes(item.notes)
  }, [videoFile])

  const cancelEditing = useCallback(() => {
    setEditingId(null); setReactions([]); setGender(''); setNotes('')
  }, [])

  const moveEditing = useCallback((direction: -1 | 1) => {
    if (editingIndex < 0) return
    const item = reviewRows[editingIndex + direction]
    if (item) beginEditing(item)
  }, [beginEditing, editingIndex, reviewRows])

  useEffect(() => { void Promise.all([dbService.getProjects(), dbService.getTemplates()]).then(([savedProjects, savedTemplates]) => { setProjects(savedProjects); setTemplates(savedTemplates) }) }, [])
  useEffect(() => () => { if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl) }, [videoUrl])
  useEffect(() => {
    if (!project && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
      setVideoFile('')
      setVideoUrl('')
    }
  }, [project])

  const openProject = useCallback(async (nextProject: AnalysisProject) => {
    const categories = upgradeLegacyDefaultCategories(nextProject.categories)
    const codingGroups = nextProject.codingGroups ?? [
      { id: crypto.randomUUID(), label: 'Observables', kind: 'observable' as const, selection: 'multiple' as const, items: categories },
      defaultCodingGroups()[1],
    ]
    const openedProject = categories === nextProject.categories && nextProject.codingGroups
      ? nextProject
      : { ...nextProject, categories, codingGroups, updatedAt: new Date().toISOString() }
    if (openedProject !== nextProject) await dbService.saveProject(openedProject)
    setProject(openedProject)
    setProjects((items) => items.map((item) => item.id === openedProject.id ? openedProject : item))
    setObservations(await dbService.getObservations(openedProject.id))
    setStatus(openedProject.workbookHandle || openedProject.workbookPath ? 'saved' : 'sync-needed')
    setVideoFile('')
    setCurrentTime(0)
  }, [])

  const createProject = async (name: string, connectExcel: boolean, groups: CodingGroup[]) => {
    let target: WorkbookTarget | undefined
    if (connectExcel && excelService.supported) {
      try { target = await excelService.chooseNewWorkbook(name) } catch (error) { if ((error as DOMException).name !== 'AbortError') throw error }
    }
    const now = new Date().toISOString()
    const codingGroups = groups.map((group) => ({ ...group, id: crypto.randomUUID(), items: group.items.map((item) => ({ ...item, id: crypto.randomUUID() })) }))
    const categories = codingGroups.filter((group) => group.kind === 'observable').flatMap((group) => group.items)
    const next: AnalysisProject = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, categories, codingGroups, nextEventId: 1, nextPersonNumber: 1, workbookName: target ? excelService.targetName(target) : undefined, workbookHandle: typeof target === 'string' ? undefined : target, workbookPath: typeof target === 'string' ? target : undefined }
    await dbService.saveProject(next)
    if (target) await excelService.sync(target, [])
    setProjects((current) => [...current, next])
    await openProject(next)
  }

  const saveTemplate = async (templateId: string | undefined, name: string, groups: CodingGroup[]) => {
    const existing = templates.find((item) => item.id === templateId) ?? templates.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    const now = new Date().toISOString()
    const template: ProjectTemplate = { id: existing?.id ?? crypto.randomUUID(), name, createdAt: existing?.createdAt ?? now, updatedAt: now, groups: groups.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item })) })) }
    await dbService.saveTemplate(template)
    setTemplates((current) => existing ? current.map((item) => item.id === template.id ? template : item) : [...current, template])
    return template
  }

  const deleteTemplate = async (template: ProjectTemplate) => {
    await dbService.deleteTemplate(template.id)
    setTemplates((current) => current.filter((item) => item.id !== template.id))
  }

  const importExcel = async (file: File, target?: WorkbookTarget) => {
    const imported = await excelService.importFile(file)
    const now = new Date().toISOString()
    const highestEvent = imported.observations.reduce((max, item) => Math.max(max, item.eventId), 0)
    const highestPerson = imported.observations.reduce((max, item) => { const match = /^P(\d+)$/i.exec(item.personId); return match ? Math.max(max, Number(match[1])) : max }, 0)
    const next: AnalysisProject = { id: crypto.randomUUID(), name: file.name.replace(/\.xlsx$/i, ''), createdAt: now, updatedAt: now, categories: DEFAULT_CATEGORIES.map((item) => ({ ...item, id: crypto.randomUUID() })), nextEventId: highestEvent + 1, nextPersonNumber: highestPerson + 1, workbookName: imported.workbookName, workbookHandle: typeof target === 'string' ? undefined : target, workbookPath: typeof target === 'string' ? target : undefined }
    const rows: Observation[] = imported.observations.map((item) => ({ ...item, id: crypto.randomUUID(), projectId: next.id }))
    await dbService.saveProject(next)
    await dbService.saveObservations(rows)
    setProjects((current) => [...current, next])
    setProject(next); setObservations(rows)
    if (!target) { setStatus('sync-needed'); return }
    setStatus('saving')
    try {
      await excelService.sync(target, rows)
      setStatus('saved')
    } catch (error) {
      setStatus((error as DOMException).name === 'AbortError' ? 'sync-needed' : 'error')
    }
  }

  const chooseAndImportExcel = async () => {
    try {
      const source = await excelService.chooseWorkbookToImport()
      if (source) await importExcel(source.file, source.target)
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') throw error
    }
  }

  const deleteProject = async (item: AnalysisProject) => {
    if (!confirm(`Delete “${item.name}” and its locally saved observations? This cannot be undone.`)) return
    await dbService.deleteProject(item.id)
    setProjects((current) => current.filter((entry) => entry.id !== item.id))
  }

  const syncExcel = useCallback(async (rows = observations, activeProject = project) => {
    if (!activeProject) return false
    let target: WorkbookTarget | undefined = activeProject.workbookPath ?? activeProject.workbookHandle
    try {
      if (!target) target = await excelService.chooseNewWorkbook(activeProject.name)
      if (!target) { setStatus('sync-needed'); return false }
      await excelService.sync(target, rows)
      if (target !== activeProject.workbookHandle && target !== activeProject.workbookPath) {
        const updated = { ...activeProject, workbookHandle: typeof target === 'string' ? undefined : target, workbookPath: typeof target === 'string' ? target : undefined, workbookName: excelService.targetName(target), updatedAt: new Date().toISOString() }
        await dbService.saveProject(updated); setProject(updated); setProjects((items) => items.map((item) => item.id === updated.id ? updated : item))
      }
      setStatus('saved'); return true
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setStatus('error')
      else setStatus('sync-needed')
      return false
    }
  }, [observations, project])

  const saveObservation = useCallback(async () => {
    if (!project || !videoFile || !reactions.length || !gender || saveLock.current) return
    saveLock.current = true; setSaving(true); setStatus('saving')
    const timestampSeconds = Number((videoRef.current?.currentTime ?? currentTime).toFixed(3))
    const existing = editingId ? observations.find((item) => item.id === editingId) : undefined
    const nextReviewItem = existing && editingIndex >= 0 ? reviewRows[editingIndex + 1] : undefined
    const highestPersonId = observations.reduce((max, entry) => {
      const match = /^P(\d+)$/i.exec(entry.personId || '')
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    const nextEventId = Math.max(project.nextEventId ?? 1, Math.max(0, ...observations.map((entry) => entry.eventId)) + 1)
    const nextPersonNumber = Math.max(project.nextPersonNumber ?? 1, highestPersonId + 1)
    const assigningPerson = !existing?.personId
    const item: Observation = {
      id: existing?.id ?? crypto.randomUUID(), projectId: project.id, personId: existing?.personId || `P${String(nextPersonNumber).padStart(3, '0')}`,
      eventId: existing?.eventId ?? nextEventId,
      videoFile: videoFile || existing?.videoFile || 'No video selected', timestamp: formatTimestamp(timestampSeconds), timestampSeconds,
      reaction: reactions.join(', '), gender, notes: notes.trim(), dateCoded: formatDateCoded(),
    }
    try {
      const updatedProject = {
        ...project,
        nextEventId: existing ? nextEventId : nextEventId + 1,
        nextPersonNumber: assigningPerson ? nextPersonNumber + 1 : nextPersonNumber,
        updatedAt: new Date().toISOString(),
      }
      await dbService.saveObservationWithProject(item, updatedProject)
      const next = existing ? observations.map((entry) => entry.id === item.id ? item : entry) : [...observations, item]
      setProject(updatedProject)
      setProjects((items) => items.map((entry) => entry.id === updatedProject.id ? updatedProject : entry))
      setObservations(next)
      if (nextReviewItem) beginEditing(nextReviewItem)
      else cancelEditing()
      setToast(existing ? 'Observation updated' : 'Observation saved locally')
      window.setTimeout(() => setToast(''), 2600)
      await syncExcel(next, updatedProject)
    } finally { setSaving(false); window.setTimeout(() => { saveLock.current = false }, 500) }
  }, [project, reactions, gender, currentTime, editingId, observations, videoFile, notes, syncExcel, editingIndex, reviewRows, beginEditing, cancelEditing])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const saveShortcut = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 's' || event.key === 'Enter')
      if (saveShortcut) { event.preventDefault(); if (reactions.length && gender) void saveObservation(); return }
      if (event.key === 'Escape' && editingId) { event.preventDefault(); cancelEditing(); return }
      if (editableTarget(event.target)) return
      if (event.code === 'Space') { event.preventDefault(); const video = videoRef.current; if (video?.src) video.paused ? void video.play() : video.pause() }
      if (editingId && event.key === 'ArrowUp') { event.preventDefault(); moveEditing(-1) }
      if (editingId && event.key === 'ArrowDown') { event.preventDefault(); moveEditing(1) }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const direction = event.key === 'ArrowRight' ? 1 : -1; const video = videoRef.current; if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + direction * (event.shiftKey ? 5 : 2))) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [reactions, gender, saveObservation, editingId, cancelEditing, moveEditing])

  if (!project) return <ProjectManager projects={projects} templates={templates} onNew={createProject} onSaveTemplate={saveTemplate} onDeleteTemplate={deleteTemplate} onOpen={(item) => void openProject(item)} connectedImportSupported={excelService.connectedImportSupported} onChooseConnectedImport={chooseAndImportExcel} onImport={importExcel} onDelete={(item) => void deleteProject(item)} />

  const visibleRows = observations.filter((item) => !videoFile || item.videoFile === videoFile)
  const lastCoded = visibleRows.slice().sort((a, b) => b.eventId - a.eventId)[0]
  const selectVideo = (file: File) => { if (videoUrl) URL.revokeObjectURL(videoUrl); const url = URL.createObjectURL(file); setVideoUrl(url); setVideoFile(file.name); if (videoRef.current) { videoRef.current.src = url; videoRef.current.load() } }
  const chooseVideo = async () => {
    const selected = await chooseDesktopVideo()
    if (!selected) return false
    setVideoUrl(selected.url); setVideoFile(selected.name)
    if (videoRef.current) { videoRef.current.src = selected.url; videoRef.current.load() }
    return true
  }
  const updateCategories = async (categories: Category[]) => {
    const observableGroups = project.codingGroups?.filter((group) => group.kind === 'observable') ?? []
    const knownIds = new Set(observableGroups.flatMap((group) => group.items.map((item) => item.id)))
    const byId = new Map(categories.map((item) => [item.id, item]))
    const firstObservableId = observableGroups[0]?.id
    const codingGroups = project.codingGroups?.map((group) => group.kind !== 'observable' ? group : { ...group, items: group.items.map((item) => byId.get(item.id)).filter((item): item is Category => Boolean(item)) }) ?? []
    const added = categories.filter((item) => !knownIds.has(item.id))
    if (added.length && firstObservableId) codingGroups.forEach((group) => { if (group.id === firstObservableId) group.items.push(...added) })
    const updated = { ...project, categories, codingGroups, updatedAt: new Date().toISOString() }; await dbService.saveProject(updated); setProject(updated); setProjects((items) => items.map((item) => item.id === updated.id ? updated : item))
  }
  const removeObservation = async (item: Observation) => {
    if (!confirm(`Delete event #${item.eventId} at ${item.timestamp}?`)) return
    setStatus('saving'); await dbService.deleteObservation(item.id); const next = observations.filter((entry) => entry.id !== item.id); setObservations(next); if (editingId === item.id) { setEditingId(null); setReactions([]); setGender(''); setNotes('') }; setToast('Observation deleted locally'); await syncExcel(next, project)
  }
  const toggleReaction = (reaction: string) => setReactions((current) => current.includes(reaction) ? current.filter((item) => item !== reaction) : [...current, reaction])

  return <div className="app-shell">
    <header className="app-header">
      <button className="brand" onClick={() => setProject(null)} title="Switch analysis"><span className="brand-mark">BL</span><div><strong>BehaviorLab</strong><span>Video Coder</span></div></button>
      <div className="analysis-summary"><div><span>Current analysis</span><strong>{project.name}</strong></div><i /><div><span>Current video</span><strong>{videoFile || 'Not selected'}</strong></div><i /><div><span>Observations</span><strong>{visibleRows.length}</strong></div><i /><div><span>Last coded</span><strong>{lastCoded?.timestamp || '—'}</strong></div></div>
      <div className="header-actions"><StatusIndicator status={status} onRetry={status === 'error' || status === 'sync-needed' ? () => void syncExcel() : undefined} /><button className="icon-button" onClick={() => setShowShortcuts(!showShortcuts)} aria-label="Keyboard shortcuts"><HelpCircle /></button><button className="icon-button" onClick={() => setManageCategories(true)} aria-label="Manage categories"><Settings2 /></button><div className="menu-wrap"><button className="icon-button" onClick={() => setShowDataMenu(!showDataMenu)} aria-label="Data options"><MoreHorizontal /></button>{showDataMenu && <div className="data-menu"><button onClick={() => { excelService.download(observations, `${project.name.replace(/[^a-z0-9-_]+/gi, '_')}_observations.xlsx`); setShowDataMenu(false) }}><Download /> Export Excel copy</button><button onClick={() => { void syncExcel(); setShowDataMenu(false) }}><FileSpreadsheet /> Rebuild Excel from saved observations</button><button onClick={() => setProject(null)}><Database /> Switch analysis</button></div>}</div></div>
    </header>
    {showShortcuts && <div className="shortcut-bar"><span><kbd>Space</kbd> Play / pause</span><span><kbd>Ctrl S</kbd> Save</span><span><kbd>Ctrl ↵</kbd> Update & next</span><span><kbd>↑</kbd><kbd>↓</kbd> Review previous / next</span><span><kbd>Esc</kbd> Stop editing</span><span><kbd>←</kbd><kbd>→</kbd> Seek 2 sec</span><button onClick={() => setShowShortcuts(false)}>Close</button></div>}
    <main className="workspace">
      <VideoPlayer videoRef={videoRef} videoFile={videoFile} onVideoSelected={selectVideo} onChooseVideo={isDesktopApp() ? chooseVideo : undefined} currentTime={currentTime} duration={duration} onTimeUpdate={(time, nextDuration) => { setCurrentTime(time); if (Number.isFinite(nextDuration)) setDuration(nextDuration) }} />
      <aside className="coding-panel">
        <ObservationForm timestamp={currentTime} categories={project.categories} codingGroups={project.codingGroups} selectedReactions={reactions} selectedGender={gender} notes={notes} saving={saving} editing={Boolean(editingId)} editingEventId={editingIndex >= 0 ? reviewRows[editingIndex].eventId : undefined} canMovePrevious={editingIndex > 0} canMoveNext={editingIndex >= 0 && editingIndex < reviewRows.length - 1} canSave={Boolean(videoFile)} onToggleReaction={toggleReaction} onGender={setGender} onNotes={setNotes} onSave={() => void saveObservation()} onCancelEdit={cancelEditing} onMovePrevious={() => moveEditing(-1)} onMoveNext={() => moveEditing(1)} />
        <ObservationHistory observations={observations} currentVideo={videoFile} editingId={editingId} newestFirst={newestFirst} onToggleSort={() => setNewestFirst(!newestFirst)} onEdit={beginEditing} onDelete={(item) => void removeObservation(item)} />
      </aside>
    </main>
    {toast && <div className="toast">✓ {toast}</div>}
    {manageCategories && <CategoryManager categories={project.categories} onChange={(categories) => void updateCategories(categories)} onClose={() => setManageCategories(false)} />}
  </div>
}
