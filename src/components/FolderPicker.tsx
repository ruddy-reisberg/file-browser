import { pickDirectory, supportsDirectoryPicker } from '../lib/picker'
import type { FileEntry } from '../lib/types'
import './FolderPicker.css'

interface Props {
  onPicked: (rootName: string, entries: FileEntry[]) => void
  onError: (message: string) => void
  disabled?: boolean
}

export default function FolderPicker({ onPicked, onError, disabled }: Props) {
  // No fallback: without the File System Access API the app cannot open a folder read-only.
  if (!supportsDirectoryPicker()) {
    return (
      <p className="folder-picker__unsupported" role="status">
        Opening a folder is not supported in this browser. Use Chrome or Edge.
      </p>
    )
  }

  async function handleClick() {
    try {
      const { rootName, entries } = await pickDirectory()
      onPicked(rootName, entries)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      onError(err instanceof Error ? err.message : 'Could not read that folder.')
    }
  }

  return (
    <div className="folder-picker">
      <button type="button" className="folder-picker__button" onClick={handleClick} disabled={disabled}>
        Choose folder…
      </button>
    </div>
  )
}
