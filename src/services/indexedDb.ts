import type { AnalysisProject, Observation, ProjectTemplate } from '../types'

const DB_NAME = 'behaviorlab-video-coder'
const DB_VERSION = 2
const PROJECTS = 'projects'
const OBSERVATIONS = 'observations'
const TEMPLATES = 'templates'

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(OBSERVATIONS)) {
        const store = db.createObjectStore(OBSERVATIONS, { keyPath: 'id' })
        store.createIndex('projectId', 'projectId')
      }
      if (!db.objectStoreNames.contains(TEMPLATES)) db.createObjectStore(TEMPLATES, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

export const dbService = {
  async getTemplates(): Promise<ProjectTemplate[]> {
    const db = await openDatabase()
    return requestResult(db.transaction(TEMPLATES).objectStore(TEMPLATES).getAll())
  },

  async saveTemplate(template: ProjectTemplate): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(TEMPLATES, 'readwrite')
    tx.objectStore(TEMPLATES).put(template)
    await transactionDone(tx)
  },

  async deleteTemplate(id: string): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(TEMPLATES, 'readwrite')
    tx.objectStore(TEMPLATES).delete(id)
    await transactionDone(tx)
  },

  async getProjects(): Promise<AnalysisProject[]> {
    const db = await openDatabase()
    return requestResult(db.transaction(PROJECTS).objectStore(PROJECTS).getAll())
  },

  async saveProject(project: AnalysisProject): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(PROJECTS, 'readwrite')
    tx.objectStore(PROJECTS).put(project)
    await transactionDone(tx)
  },

  async deleteProject(projectId: string): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction([PROJECTS, OBSERVATIONS], 'readwrite')
    tx.objectStore(PROJECTS).delete(projectId)
    const index = tx.objectStore(OBSERVATIONS).index('projectId')
    const cursorRequest = index.openCursor(IDBKeyRange.only(projectId))
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    await transactionDone(tx)
  },

  async getObservations(projectId: string): Promise<Observation[]> {
    const db = await openDatabase()
    return requestResult(db.transaction(OBSERVATIONS).objectStore(OBSERVATIONS).index('projectId').getAll(projectId))
  },

  async saveObservation(observation: Observation): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(OBSERVATIONS, 'readwrite')
    tx.objectStore(OBSERVATIONS).put(observation)
    await transactionDone(tx)
  },

  async saveObservationWithProject(observation: Observation, project: AnalysisProject): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction([OBSERVATIONS, PROJECTS], 'readwrite')
    tx.objectStore(OBSERVATIONS).put(observation)
    tx.objectStore(PROJECTS).put(project)
    await transactionDone(tx)
  },

  async saveObservations(observations: Observation[]): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(OBSERVATIONS, 'readwrite')
    const store = tx.objectStore(OBSERVATIONS)
    observations.forEach((observation) => store.put(observation))
    await transactionDone(tx)
  },

  async deleteObservation(id: string): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(OBSERVATIONS, 'readwrite')
    tx.objectStore(OBSERVATIONS).delete(id)
    await transactionDone(tx)
  },
}
