import { classifyFile } from './file-kind'
import type { ExifData, ImageDimensions } from './types'

export function isImageFile(file: File): boolean {
  return classifyFile(file) === 'image'
}

export function isPdfFile(file: File): boolean {
  return classifyFile(file) === 'pdf'
}

/** Reads natural pixel dimensions by loading the file into an <img>. */
export function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not decode image: ${file.name}`))
    }
    img.src = url
  })
}

const EXIF_TAGS: Record<number, keyof ExifData | undefined> = {
  0x010f: 'make',
  0x0110: 'model',
  0x0112: 'orientation',
  0x9003: 'dateTaken',
  0x829a: 'exposureTime',
  0x829d: 'fNumber',
  0x8827: 'iso',
  0x920a: 'focalLength',
}

/**
 * Minimal EXIF reader for JPEG files (APP1 segment, TIFF-structured IFD0).
 * Returns an empty object for non-JPEGs or files without EXIF data.
 */
export async function parseExif(file: File): Promise<ExifData> {
  if (!/\.jpe?g$/i.test(file.name) && file.type !== 'image/jpeg') return {}

  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return {}

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    if (marker === 0xffe1) {
      return readExifSegment(view, offset + 4)
    }
    if (marker < 0xff01 || marker === 0xffd8) break
    const segmentLength = view.getUint16(offset + 2)
    offset += 2 + segmentLength
  }
  return {}
}

function readExifSegment(view: DataView, headerStart: number): ExifData {
  // headerStart points just past the APP1 length field, at "Exif\0\0".
  const exifHeader = 'Exif\0\0'
  for (let i = 0; i < exifHeader.length; i++) {
    if (view.getUint8(headerStart + i) !== exifHeader.charCodeAt(i)) return {}
  }
  const tiffStart = headerStart + 6
  const little = view.getUint16(tiffStart) === 0x4949
  const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little)
  return readIfd(view, tiffStart, ifd0Offset, little)
}

function readIfd(view: DataView, tiffStart: number, ifdOffset: number, little: boolean): ExifData {
  const result: ExifData = {}
  const entryCount = view.getUint16(ifdOffset, little)

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12
    const tag = view.getUint16(entryOffset, little)
    const key = EXIF_TAGS[tag]
    if (!key) continue

    const type = view.getUint16(entryOffset + 2, little)
    const count = view.getUint32(entryOffset + 4, little)
    const valueOffset = entryOffset + 8

    const value = readValue(view, tiffStart, type, count, valueOffset, little)
    if (value === undefined) continue

    assignExifValue(result, key, value)
  }
  return result
}

function assignExifValue(result: ExifData, key: keyof ExifData, value: string | number): void {
  switch (key) {
    case 'iso':
    case 'orientation':
      result[key] = typeof value === 'number' ? value : Number(value)
      break
    default:
      result[key] = String(value)
  }
}

function readValue(
  view: DataView,
  tiffStart: number,
  type: number,
  count: number,
  valueOffset: number,
  little: boolean,
): string | number | undefined {
  const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 10: 8 }
  const size = typeSizes[type]
  if (!size) return undefined

  const totalBytes = size * count
  const dataOffset = totalBytes > 4 ? tiffStart + view.getUint32(valueOffset, little) : valueOffset

  if (type === 2) {
    // ASCII string
    const chars: string[] = []
    for (let i = 0; i < count - 1; i++) {
      chars.push(String.fromCharCode(view.getUint8(dataOffset + i)))
    }
    return chars.join('').trim()
  }

  if (type === 3) return view.getUint16(dataOffset, little)
  if (type === 4) return view.getUint32(dataOffset, little)

  if (type === 5 || type === 10) {
    // Rational: numerator/denominator
    const num = type === 5 ? view.getUint32(dataOffset, little) : view.getInt32(dataOffset, little)
    const den =
      type === 5 ? view.getUint32(dataOffset + 4, little) : view.getInt32(dataOffset + 4, little)
    if (den === 0) return undefined
    return formatRational(num, den)
  }

  return undefined
}

function formatRational(num: number, den: number): string {
  if (num === 0) return '0'
  const value = num / den
  // Exposure times like 1/125s read better as fractions; others as decimals.
  if (value < 1 && den > num) return `${num}/${den}`
  return value.toFixed(value < 10 ? 1 : 0)
}
