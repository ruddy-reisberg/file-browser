import { useEffect, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './ImagePreview.css'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface Props {
  file: File
}

/** Renders the first page of a PDF to a PNG data URL. */
async function renderPdfFirstPage(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    return canvas.toDataURL('image/png')
  } finally {
    void pdf.destroy()
  }
}

export default function PdfPreview({ file }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUrl(null)
    setError(null)
    let cancelled = false
    renderPdfFirstPage(file).then(
      (dataUrl) => {
        if (!cancelled) setUrl(dataUrl)
      },
      (err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not render PDF.')
      },
    )
    return () => {
      cancelled = true
    }
  }, [file])

  if (error) return <p className="detail-pane__error">{error}</p>
  if (!url) return null

  return (
    <div className="image-preview">
      <img className="image-preview__img" src={url} alt={file.name} />
    </div>
  )
}
