import { useEffect, useState } from 'react'
import './ImagePreview.css'

interface Props {
  file: File
}

export default function ImagePreview({ file }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
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
