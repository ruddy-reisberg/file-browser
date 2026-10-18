import { useEffect, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { isPdfFile } from '../lib/image'
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

export default function ImagePreview({ file }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    setUrl(null)
    if (isPdfFile(file)) {
      let cancelled = false
      renderPdfFirstPage(file).then(
        (dataUrl) => {
          if (!cancelled) setUrl(dataUrl)
        },
        () => {},
      )
      return () => {
        cancelled = true
      }
    }
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (!url) return null

  return (
    <div className="image-preview">
      <img className="image-preview__img" src={url} alt={file.name} />
    </div>
  )
}
