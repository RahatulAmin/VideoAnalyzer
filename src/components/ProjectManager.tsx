import { useRef, useState } from 'react'
import { ArrowRight, FilePlus2, FolderOpen, ShieldCheck, Trash2 } from 'lucide-react'
import type { AnalysisProject, CodingGroup, ProjectTemplate, WorkbookTarget } from '../types'
import { ProjectSetupModal } from './ProjectSetupModal'

interface Props {
  projects: AnalysisProject[]
  templates: ProjectTemplate[]
  onNew: (name: string, connectExcel: boolean, groups: CodingGroup[]) => Promise<void>
  onSaveTemplate: (templateId: string | undefined, name: string, groups: CodingGroup[]) => Promise<ProjectTemplate>
  onDeleteTemplate: (template: ProjectTemplate) => Promise<void>
  onOpen: (project: AnalysisProject) => void
  connectedImportSupported: boolean
  onChooseConnectedImport: () => Promise<void>
  onImport: (file: File, target?: WorkbookTarget) => Promise<void>
  onDelete: (project: AnalysisProject) => void
}

export function ProjectManager({ projects, templates, onNew, onSaveTemplate, onDeleteTemplate, onOpen, connectedImportSupported, onChooseConnectedImport, onImport, onDelete }: Props) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const create = async (groups: CodingGroup[], connectExcel: boolean) => {
    if (!name.trim()) return
    setCreating(true)
    try { await onNew(name.trim(), connectExcel, groups) } finally { setCreating(false) }
  }
  return (
    <div className="project-gate">
      <main className="project-card">
        <div className="brand brand--gate"><span className="brand-mark">BL</span><div><strong>BehaviorLab</strong><span>Video Coder</span></div></div>
        <div className="gate-copy"><span className="eyebrow">HRI research workspace</span><h1>Continue your analysis with confidence.</h1><p>Observations are stored on this computer first, then synchronized to Excel.</p></div>
        <div className="gate-grid">
          <section className="new-project">
            <FilePlus2 />
            <h2>New analysis</h2>
            <p>Name the project, then choose its observables and demographics.</p>
            <label>Analysis name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hallway study · Condition A" onKeyDown={(event) => { if (event.key === 'Enter' && name.trim()) setShowSetup(true) }} /></label>
            <div className="new-actions"><button className="button button--primary" disabled={!name.trim() || creating} onClick={() => setShowSetup(true)}>Choose setup</button></div>
          </section>
          <section className="recent-projects">
            <div className="recent-title"><div><FolderOpen /><h2>Saved analyses</h2></div><button onClick={() => connectedImportSupported ? void onChooseConnectedImport() : importRef.current?.click()}>Import Excel</button></div>
            <input ref={importRef} className="sr-only" type="file" accept=".xlsx" onChange={(event) => event.target.files?.[0] && void onImport(event.target.files[0])} />
            <div className="project-list">
              {!projects.length && <div className="no-projects">No saved analyses on this browser yet.</div>}
              {projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => <div className="project-row" key={project.id}>
                <button className="project-open" onClick={() => onOpen(project)}><span><strong>{project.name}</strong><small>{project.workbookName || 'Local recovery copy only'}</small></span><ArrowRight /></button>
                <button className="project-delete" aria-label={`Delete ${project.name}`} onClick={() => onDelete(project)}><Trash2 /></button>
              </div>)}
            </div>
          </section>
        </div>
        <footer className="gate-footer"><ShieldCheck />Local-first · No uploads · IndexedDB crash recovery</footer>
      </main>
      {showSetup && <ProjectSetupModal projectName={name.trim()} templates={templates} creating={creating} onClose={() => setShowSetup(false)} onCreate={create} onSaveTemplate={onSaveTemplate} onDeleteTemplate={onDeleteTemplate} />}
    </div>
  )
}
