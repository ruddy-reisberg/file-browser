import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

const webgl = vi.hoisted(() => ({ available: false }))

vi.mock('../lib/webgl', () => ({
  supportsWebGL: () => webgl.available,
  prefersReducedMotion: () => true,
}))

vi.mock('../components/scene/SceneCanvas', () => import('../components/scene/__tests__/SceneCanvasDouble'))

vi.mock('../lib/picker', () => ({
  supportsDirectoryPicker: () => true,
  pickDirectory: vi.fn(),
}))

import { pickDirectory } from '../lib/picker'

function entry(path: string[]) {
  return { path, file: new File(['x'], path[path.length - 1]) }
}

async function pickFolder() {
  vi.mocked(pickDirectory).mockResolvedValue({
    rootName: 'root',
    entries: [entry(['docs', 'notes.txt']), entry(['docs', 'photo.png']), entry(['readme.md'])],
  })
  fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
  await screen.findByText('readme.md')
}

describe('App filter', () => {
  beforeEach(() => {
    vi.mocked(pickDirectory).mockReset()
  })

  it('filters the list view by name and restores it when cleared', async () => {
    render(<App />)
    await pickFolder()

    const input = screen.getByLabelText('Filter by name')
    fireEvent.change(input, { target: { value: 'readme' } })

    expect(screen.getByText('readme.md')).toBeTruthy()
    expect(screen.queryByText('docs')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('1 file match')

    fireEvent.change(input, { target: { value: '' } })

    expect(screen.getByText('docs')).toBeTruthy()
  })

  it('says so when nothing matches', async () => {
    render(<App />)
    await pickFolder()

    fireEvent.change(screen.getByLabelText('Filter by name'), { target: { value: 'zzz' } })

    expect(screen.getByText('No file or folder matches this filter.')).toBeTruthy()
  })

  it('clears the filter when a new folder is picked', async () => {
    render(<App />)
    await pickFolder()
    fireEvent.change(screen.getByLabelText('Filter by name'), { target: { value: 'readme' } })

    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
    await waitFor(() => expect((screen.getByLabelText('Filter by name') as HTMLInputElement).value).toBe(''))
  })
})

describe('App selection across views', () => {
  beforeEach(() => {
    vi.mocked(pickDirectory).mockReset()
    webgl.available = true
  })

  afterEach(() => {
    webgl.available = false
  })

  it('3D to list: a file opened then closed stays selected in the list', async () => {
    render(<App />)
    vi.mocked(pickDirectory).mockResolvedValue({
      rootName: 'root',
      entries: [entry(['docs', 'notes.txt'])],
    })
    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^Climb docs/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Read notes.txt' }))
    expect(screen.getByRole('dialog', { name: 'notes.txt' })).toBeInTheDocument()

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: 'List' }))

    const row = within(await screen.findByRole('region', { name: 'Folder tree' })).getByText('notes.txt').closest('li')
    expect(row).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'File details' })).toHaveTextContent('notes.txt')
  })

  it('list to 3D: no Leaf opens and the selection is kept', async () => {
    render(<App />)
    vi.mocked(pickDirectory).mockResolvedValue({ rootName: 'root', entries: [entry(['readme.md'])] })
    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    fireEvent.click(within(await screen.findByRole('region', { name: 'Folder tree' })).getByText('readme.md'))

    fireEvent.click(screen.getByRole('button', { name: '3D' }))
    await screen.findByRole('navigation', { name: 'Folders' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    const row = within(await screen.findByRole('region', { name: 'Folder tree' })).getByText('readme.md').closest('li')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })

  describe('one media player', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:x')
      URL.revokeObjectURL = vi.fn()
      HTMLMediaElement.prototype.pause = vi.fn()
      HTMLMediaElement.prototype.load = vi.fn()
      webgl.available = false
    })

    function mediaEntry(name: string) {
      return { path: [name], file: new File(['x'], name, { type: 'audio/mpeg' }) }
    }

    async function pickAudio() {
      vi.mocked(pickDirectory).mockResolvedValue({
        rootName: 'root',
        entries: [mediaEntry('a.mp3'), mediaEntry('b.mp3'), entry(['readme.md'])],
      })
      fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
      fireEvent.click(await screen.findByText('a.mp3'))
    }

    it('keeps at most one audio element when another node is selected', async () => {
      const { container } = render(<App />)
      await pickAudio()
      expect(container.querySelectorAll('audio')).toHaveLength(1)
      fireEvent.click(screen.getByText('b.mp3'))
      expect(container.querySelectorAll('audio')).toHaveLength(1)
      fireEvent.click(screen.getByText('readme.md'))
      expect(container.querySelectorAll('audio')).toHaveLength(0)
    })

    it('has no media element after switching to 3D', async () => {
      webgl.available = true
      const { container } = render(<App />)
      vi.mocked(pickDirectory).mockResolvedValue({ rootName: 'root', entries: [mediaEntry('a.mp3')] })
      fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
      fireEvent.click(screen.getByRole('button', { name: 'List' }))
      fireEvent.click(await screen.findByText('a.mp3'))
      expect(container.querySelectorAll('audio')).toHaveLength(1)
      fireEvent.click(screen.getByRole('button', { name: '3D' }))
      await screen.findByRole('navigation', { name: 'Folders' })
      expect(container.querySelectorAll('audio')).toHaveLength(0)
    })

    it('pauses the audio of a 3D Leaf at the close request', async () => {
      webgl.available = true
      const { container } = render(<App />)
      vi.mocked(pickDirectory).mockResolvedValue({ rootName: 'root', entries: [entry(['docs', 'a.mp3'])] })
      fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
      fireEvent.click(await screen.findByRole('button', { name: /^Climb docs/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Read a.mp3' }))
      expect(container.querySelectorAll('audio')).toHaveLength(1)

      const pause = vi.mocked(HTMLMediaElement.prototype.pause)
      pause.mockClear()
      vi.useFakeTimers()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(pause).toHaveBeenCalledTimes(1)
      expect(container.querySelectorAll('audio')).toHaveLength(1)
      act(() => {
        vi.advanceTimersByTime(300)
      })
      vi.useRealTimers()
      expect(container.querySelectorAll('audio')).toHaveLength(0)
    })

    it('has no media element after a new folder is picked', async () => {
      const { container } = render(<App />)
      await pickAudio()
      vi.mocked(pickDirectory).mockResolvedValue({ rootName: 'other', entries: [entry(['z.txt'])] })
      fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))
      await screen.findByText('z.txt')
      expect(container.querySelectorAll('audio')).toHaveLength(0)
    })
  })
})
