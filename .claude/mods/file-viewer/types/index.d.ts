export type Entry = { name: string; path: string; isDir: boolean; size: number }
export type Listing = { entries: Entry[]; error?: string }
export type Preview = {
  path: string
  size: number
  text?: string
  note?: string
}

declare module 'claude-code' {
  interface PluginState {
    'file-viewer': {
      dirs: Shaped<Record<string, Listing>>
      expanded: Shaped<string[]>
      preview: Shaped<Preview | null>
    }
  }
}
