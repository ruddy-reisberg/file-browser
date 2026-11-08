import { describe, expect, it } from 'vitest'
import { countFiles, filterTree, matchesName } from '../filter'
import { buildTree } from '../tree'
import type { FileEntry, TreeNode } from '../types'

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

  it('does not mutate the original tree', () => {
    const before = countFiles(root)
    filterTree(root, 'report')
    expect(countFiles(root)).toBe(before)
    expect(names(root)).toEqual(['docs', 'photos', 'readme.md'])
  })
})

describe('countFiles', () => {
  it('counts files at any depth, ignoring folders', () => {
    expect(countFiles(root)).toBe(5)
  })

  it('returns 1 for a single file node', () => {
    const file = root.children!.find((c) => c.kind === 'file')!
    expect(countFiles(file)).toBe(1)
  })

  it('returns 0 for an empty folder', () => {
    expect(countFiles(buildTree('empty', []))).toBe(0)
  })

  it('counts only the files kept by a filter', () => {
    expect(countFiles(filterTree(root, 'report'))).toBe(2)
    expect(countFiles(filterTree(root, 'zzz'))).toBe(0)
  })

  it('returns 0 for a folder node without a children array', () => {
    const bare: TreeNode = { name: 'bare', kind: 'dir', path: 'bare' }
    expect(countFiles(bare)).toBe(0)
  })

  it('returns 0 for nested folders that contain no file', () => {
    const hollow: TreeNode = {
      name: 'top',
      kind: 'dir',
      path: 'top',
      children: [
        { name: 'a', kind: 'dir', path: 'top/a', children: [] },
        {
          name: 'b',
          kind: 'dir',
          path: 'top/b',
          children: [{ name: 'c', kind: 'dir', path: 'top/b/c', children: [] }],
        },
      ],
    }
    expect(countFiles(hollow)).toBe(0)
  })

  it('counts files in a deeply nested chain of folders', () => {
    const tree = buildTree('deep', [entry(['a', 'b', 'c', 'd', 'e', 'f', 'leaf.txt'])])
    expect(countFiles(tree)).toBe(1)
  })

  it('counts a subtree on its own', () => {
    const photos = root.children!.find((c) => c.name === 'photos')!
    expect(countFiles(photos)).toBe(2)
  })

  it('counts duplicate and case-differing names as distinct files', () => {
    const tree = buildTree('dups', [
      entry(['a.txt']),
      entry(['a.txt']),
      entry(['A.txt']),
      entry(['sub', 'a.txt']),
    ])
    expect(countFiles(tree)).toBe(4)
  })

  it('counts files with special characters and without extension', () => {
    const tree = buildTree('odd', [
      entry(['Makefile']),
      entry(['.gitignore']),
      entry(['my file (1) #2.txt']),
      entry(['dossier é', 'naïve & co.txt']),
      entry(['日本語', '写真.jpg']),
    ])
    expect(countFiles(tree)).toBe(5)
  })

  it('ignores entries with an empty path', () => {
    expect(countFiles(buildTree('skip', [entry([]), entry(['kept.txt'])]))).toBe(1)
  })

  it('counts every file of a very large tree', () => {
    const entries = Array.from({ length: 50 }, (_, folder) =>
      Array.from({ length: 200 }, (_, index) => entry([`dir-${folder}`, `file-${index}.txt`])),
    ).flat()
    expect(countFiles(buildTree('big', entries))).toBe(10_000)
  })

  it('does not mutate the tree it counts', () => {
    const snapshot = JSON.stringify(root, (key, value) => (key === 'file' ? undefined : value))
    countFiles(root)
    expect(JSON.stringify(root, (key, value) => (key === 'file' ? undefined : value))).toBe(
      snapshot,
    )
  })
})
