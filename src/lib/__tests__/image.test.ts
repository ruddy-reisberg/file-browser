import { describe, expect, it } from 'vitest'
import { isImageFile, parseExif } from '../image'

function makeFile(name: string, type: string): File {
  return new File(['x'], name, { type })
}

describe('isImageFile', () => {
  it('detects images by mime type', () => {
    expect(isImageFile(makeFile('photo.jpg', 'image/jpeg'))).toBe(true)
  })

  it('detects images by extension when mime type is missing', () => {
    expect(isImageFile(makeFile('photo.PNG', ''))).toBe(true)
  })

  it('rejects non-image files', () => {
    expect(isImageFile(makeFile('notes.txt', 'text/plain'))).toBe(false)
  })
})

describe('parseExif', () => {
  it('returns an empty object for non-JPEG files', async () => {
    const exif = await parseExif(makeFile('photo.png', 'image/png'))
    expect(exif).toEqual({})
  })

  it('returns an empty object for a JPEG without a valid EXIF segment', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const file = new File([bytes], 'empty.jpg', { type: 'image/jpeg' })
    const exif = await parseExif(file)
    expect(exif).toEqual({})
  })
})
