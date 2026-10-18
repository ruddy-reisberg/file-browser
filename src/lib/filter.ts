import type { TreeNode } from './types'

/** Case-insensitive "contains" match on a file or folder name. An empty query matches everything. */
export function matchesName(name: string, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return needle === '' || name.toLowerCase().includes(needle)
}

/**
 * Keeps the files whose name matches `query`, plus the folders that lead to
 * them. A folder whose own name matches is kept whole. Returns the same node
 * when nothing needs to be dropped, so memoised views stay stable.
 */
export function filterTree(node: TreeNode, query: string): TreeNode {
  if (query.trim() === '' || node.kind !== 'dir') return node
  const children = (node.children ?? []).flatMap((child) => {
    if (child.kind === 'file') return matchesName(child.name, query) ? [child] : []
    if (matchesName(child.name, query)) return [child]
    const pruned = filterTree(child, query)
    return pruned.children && pruned.children.length > 0 ? [pruned] : []
  })
  return { ...node, children }
}

/** Number of files in the tree, at any depth. */
export function countFiles(node: TreeNode): number {
  if (node.kind === 'file') return 1
  return (node.children ?? []).reduce((total, child) => total + countFiles(child), 0)
}
