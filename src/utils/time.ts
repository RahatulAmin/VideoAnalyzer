export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const wholeSeconds = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000)
  return [hours, minutes, wholeSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':') + `.${String(milliseconds).padStart(3, '0')}`
}

export function formatDateCoded(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function parseTimestamp(value: string): number {
  const [clock, millis = '0'] = value.split('.')
  const parts = clock.split(':').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0
  return parts[0] * 3600 + parts[1] * 60 + parts[2] + Number(`0.${millis}`)
}
