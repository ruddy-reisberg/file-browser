import { describe, expect, it } from 'vitest'
import { filterTree, matchesName } from '../filter'
import { buildTree } from '../tree'
import type { FileEntry } from '../types'

function entry(path: string[]): FileEntry {
  return { path, file: new File(['x'], path[path.length - 1]) }
}

const root = buildTree('root', [
  entry(['readme.md']),
  entry(['docs', 'Report.pdf']),
  entry(['docs', 'notes.txt']),
  entry(['photos', 'cat.jpg']),
  entry(['photos', 'trips', 'report-2020.jpg']),
])

const names = (node: { children?: { name: string }[] }) => (node.children ?? []).map((c) => c.name)

describe('matchesName', () => {
  it('ignores case and surrounding spaces', () => {
    expect(matchesName('Report.PDF', ' report ')).toBe(true)
    expect(matchesName('cat.jpg', 'dog')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesName('anything', '')).toBe(true)
    expect(matchesName('anything', '   ')).toBe(true)
  })
})

describe('filterTree', () => {
  it('returns the same tree for an empty query', () => {
    expect(filterTree(root, '')).toBe(root)
  })

  it('keeps matching files and the folders leading to them', () => {
    const result = filterTree(root, 'report')
    expect(names(result)).toEqual(['docs', 'photos'])
    const [docs, photos] = result.children!
    expect(names(docs)).toEqual(['Report.pdf'])
    expect(names(photos)).toEqual(['trips'])
    expect(names(photos.children![0])).toEqual(['report-2020.jpg'])
  })

  it('keeps a folder whole when its own name matches', () => {
    const result = filterTree(root, 'docs')
    expect(names(result)).toEqual(['docs'])
    expect(names(result.children![0])).toEqual(['notes.txt', 'Report.pdf'])
  })

  it('returns an empty folder when nothing matches', () => {
    expect(names(filterTree(root, 'zzz'))).toEqual([])
  })
})
