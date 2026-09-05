/// <reference types="vite/client" />

interface FileSystemHandlePermissionDescriptor { mode?: 'read' | 'readwrite' }
interface FileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}
interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}
interface Window {
  showOpenFilePicker(options?: unknown): Promise<FileSystemFileHandle[]>
  showSaveFilePicker(options?: unknown): Promise<FileSystemFileHandle>
}
