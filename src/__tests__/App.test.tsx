import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

vi.mock('../lib/webgl', () => ({
  supportsWebGL: () => false,
  prefersReducedMotion: () => true,
}))

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
