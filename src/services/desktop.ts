export function isDesktopApp() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function chooseDesktopVideo(): Promise<{ name: string; url: string } | undefined> {
  if (!isDesktopApp()) return undefined
  const [{ open }, { convertFileSrc }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/api/core'),
  ])
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'mov', 'm4v', 'avi'] }],
  })
  if (!path) return undefined
  return { name: path.split(/[\\/]/).pop() ?? path, url: convertFileSrc(path) }
}
