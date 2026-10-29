export type FileKind = 'image' | 'pdf' | 'audio' | 'video' | 'other'

/** The part of a `File` the classifier reads; a real `File` satisfies it. */
export interface Classifiable {
  name: string
  type: string
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

/**
 * Allowlisted MIME types. Anything else (empty, `application/octet-stream`, container
 * types such as `video/mp2t` that browsers report for `.ts` sources) defers to the extension.
 */
const KIND_BY_MIME = new Map<string, FileKind>([
  ['application/pdf', 'pdf'],
  ['audio/mpeg', 'audio'],
  ['audio/mp3', 'audio'],
  ['audio/wav', 'audio'],
  ['audio/wave', 'audio'],
  ['audio/x-wav', 'audio'],
  ['audio/mp4', 'audio'],
  ['audio/m4a', 'audio'],
  ['audio/x-m4a', 'audio'],
  ['audio/ogg', 'audio'],
  ['audio/flac', 'audio'],
  ['audio/x-flac', 'audio'],
  ['audio/aac', 'audio'],
  ['audio/webm', 'audio'],
  ['video/mp4', 'video'],
  ['video/webm', 'video'],
  ['video/ogg', 'video'],
  ['video/quicktime', 'video'],
  ['video/x-m4v', 'video'],
])

/** `.mp4` and `.webm` are video: a video element also plays their audio-only files. */
const KIND_BY_EXTENSION = new Map<string, FileKind>([
  ['png', 'image'],
  ['jpg', 'image'],
  ['jpeg', 'image'],
  ['gif', 'image'],
  ['webp', 'image'],
  ['bmp', 'image'],
  ['svg', 'image'],
  ['pdf', 'pdf'],
  ['mp3', 'audio'],
  ['wav', 'audio'],
  ['m4a', 'audio'],
  ['ogg', 'audio'],
  ['oga', 'audio'],
  ['flac', 'audio'],
  ['aac', 'audio'],
  ['mp4', 'video'],
  ['webm', 'video'],
  ['mov', 'video'],
  ['m4v', 'video'],
  ['ogv', 'video'],
])

/**
 * The single answer to "what kind of file is this". A specific MIME wins; otherwise the
 * extension decides. Whether the browser can play it is only known at runtime.
 */
export function classifyFile(file: Classifiable): FileKind {
  const mime = file.type.toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  const byMime = KIND_BY_MIME.get(mime)
  if (byMime) return byMime
  return KIND_BY_EXTENSION.get(extensionOf(file.name)) ?? 'other'
}
