import type { FileMetadata } from './types'

const KIND_BY_EXTENSION: Record<string, string> = {
  png: 'PNG Image',
  jpg: 'JPEG Image',
  jpeg: 'JPEG Image',
  gif: 'GIF Image',
  webp: 'WebP Image',
  svg: 'SVG Image',
  bmp: 'Bitmap Image',
  ts: 'TypeScript File',
  tsx: 'TypeScript (JSX) File',
  js: 'JavaScript File',
  jsx: 'JavaScript (JSX) File',
  json: 'JSON File',
  md: 'Markdown Document',
  txt: 'Plain Text File',
  css: 'CSS File',
  html: 'HTML Document',
  pdf: 'PDF Document',
  zip: 'ZIP Archive',
  mp4: 'MP4 Video',
  mp3: 'MP3 Audio',
  wav: 'WAV Audio',
}

export function formatBytes(bytes: number): string {
  if (bytes < 0) throw new RangeError('bytes must be non-negative')
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  const precision = exponent === 0 ? 0 : 1
  return `${value.toFixed(precision)} ${units[exponent]}`
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function describeKind(name: string, mimeType: string): string {
  const ext = extensionOf(name)
  if (ext && KIND_BY_EXTENSION[ext]) return KIND_BY_EXTENSION[ext]
  if (mimeType) {
    const [type, subtype] = mimeType.split('/')
    if (type && subtype) return `${subtype.toUpperCase()} (${type})`
  }
  return ext ? `${ext.toUpperCase()} File` : 'File'
}

export function getFileMetadata(file: File): FileMetadata {
  return {
    name: file.name,
    sizeBytes: file.size,
    sizeLabel: formatBytes(file.size),
    kindLabel: describeKind(file.name, file.type),
    lastModifiedLabel: formatDate(file.lastModified),
    lastModifiedMs: file.lastModified,
    mimeType: file.type,
  }
}
