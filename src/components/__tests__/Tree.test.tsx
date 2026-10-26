import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Tree from '../Tree'
import { buildTree } from '../../lib/tree'

function entry(path: string[]) {
  return { path, file: new File(['x'], path[path.length - 1]) }
}

describe('Tree', () => {
  it('renders one tree per top-level folder, plus one for loose files', () => {
    const root = buildTree('root', [
      entry(['a', 'one.txt']),
      entry(['b', 'two.txt']),
      entry(['readme.md']),
    ])

    render(<Tree root={root} selectedPath={null} onSelect={() => {}} />)

    const trees = screen.getAllByRole('tree')
    expect(trees.map((t) => t.getAttribute('aria-label'))).toEqual(['a', 'b', 'root'])
    expect(screen.getByText('one.txt')).toBeTruthy()
    expect(screen.getByText('two.txt')).toBeTruthy()
    expect(screen.getByText('readme.md')).toBeTruthy()
  })

  it('renders no loose-files tree when the root only holds folders', () => {
    const root = buildTree('root', [entry(['a', 'one.txt'])])

    render(<Tree root={root} selectedPath={null} onSelect={() => {}} />)

    expect(screen.getAllByRole('tree')).toHaveLength(1)
  })
})
