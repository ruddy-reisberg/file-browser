import { useState } from 'react'
import type { TreeNode } from '../lib/types'
import './Tree.css'

interface TreeProps {
  root: TreeNode
  selectedPath: string | null
  onSelect: (node: TreeNode) => void
}

export default function Tree({ root, selectedPath, onSelect }: TreeProps) {
  return (
    <ul className="tree" role="tree" aria-label="Folder contents">
      {root.children?.map((child) => (
        <TreeItem key={child.path} node={child} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </ul>
  )
}

interface TreeItemProps {
  node: TreeNode
  depth: number
  selectedPath: string | null
  onSelect: (node: TreeNode) => void
}

function TreeItem({ node, depth, selectedPath, onSelect }: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0)
  const isDir = node.kind === 'dir'
  const isSelected = node.path === selectedPath

  function handleClick() {
    onSelect(node)
    if (isDir) setExpanded((prev) => !prev)
  }

  return (
    <li role="treeitem" aria-expanded={isDir ? expanded : undefined} aria-selected={isSelected}>
      <button
        type="button"
        className={`tree-row${isSelected ? ' tree-row--selected' : ''}`}
        style={{ paddingLeft: `calc(var(--space-3) + ${depth} * var(--space-5))` }}
        onClick={handleClick}
      >
        <span className="tree-row__icon" aria-hidden="true">
          {isDir ? (expanded ? '▾' : '▸') : '·'}
        </span>
        <span className="tree-row__name">{node.name}</span>
      </button>
      {isDir && expanded && node.children && node.children.length > 0 && (
        <ul className="tree" role="group">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
