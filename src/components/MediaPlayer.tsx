import { useEffect, useState } from 'react'
import type { FileKind } from '../lib/file-kind'
import './MediaPlayer.css'

interface Props {
  file: File
  kind: FileKind
}

/** A native audio or video player; owns its object URL and revokes it only on file change or unmount. */
export default function MediaPlayer({ file, kind }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (!url) return null

  return (
    <div className="media-player">
      {kind === 'video' ? (
        <video className="media-player__element" controls preload="metadata" src={url} aria-label={file.name} />
      ) : (
        <audio className="media-player__element" controls preload="metadata" src={url} aria-label={file.name} />
      )}
    </div>
  )
}
