import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FolderPicker from '../FolderPicker'

afterEach(() => {
  delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker
})

describe('FolderPicker', () => {
  it('offers no picker and shows an explicit message where the API is missing', () => {
    render(<FolderPicker onPicked={() => {}} onError={() => {}} />)

    expect(screen.getByRole('status').textContent).toMatch(/not supported/i)
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('opens the picker read-only and reports the entries', async () => {
    const showDirectoryPicker = vi.fn().mockResolvedValue({
      name: 'photos',
      entries: async function* () {},
    })
    Object.defineProperty(window, 'showDirectoryPicker', { value: showDirectoryPicker, configurable: true })
    const onPicked = vi.fn()
    render(<FolderPicker onPicked={onPicked} onError={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }))

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith('photos', []))
    expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' })
  })
})
