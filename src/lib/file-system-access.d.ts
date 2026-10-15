/**
 * Minimal File System Access API typings not yet included in lib.dom.
 * Scoped to the read-only subset this app uses.
 */
interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file'
  getFile(): Promise<File>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory'
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}
