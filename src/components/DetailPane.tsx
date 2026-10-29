import type { ComponentType } from 'react'
import { classifyFile, type FileKind } from '../lib/file-kind'
import { getFileMetadata } from '../lib/metadata'
import type { TreeNode } from '../lib/types'
import DetailRow from './DetailRow'
import ImagePreview from './ImagePreview'
import PdfPreview from './PdfPreview'
import './DetailPane.css'

interface Props {
  node: TreeNode | null
}

/** The preview for each kind; every kind must be handled. Audio and video have none yet. */
const PREVIEW_BY_KIND: Record<FileKind, ComponentType<{ file: File }> | null> = {
  image: ImagePreview,
  pdf: PdfPreview,
  audio: null,
  video: null,
  other: null,
}

/** Metadata for the selected node plus the preview for its kind; holds no async state itself. */
export default function DetailPane({ node }: Props) {
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

  const file = node.file!
  const meta = getFileMetadata(file)
  const Preview = PREVIEW_BY_KIND[classifyFile(file)]

  return (
    <div className="detail-pane">
      <h2 className="detail-pane__title">{meta.name}</h2>

      <dl className="detail-pane__list">
        <DetailRow label="Kind" value={meta.kindLabel} />
        <DetailRow label="Size" value={meta.sizeLabel} />
        <DetailRow label="Last modified" value={meta.lastModifiedLabel} />
      </dl>

      {Preview && <Preview key={node.path} file={file} />}
    </div>
  )
}
