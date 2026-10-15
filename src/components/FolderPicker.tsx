import { useRef, type ChangeEvent } from 'react'
import { fileListToEntries } from '../lib/tree'
import { pickDirectory, supportsDirectoryPicker } from '../lib/picker'
import type { FileEntry } from '../lib/types'
import './FolderPicker.css'

interface Props {
  onPicked: (rootName: string, entries: FileEntry[]) => void
  onError: (message: string) => void
  disabled?: boolean
}

export default function FolderPicker({ onPicked, onError, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleClick() {
    if (supportsDirectoryPicker()) {
      try {
        const { rootName, entries } = await pickDirectory()
        onPicked(rootName, entries)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        onError(err instanceof Error ? err.message : 'Could not read that folder.')
      }
      return
    }
    inputRef.current?.click()
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return
    const entries = fileListToEntries(fileList)
    const rootName = entries[0]?.path[0] ?? 'Folder'
    // fileListToEntries already strips the root segment to align with the
    // File System Access API path shape, so re-derive it here from the raw list.
    const firstRelPath = (fileList[0] as File & { webkitRelativePath?: string })
      .webkitRelativePath
    const derivedRoot = firstRelPath ? firstRelPath.split('/')[0] : rootName
    onPicked(derivedRoot, entries)
    event.target.value = ''
  }

  return (
    <div className="folder-picker">
      <button type="button" className="folder-picker__button" onClick={handleClick} disabled={disabled}>
        Choose folder…
      </button>
      <input
        ref={inputRef}
        type="file"
        className="folder-picker__input"
        // @ts-expect-error - webkitdirectory is non-standard but widely supported
        webkitdirectory="true"
        multiple
        onChange={handleInputChange}
      />
    </div>
  )
}
