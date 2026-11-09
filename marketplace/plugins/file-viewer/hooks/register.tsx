import { atom, read, update } from 'claude-code'
import type { FsEntry, Register } from 'claude-code'

import type { Entry, Listing, Preview } from '../types'

const PANE = 'file-viewer'
const SKIPPED = new Set(['.git', 'node_modules'])
const MAX_BYTES = 1024 * 1024
const MAX_CHARS = 100000
const MAX_ROWS = 400

// Change a tag when the stored fields change: it declines what an earlier
// version stored, which outlives a reload.
const dirs = atom(
  { plugin: 'file-viewer', key: 'dirs' } as const,
  {} as Record<string, Listing>,
  { shape: 'dirs-1' },
)
const expanded = atom(
  { plugin: 'file-viewer', key: 'expanded' } as const,
  [] as string[],
  { shape: 'expanded-1' },
)
const preview = atom(
  { plugin: 'file-viewer', key: 'preview' } as const,
  null as Preview | null,
  { shape: 'preview-1' },
)

type Api = Parameters<typeof read>[0]

// The newest open wins: a slow read never overwrites a later selection.
let latest = 0

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const byDirThenName = (a: Entry, b: Entry): number =>
  a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name)

// Paths are built from listed names only, relative to the project folder, so
// nothing can name a file outside it. Links are never followed.
const loadDir = async (
  $: Api & { fs: { list: (path?: string) => Promise<FsEntry[]> } },
  dir: string,
): Promise<void> => {
  let listing: Listing
  try {
    const found = await $.fs.list(dir === '' ? undefined : dir)
    const entries = found
      .filter(
        one =>
          !one.isLink &&
          (one.kind === 'file' || one.kind === 'dir') &&
          !SKIPPED.has(one.name) &&
          one.name !== '..' &&
          one.name !== '.',
      )
      .map(one => ({
        name: one.name,
        path: dir === '' ? one.name : `${dir}/${one.name}`,
        isDir: one.kind === 'dir',
        size: one.size,
      }))
      .sort(byDirThenName)
    listing = { entries }
  } catch {
    listing = { entries: [], error: 'Folder unreadable.' }
  }
  await update($, dirs, all => ({ ...all, [dir]: listing }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'files',
      description: 'Browse the project files in a read-only pane',
    })
    return next(e)
  })

  on('command.run', { command: 'files' }, async $ => {
    await loadDir($, '')
    await $.ui.open({ id: PANE, title: 'Files', focus: true })
    return { text: 'File viewer opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Code } = $.ui.resolve(e)

    const toggle = async (dir: string): Promise<void> => {
      const isOpen = (await read($, expanded)).includes(dir)
      if (!isOpen) await loadDir($, dir)
      await update($, expanded, list =>
        isOpen ? list.filter(one => one !== dir) : [...list, dir],
      )
    }

    const openFile = async (entry: Entry): Promise<void> => {
      const ticket = ++latest
      const show = async (next: Preview): Promise<void> => {
        if (ticket === latest) await update($, preview, () => next)
      }
      const base = { path: entry.path, size: entry.size }

      if (entry.size > MAX_BYTES) {
        await show({
          ...base,
          note: `File too large to preview (${formatSize(entry.size)}, limit ${formatSize(MAX_BYTES)}).`,
        })
        return
      }
      try {
        const text = await $.fs.read(entry.path)
        if (text.includes('\u0000') || text.includes('�')) {
          await show({ ...base, note: 'Binary file: no preview.' })
          return
        }
        const isCut = text.length > MAX_CHARS
        await show({
          ...base,
          text: isCut ? text.slice(0, MAX_CHARS) : text,
          note: isCut ? `Preview cut after ${MAX_CHARS} characters.` : undefined,
        })
      } catch {
        await show({ ...base, note: 'File unreadable.' })
      }
    }

    const shown = await read($, preview)
    if (shown) {
      return (
        <Box flexDirection="column">
          <Button
            key="back"
            autoFocus
            onPress={() => update($, preview, () => null)}
          >
            ← Back to files
          </Button>
          <Text bold>{shown.path}</Text>
          <Text dimColor>{formatSize(shown.size)}</Text>
          {shown.note !== undefined && <Text dimColor>{shown.note}</Text>}
          {shown.text !== undefined && (
            <Code source={shown.text} path={shown.path} startLine={1} />
          )}
        </Box>
      )
    }

    const all = await read($, dirs)
    const open = await read($, expanded)
    const rows: Array<{ entry: Entry; depth: number }> = []
    const notes: Array<{ key: string; depth: number; text: string }> = []
    const walk = (dir: string, depth: number): void => {
      const listing = all[dir]
      if (!listing) return
      if (listing.error) notes.push({ key: dir, depth, text: listing.error })
      for (const entry of listing.entries) {
        rows.push({ entry, depth })
        if (entry.isDir && open.includes(entry.path)) walk(entry.path, depth + 1)
      }
    }
    walk('', 0)

    if (!all['']) return <Text dimColor>Loading…</Text>
    if (rows.length === 0) return <Text dimColor>No files in this project.</Text>

    return (
      <Box flexDirection="column">
        {rows.slice(0, MAX_ROWS).map(({ entry, depth }) => {
          const pad = '  '.repeat(depth)
          const mark = entry.isDir ? (open.includes(entry.path) ? '▾ ' : '▸ ') : '  '
          const tail = entry.isDir ? '/' : `  ${formatSize(entry.size)}`
          return (
            <Button
              key={entry.path}
              plain
              onPress={() => (entry.isDir ? toggle(entry.path) : openFile(entry))}
            >
              {`${pad}${mark}${entry.name}${tail}`}
            </Button>
          )
        })}
        {rows.length > MAX_ROWS && (
          <Text dimColor>… {rows.length - MAX_ROWS} more entries not shown</Text>
        )}
        {notes.map(note => (
          <Text key={note.key} dimColor>
            {'  '.repeat(note.depth)}
            {note.text}
          </Text>
        ))}
      </Box>
    )
  })
}
