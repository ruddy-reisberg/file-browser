import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImagePreview from '../ImagePreview'
import { parseExif, readImageDimensions } from '../../lib/image'
import type { ExifData, ImageDimensions } from '../../lib/types'

vi.mock('../../lib/image', () => ({
  readImageDimensions: vi.fn(),
  parseExif: vi.fn(),
}))

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function image(name: string): File {
  return new File(['x'], name, { type: 'image/png' })
}

describe('ImagePreview', () => {
  const createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`)
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    // Testing Library unmounts after each test, so clear here rather than in afterEach.
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.mocked(readImageDimensions).mockReset()
    vi.mocked(parseExif).mockReset()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
  })

  it('shows the picture, the dimensions and the EXIF data', async () => {
    vi.mocked(readImageDimensions).mockResolvedValue({ width: 640, height: 480 })
    vi.mocked(parseExif).mockResolvedValue({ make: 'ACME', iso: 200 })

    render(<ImagePreview file={image('a.png')} />)

    expect(await screen.findByText('640 × 480 px')).toBeTruthy()
    expect(screen.getByText('Camera make')).toBeTruthy()
    expect(screen.getByText('ACME')).toBeTruthy()
    expect(screen.getByText('200')).toBeTruthy()
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:a.png')
  })

  it('shows an explicit error instead of the picture when the image cannot be read', async () => {
    vi.mocked(readImageDimensions).mockRejectedValue(new Error('Could not decode image: a.png'))
    vi.mocked(parseExif).mockResolvedValue({})

    render(<ImagePreview file={image('a.png')} />)

    expect(await screen.findByText('Could not decode image: a.png')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('falls back to a generic message for a non-Error rejection', async () => {
    vi.mocked(readImageDimensions).mockRejectedValue('nope')
    vi.mocked(parseExif).mockResolvedValue({})

    render(<ImagePreview file={image('a.png')} />)

    expect(await screen.findByText('Could not read image.')).toBeTruthy()
  })

  it('ignores a stale result when the file changes before the first read finishes', async () => {
    const first = deferred<ImageDimensions>()
    const second = deferred<ImageDimensions>()
    vi.mocked(readImageDimensions).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    vi.mocked(parseExif).mockResolvedValue({} as ExifData)

    const { rerender } = render(<ImagePreview file={image('a.png')} />)
    rerender(<ImagePreview file={image('b.png')} />)

    await act(async () => {
      second.resolve({ width: 20, height: 20 })
    })
    await act(async () => {
      first.resolve({ width: 10, height: 10 })
    })

    expect(screen.getByText('20 × 20 px')).toBeTruthy()
    expect(screen.queryByText('10 × 10 px')).toBeNull()
  })

  it('ignores a stale error from the previous file', async () => {
    const first = deferred<ImageDimensions>()
    vi.mocked(readImageDimensions)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ width: 20, height: 20 })
    vi.mocked(parseExif).mockResolvedValue({})

    const { rerender } = render(<ImagePreview file={image('a.png')} />)
    rerender(<ImagePreview file={image('b.png')} />)
    await screen.findByText('20 × 20 px')

    await act(async () => {
      first.reject(new Error('old failure'))
    })

    expect(screen.queryByText('old failure')).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('revokes every object URL it created when the file changes and on unmount', async () => {
    vi.mocked(readImageDimensions).mockResolvedValue({ width: 1, height: 1 })
    vi.mocked(parseExif).mockResolvedValue({})

    const { rerender, unmount } = render(<ImagePreview file={image('a.png')} />)
    rerender(<ImagePreview file={image('b.png')} />)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.png')

    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:b.png')
    expect(revokeObjectURL).toHaveBeenCalledTimes(createObjectURL.mock.calls.length)
  })
})
