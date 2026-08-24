export interface Category {
  id: string
  label: string
  enabled: boolean
}

export interface CodingGroup {
  id: string
  label: string
  kind: 'observable' | 'demographic'
  selection: 'single' | 'multiple'
  items: Category[]
}

export interface ProjectTemplate {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  groups: CodingGroup[]
}

export interface AnalysisProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  categories: Category[]
  codingGroups?: CodingGroup[]
  nextEventId?: number
  nextPersonNumber?: number
  workbookName?: string
  workbookHandle?: FileSystemFileHandle
  workbookPath?: string
}

export type WorkbookTarget = FileSystemFileHandle | string

export interface Observation {
  id: string
  projectId: string
  eventId: number
  personId: string
  videoFile: string
  timestamp: string
  timestampSeconds: number
  reaction: string
  gender: string
  notes: string
  dateCoded: string
}

export type DataStatus = 'saved' | 'saving' | 'sync-needed' | 'error'

export interface ExcelImport {
  observations: Omit<Observation, 'id' | 'projectId'>[]
  workbookName: string
}
