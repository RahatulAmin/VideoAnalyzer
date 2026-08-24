import type { ExcelImport, Observation, WorkbookTarget } from '../types'
import { parseTimestamp } from '../utils/time'
import { isDesktopApp } from './desktop'

const HEADERS = ['Event ID', 'Person ID', 'Video File', 'Timestamp', 'Timestamp Seconds', 'Reaction', 'Gender', 'Notes', 'Date Coded']

async function buildWorkbook(observations: Observation[]): Promise<import('exceljs').Workbook> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'BehaviorLab Video Coder'
  workbook.created = new Date()
  const worksheet = workbook.addWorksheet('Observations', { views: [{ state: 'frozen', ySplit: 1 }] })
  worksheet.addRow(HEADERS)
  observations.slice().sort((a, b) => a.eventId - b.eventId).forEach((item) => worksheet.addRow([
    item.eventId,
    item.personId,
    item.videoFile,
    item.timestamp,
    Number(item.timestampSeconds.toFixed(3)),
    item.reaction,
    item.gender,
    item.notes,
    item.dateCoded,
  ]))
  worksheet.columns = [10, 14, 30, 16, 19, 24, 14, 60, 22].map((width) => ({ width }))
  const header = worksheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087D6D' } }
  header.alignment = { vertical: 'middle' }
  header.height = 22
  worksheet.autoFilter = 'A1:I1'
  return workbook
}

async function workbookBytes(observations: Observation[]): Promise<ArrayBuffer> {
  const bytes = await (await buildWorkbook(observations)).xlsx.writeBuffer()
  return bytes as ArrayBuffer
}

async function writeHandle(handle: FileSystemFileHandle, observations: Observation[]) {
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission !== 'granted' && await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('Workbook permission was not granted')
  const writable = await handle.createWritable()
  await writable.write(await workbookBytes(observations))
  await writable.close()
}

async function writeDesktopPath(path: string, observations: Observation[]) {
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  await writeFile(path, new Uint8Array(await workbookBytes(observations)))
}

export const excelService = {
  supported: isDesktopApp() || typeof window !== 'undefined' && 'showSaveFilePicker' in window,

  async chooseNewWorkbook(suggestedName: string): Promise<WorkbookTarget | undefined> {
    if (isDesktopApp()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      return await save({
        defaultPath: `${suggestedName.replace(/[^a-z0-9-_]+/gi, '_')}_observations.xlsx`,
        filters: [{ name: 'Excel workbook', extensions: ['xlsx'] }],
      }) ?? undefined
    }
    if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) return undefined
    return window.showSaveFilePicker({
      suggestedName: `${suggestedName.replace(/[^a-z0-9-_]+/gi, '_')}_observations.xlsx`,
      types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
    })
  },

  targetName(target: WorkbookTarget): string {
    return typeof target === 'string' ? target.split(/[\\/]/).pop() ?? target : target.name
  },

  async sync(target: WorkbookTarget, observations: Observation[]): Promise<void> {
    if (typeof target === 'string') await writeDesktopPath(target, observations)
    else await writeHandle(target, observations)
  },

  async download(observations: Observation[], filename: string): Promise<void> {
    if (isDesktopApp()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const path = await save({ defaultPath: filename, filters: [{ name: 'Excel workbook', extensions: ['xlsx'] }] })
      if (path) await writeDesktopPath(path, observations)
      return
    }
    const blob = new Blob([await workbookBytes(observations)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },

  async importFile(file: File): Promise<ExcelImport> {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const sheet = workbook.worksheets[0]
    const headers = new Map<string, number>()
    sheet?.getRow(1).eachCell((cell, column) => headers.set(String(cell.value), column - 1))
    const rows: unknown[][] = []
    sheet?.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push((row.values as unknown[]).slice(1))
    })
    return {
      workbookName: file.name,
      observations: rows.map((row, index) => {
        const value = (header: string) => row[headers.get(header) ?? -1]
        const timestamp = String(value('Timestamp') ?? '00:00:00.000')
        return {
          eventId: Number(value('Event ID') ?? index + 1),
          personId: String(value('Person ID') ?? ''),
          videoFile: String(value('Video File') ?? ''),
          timestamp,
          timestampSeconds: Number(value('Timestamp Seconds') ?? parseTimestamp(timestamp)),
          reaction: String(value('Reaction') ?? 'Other'),
          gender: String(value('Gender') ?? ''),
          notes: String(value('Notes') ?? ''),
          dateCoded: String(value('Date Coded') ?? ''),
        }
      }),
    }
  },
}
