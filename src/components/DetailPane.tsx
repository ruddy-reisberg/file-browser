import { useEffect, useState } from 'react'
import { getFileMetadata } from '../lib/metadata'
import { isImageFile, isPdfFile, parseExif, readImageDimensions } from '../lib/image'
import type { ExifData, ImageDimensions, TreeNode } from '../lib/types'
import ImagePreview from './ImagePreview'
import './DetailPane.css'

interface Props {
  node: TreeNode | null
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

export default function DetailPane({ node }: Props) {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null)
  const [exif, setExif] = useState<ExifData | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const file = node?.kind === 'file' ? node.file ?? null : null
  const isImage = file ? isImageFile(file) : false

  const isPdf = file ? isPdfFile(file) : false

  useEffect(() => {
    setDimensions(null)
    setExif(null)
    setImageError(null)
    if (!file || !isImage) return

    let cancelled = false
    void Promise.all([readImageDimensions(file), parseExif(file)]).then(
      ([dims, exifData]) => {
        if (cancelled) return
        setDimensions(dims)
        setExif(exifData)
      },
      (err) => {
        if (cancelled) return
        setImageError(err instanceof Error ? err.message : 'Could not read image.')
      },
    )
    return () => {
      cancelled = true
    }
  }, [file, isImage])

  if (!node) {
    return (
      <div className="detail-pane detail-pane--empty">
        <p>Select a file or folder to see its details.</p>
      </div>
    )
  }

  if (node.kind === 'dir') {
    const count = node.children?.length ?? 0
    return (
      <div className="detail-pane">
        <h2 className="detail-pane__title">{node.name}</h2>
        <p className="detail-pane__subtitle">
          Folder · {count} item{count === 1 ? '' : 's'}
        </p>
      </div>
    )
  }

  const meta = getFileMetadata(node.file!)
  const exifEntries = exif ? (Object.keys(exif) as (keyof ExifData)[]).filter((k) => exif[k] !== undefined) : []

  return (
    <div className="detail-pane">
      <h2 className="detail-pane__title">{meta.name}</h2>

      <dl className="detail-pane__list">
        <Row label="Kind" value={meta.kindLabel} />
        <Row label="Size" value={meta.sizeLabel} />
        <Row label="Last modified" value={meta.lastModifiedLabel} />
        {dimensions && <Row label="Dimensions" value={`${dimensions.width} × ${dimensions.height} px`} />}
      </dl>

      {isImage && imageError && <p className="detail-pane__error">{imageError}</p>}

      {isImage && !imageError && <ImagePreview file={node.file!} />}

      {isPdf && <ImagePreview file={node.file!} />}

      {exifEntries.length > 0 && (
        <>
          <h3 className="detail-pane__heading">EXIF</h3>
          <dl className="detail-pane__list">
            {exifEntries.map((key) => (
              <Row key={key} label={EXIF_LABELS[key]} value={String(exif![key])} />
            ))}
          </dl>
        </>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-pane__row">
      <dt className="detail-pane__label">{label}</dt>
      <dd className="detail-pane__value">{value}</dd>
    </div>
  )
}
