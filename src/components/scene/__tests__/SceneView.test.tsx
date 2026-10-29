import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SceneView from '../SceneView'
import type { TreeNode } from '../../../lib/types'

vi.mock('../SceneCanvas', () => import('./SceneCanvasDouble'))
vi.mock('../../DetailPane', () => ({
  default: ({ node }: { node: TreeNode | null }) => <div data-testid="detail">{node?.name}</div>,
}))

const aTxt: TreeNode = { name: 'a.txt', kind: 'file', path: 'docs/a.txt', file: new File(['x'], 'a.txt') }
const docs: TreeNode = { name: 'docs', kind: 'dir', path: 'docs', children: [aTxt] }
const root: TreeNode = { name: 'root', kind: 'dir', path: '', children: [docs] }

function renderView(initial: TreeNode | null = null) {
  const onSelect = vi.fn()
  let setSelectedFromOutside: (node: TreeNode | null) => void = () => {}
  function Harness() {
    const [selected, setSelected] = useState<TreeNode | null>(initial)
    setSelectedFromOutside = setSelected
    return (
      <SceneView
        root={root}
        selected={selected}
        onSelect={(node) => {
          onSelect(node)
          setSelected(node)
        }}
        query=""
        onQueryChange={() => {}}
      />
    )
  }
  render(<Harness />)
  return Object.assign(onSelect, { setSelected: (node: TreeNode | null) => setSelectedFromOutside(node) })
}

function openA() {
  fireEvent.click(screen.getByRole('button', { name: /^Climb docs/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Read a.txt' }))
}

describe('SceneView selection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('selects the file and shows the Leaf from the selected node', () => {
    const onSelect = renderView()
    openA()

    expect(onSelect).toHaveBeenLastCalledWith(aTxt)
    expect(screen.getByRole('dialog', { name: 'a.txt' })).toBeInTheDocument()
    expect(screen.getByTestId('detail')).toHaveTextContent('a.txt')
  })

  it('closing the Leaf keeps the selection', () => {
    const onSelect = renderView()
    openA()
    onSelect.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens no Leaf when a file is already selected on mount', () => {
    renderView(aTxt)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders no Leaf when the selection becomes a folder while the Leaf flag is set', () => {
    const { setSelected } = renderView()
    openA()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => setSelected(docs))

    expect(screen.queryByRole('dialog')).toBeNull()
    // With no Leaf to close, Escape still steps back from the tree.
    fireEvent.keyDown(screen.getByRole('navigation', { name: 'Location' }), { key: 'Escape' })
    expect(screen.queryByRole('button', { name: /Back to island/ })).toBeNull()
  })

  it('Escape with an open Leaf closes only the Leaf', () => {
    renderView()
    openA()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /Back to island/ })).toBeInTheDocument()
  })
})
