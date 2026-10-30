import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import PdfPreview from '../PdfPreview'

const pdf = vi.hoisted(() => ({ getDocument: vi.fn() }))

vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: pdf.getDocument }))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }))

interface Gate {
  promise: Promise<void>
  resolve: () => void
  reject: (reason: Error) => void
}

function gate(): Gate {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** jsdom's File may lack arrayBuffer(), and the component only needs some bytes. */
function pdfFile(name: string): File {
  return Object.assign(new File(['x'], name, { type: 'application/pdf' }), {
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
  })
}

/** Makes `getDocument` return a document whose first page renders when `renderGate` settles. */
function mockDocument(renderGate: Gate, destroy: () => void) {
  pdf.getDocument.mockReturnValueOnce({
    promise: Promise.resolve({
      getPage: () =>
        Promise.resolve({
          getViewport: () => ({ width: 10, height: 10 }),
          render: () => ({ promise: renderGate.promise }),
        }),
      destroy,
    }),
  })
}

describe('PdfPreview', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
  const canvasIds = new WeakMap<HTMLCanvasElement, number>()
  let canvasCount = 0

  beforeEach(() => {
    pdf.getDocument.mockReset()
    canvasCount = 0
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
      canvasIds.set(this, ++canvasCount)
      return {} as CanvasRenderingContext2D
    } as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement) {
      return `data:image/png;base64,render-${canvasIds.get(this)}`
    }
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL
  })

  it('shows the first page as an image and destroys the document', async () => {
    const destroy = vi.fn()
    const done = gate()
    mockDocument(done, destroy)
    done.resolve()

    render(<PdfPreview file={pdfFile('a.pdf')} />)

    const img = await screen.findByRole('img')
    expect(img.getAttribute('src')).toBe('data:image/png;base64,render-1')
    expect(img.getAttribute('alt')).toBe('a.pdf')
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('ignores a render that finishes after the file changed', async () => {
    const first = gate()
    const second = gate()
    const destroyFirst = vi.fn()
    const destroySecond = vi.fn()
    mockDocument(first, destroyFirst)
    mockDocument(second, destroySecond)

    const { rerender } = render(<PdfPreview file={pdfFile('a.pdf')} />)
    rerender(<PdfPreview file={pdfFile('b.pdf')} />)
    await waitFor(() => expect(canvasCount).toBe(2))

    await act(async () => {
      second.resolve()
    })
    expect((await screen.findByRole('img')).getAttribute('src')).toBe('data:image/png;base64,render-2')

    await act(async () => {
      first.resolve()
    })
    expect(screen.getByRole('img').getAttribute('src')).toBe('data:image/png;base64,render-2')
    expect(destroyFirst).toHaveBeenCalledTimes(1)
  })

  it('ignores a render that finishes after unmount', async () => {
    const done = gate()
    mockDocument(done, vi.fn())

    const { unmount, container } = render(<PdfPreview file={pdfFile('a.pdf')} />)
    await waitFor(() => expect(canvasCount).toBe(1))
    unmount()

    await act(async () => {
      done.resolve()
    })
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows the error and still destroys the document when the page fails to render', async () => {
    const destroy = vi.fn()
    const done = gate()
    mockDocument(done, destroy)

    render(<PdfPreview file={pdfFile('a.pdf')} />)
    await waitFor(() => expect(canvasCount).toBe(1))
    await act(async () => {
      done.reject(new Error('corrupt'))
    })

    expect((await screen.findByText('corrupt')).className).toBe('detail-pane__error')
    expect(screen.queryByRole('img')).toBeNull()
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('shows the error when the document cannot be opened', async () => {
    pdf.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error('encrypted')) })

    render(<PdfPreview file={pdfFile('a.pdf')} />)

    expect((await screen.findByText('encrypted')).className).toBe('detail-pane__error')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('falls back to a generic message when the failure is not an Error', async () => {
    pdf.getDocument.mockReturnValueOnce({ promise: Promise.reject('nope') })

    render(<PdfPreview file={pdfFile('a.pdf')} />)

    expect(await screen.findByText('Could not render PDF.')).toBeTruthy()
  })

  it('shows no error from a previous file that fails after the selection changed', async () => {
    const first = gate()
    const second = gate()
    const destroyFirst = vi.fn()
    mockDocument(first, destroyFirst)
    mockDocument(second, vi.fn())

    const { rerender } = render(<PdfPreview file={pdfFile('a.pdf')} />)
    rerender(<PdfPreview file={pdfFile('b.pdf')} />)
    await waitFor(() => expect(canvasCount).toBe(2))

    await act(async () => {
      first.reject(new Error('old failure'))
    })
    expect(screen.queryByText('old failure')).toBeNull()
    expect(destroyFirst).toHaveBeenCalledTimes(1)

    await act(async () => {
      second.resolve()
    })
    expect((await screen.findByRole('img')).getAttribute('src')).toBe('data:image/png;base64,render-2')
  })

  it('clears the error when the file changes to a valid PDF', async () => {
    pdf.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error('corrupt')) })
    const done = gate()
    mockDocument(done, vi.fn())
    done.resolve()

    const { rerender } = render(<PdfPreview file={pdfFile('a.pdf')} />)
    await screen.findByText('corrupt')

    rerender(<PdfPreview file={pdfFile('b.pdf')} />)

    expect(await screen.findByRole('img')).toBeTruthy()
    expect(screen.queryByText('corrupt')).toBeNull()
  })
})
