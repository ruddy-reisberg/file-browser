import { directoryHandleToEntries } from './tree'
import type { FileEntry } from './types'

export interface PickedDirectory {
  rootName: string
  entries: FileEntry[]
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Opens the native directory picker (File System Access API) read-only
 * and returns a flat list of file entries. Throws if the user cancels.
 */
export async function pickDirectory(): Promise<PickedDirectory> {
  if (!window.showDirectoryPicker) {
    throw new Error('Directory picker is not supported in this browser.')
  }
  const handle = await window.showDirectoryPicker({ mode: 'read' })
  const entries = await directoryHandleToEntries(handle)
  return { rootName: handle.name, entries }
}
