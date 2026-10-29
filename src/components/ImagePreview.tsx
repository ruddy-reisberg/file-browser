import { useEffect, useState } from 'react'
import { parseExif, readImageDimensions } from '../lib/image'
import type { ExifData, ImageDimensions } from '../lib/types'
import DetailRow from './DetailRow'
import './ImagePreview.css'

interface Props {
  file: File
}

const EXIF_LABELS: Record<keyof ExifData, string> = {
  make: 'Camera make',
  model: 'Camera model',
  orientation: 'Orientation',
  dateTaken: 'Date taken',
  exposureTime: 'Exposure time',
  fNumber: 'Aperture (f-number)',
  iso: 'ISO',
  focalLength: 'Focal length',
}

/** An image with its dimensions and EXIF; owns its object URL, its async reads and their error. */
export default function ImagePreview({ file }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null)
  const [exif, setExif] = useState<ExifData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    setDimensions(null)
    setExif(null)
    setError(null)

    let cancelled = false
    void Promise.all([readImageDimensions(file), parseExif(file)]).then(
      ([dims, exifData]) => {
        if (cancelled) return
        setDimensions(dims)
        setExif(exifData)
      },
      (err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not read image.')
      },
    )
    return () => {
      cancelled = true
    }
  }, [file])

  const exifEntries = exif ? (Object.keys(exif) as (keyof ExifData)[]).filter((k) => exif[k] !== undefined) : []

  return (
    <>
      {dimensions && (
        <dl className="detail-pane__list">
          <DetailRow label="Dimensions" value={`${dimensions.width} × ${dimensions.height} px`} />
        </dl>
      )}

      {error && <p className="detail-pane__error">{error}</p>}

      {!error && url && (
        <div className="image-preview">
          <img className="image-preview__img" src={url} alt={file.name} />
        </div>
      )}

      {exifEntries.length > 0 && (
        <>
          <h3 className="detail-pane__heading">EXIF</h3>
          <dl className="detail-pane__list">
            {exifEntries.map((key) => (
              <DetailRow key={key} label={EXIF_LABELS[key]} value={String(exif![key])} />
            ))}
          </dl>
        </>
      )}
    </>
  )
}
