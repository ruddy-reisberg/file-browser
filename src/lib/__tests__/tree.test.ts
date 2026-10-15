import { describe, expect, it } from 'vitest'
import { buildTree, fileListToEntries } from '../tree'
import type { FileEntry } from '../types'

function makeFile(name: string): File {
  return new File(['content'], name)
}

describe('buildTree', () => {
  it('nests files under their directories', () => {
    const entries: FileEntry[] = [
      { path: ['src', 'lib', 'a.ts'], file: makeFile('a.ts') },
      { path: ['src', 'app.tsx'], file: makeFile('app.tsx') },
      { path: ['readme.md'], file: makeFile('readme.md') },
    ]

    const tree = buildTree('root', entries)

    expect(tree.kind).toBe('dir')
    expect(tree.children?.map((c) => c.name)).toEqual(['src', 'readme.md'])

    const src = tree.children!.find((c) => c.name === 'src')!
    expect(src.kind).toBe('dir')
    expect(src.children?.map((c) => c.name)).toEqual(['lib', 'app.tsx'])

    const lib = src.children!.find((c) => c.name === 'lib')!
    expect(lib.children?.[0].path).toBe('src/lib/a.ts')
  })

  it('sorts directories before files, then alphabetically', () => {
    const entries: FileEntry[] = [
      { path: ['z.txt'], file: makeFile('z.txt') },
      { path: ['a.txt'], file: makeFile('a.txt') },
      { path: ['sub', 'x.txt'], file: makeFile('x.txt') },
    ]

    const tree = buildTree('root', entries)

    expect(tree.children?.map((c) => c.name)).toEqual(['sub', 'a.txt', 'z.txt'])
  })

  it('ignores entries with empty path', () => {
    const tree = buildTree('root', [{ path: [], file: makeFile('ignored') }])
    expect(tree.children).toEqual([])
  })
})

describe('fileListToEntries', () => {
  it('strips the leading root segment from webkitRelativePath', () => {
    const file = makeFile('a.ts')
    Object.defineProperty(file, 'webkitRelativePath', { value: 'root/src/a.ts' })
    const fileList = { 0: file, length: 1 } as unknown as FileList

    const entries = fileListToEntries(fileList)

    expect(entries).toEqual([{ path: ['src', 'a.ts'], file }])
  })
})
