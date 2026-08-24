import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { dbService } from './indexedDb'
import { excelService } from './excel'
import type { AnalysisProject, Observation, ProjectTemplate } from '../types'

const project: AnalysisProject = {
  id: 'project-test',
  name: 'Integrity test',
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
  categories: [],
}

const event: Observation = {
  id: 'event-test',
  projectId: project.id,
  eventId: 27,
  personId: 'P001',
  videoFile: 'hallway_condition_eyes_03.mp4',
  timestamp: '00:14:32.450',
  timestampSeconds: 872.45,
  reaction: 'Glances, Smiles / laughs',
  gender: 'Female',
  notes: 'Person moved toward opposite wall',
  dateCoded: '2026-08-11 14:42:10',
}

describe('local-first data integrity', () => {
  it('saves, opens, and deletes a reusable project template', async () => {
    const template: ProjectTemplate = {
      id: 'template-test', name: 'Hallway coding', createdAt: '2026-08-11T00:00:00.000Z', updatedAt: '2026-08-11T00:00:00.000Z',
      groups: [{ id: 'observables', label: 'Observables', kind: 'observable', selection: 'multiple', items: [{ id: 'glances', label: 'Glances', enabled: true }] }],
    }
    await dbService.saveTemplate(template)
    expect(await dbService.getTemplates()).toContainEqual(template)
    await dbService.deleteTemplate(template.id)
    expect(await dbService.getTemplates()).not.toContainEqual(template)
  })

  it('persists multiple reactions on one person record, then edits and deletes it', async () => {
    await dbService.saveProject(project)
    await dbService.saveObservation(event)
    expect(await dbService.getObservations(project.id)).toEqual([event])
    expect((await dbService.getObservations(project.id))[0].reaction).toBe('Glances, Smiles / laughs')

    const edited = { ...event, reaction: 'Glances, Stops', notes: 'Edited note' }
    await dbService.saveObservation(edited)
    expect(await dbService.getObservations(project.id)).toEqual([edited])

    await dbService.deleteObservation(event.id)
    expect(await dbService.getObservations(project.id)).toEqual([])
  })

  it('writes one correctly structured Excel row', async () => {
    let output: ArrayBuffer | undefined
    const handle = {
      name: 'observations.xlsx',
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      createWritable: async () => ({ write: async (data: ArrayBuffer) => { output = data }, close: async () => undefined }),
    } as unknown as FileSystemFileHandle

    await excelService.sync(handle, [event])
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(output!)
    const sheet = workbook.getWorksheet('Observations')!
    expect(sheet.rowCount).toBe(2)
    expect(sheet.getRow(2).values).toEqual([, 27, event.personId, event.videoFile, event.timestamp, 872.45, event.reaction, event.gender, event.notes, event.dateCoded])
  })

  it('keeps the IndexedDB copy when Excel synchronization fails', async () => {
    await dbService.saveObservation(event)
    const failingHandle = {
      name: 'locked.xlsx',
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      createWritable: async () => { throw new Error('Workbook unavailable') },
    } as unknown as FileSystemFileHandle

    await expect(excelService.sync(failingHandle, [event])).rejects.toThrow('Workbook unavailable')
    expect(await dbService.getObservations(project.id)).toEqual([event])
  })
})
