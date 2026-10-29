import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import type { FileKind } from '../lib/file-kind'
import './MediaPlayer.css'

interface Props {
  file: File
  kind: FileKind
}

/** `MediaError.code` for "source not supported" (`MediaError` is not defined in jsdom). */
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4

function errorMessage(code: number | undefined): string {
  return code === MEDIA_ERR_SRC_NOT_SUPPORTED ? 'This file cannot be played in this browser.' : 'Could not play this file.'
}

/** A native audio or video player; owns its object URL and revokes it only on file change or unmount. */
export default function MediaPlayer({ file, kind }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const elementRef = useRef<HTMLMediaElement | null>(null)

  // Declared before the URL effect so its cleanup (pause) runs before the revoke.
  useEffect(() => {
    const element = elementRef.current
    return () => element?.pause()
  }, [file, url])

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setError(null)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (error) return <p className="detail-pane__error" role="alert">{error}</p>
  if (!url) return null

  const setElement = (el: HTMLMediaElement | null) => {
    elementRef.current = el
  }
  const onError = (event: SyntheticEvent<HTMLMediaElement>) => setError(errorMessage(event.currentTarget.error?.code))

  return (
    <div className="media-player">
      {kind === 'video' ? (
        <video
          ref={setElement}
          className="media-player__element"
          controls
          preload="metadata"
          src={url}
          aria-label={file.name}
          onError={onError}
        />
      ) : (
        <audio
          ref={setElement}
          className="media-player__element"
          controls
          preload="metadata"
          src={url}
          aria-label={file.name}
          onError={onError}
        />
      )}
    </div>
  )
}
