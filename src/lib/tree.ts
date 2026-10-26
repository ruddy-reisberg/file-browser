import type { FileEntry, TreeNode } from './types'

/**
 * Build a Finder-style tree from a flat list of file entries.
 * Pure and synchronous; no DOM/browser dependency beyond the File objects
 * already attached to each entry.
 */
export function buildTree(rootName: string, entries: FileEntry[]): TreeNode {
  const root: TreeNode = { name: rootName, kind: 'dir', path: '', children: [] }

  for (const entry of entries) {
    if (entry.path.length === 0) continue
    insert(root, entry.path, entry.file)
  }

  sortTree(root)
  return root
}

function insert(dir: TreeNode, segments: string[], file: File): void {
  const [head, ...rest] = segments
  if (!dir.children) dir.children = []

  if (rest.length === 0) {
    dir.children.push({
      name: head,
      kind: 'file',
      path: joinPath(dir.path, head),
      file,
    })
    return
  }

  let child = dir.children.find((c) => c.kind === 'dir' && c.name === head)
  if (!child) {
    child = { name: head, kind: 'dir', path: joinPath(dir.path, head), children: [] }
    dir.children.push(child)
  }
  insert(child, rest, file)
}

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name
}

function sortTree(node: TreeNode): void {
  if (!node.children) return
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  for (const child of node.children) sortTree(child)
}

/**
 * Recursively walk a FileSystemDirectoryHandle (File System Access API)
 * and collect flat FileEntry[] with paths relative to that handle.
 */
export async function directoryHandleToEntries(
  dirHandle: FileSystemDirectoryHandle,
): Promise<FileEntry[]> {
  const entries: FileEntry[] = []
  await walk(dirHandle, [])
  return entries

  async function walk(handle: FileSystemDirectoryHandle, prefix: string[]): Promise<void> {
    for await (const [name, child] of handle.entries()) {
      if (child.kind === 'file') {
        const file = await child.getFile()
        entries.push({ path: [...prefix, name], file })
      } else {
        await walk(child, [...prefix, name])
      }
    }
  }
}
