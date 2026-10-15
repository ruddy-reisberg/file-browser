import { describe, expect, it } from 'vitest'
import { describeKind, extensionOf, formatBytes, getFileMetadata } from '../metadata'

describe('formatBytes', () => {
  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes without decimals', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes and gigabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB')
  })

  it('rejects negative sizes', () => {
    expect(() => formatBytes(-1)).toThrow(RangeError)
  })
})

describe('extensionOf', () => {
  it('returns the lowercase extension', () => {
    expect(extensionOf('Photo.JPG')).toBe('jpg')
  })

  it('returns empty string for no extension', () => {
    expect(extensionOf('README')).toBe('')
  })

  it('returns empty string for a leading dot (dotfile)', () => {
    expect(extensionOf('.gitignore')).toBe('')
  })
})

describe('describeKind', () => {
  it('maps known extensions to friendly labels', () => {
    expect(describeKind('photo.png', 'image/png')).toBe('PNG Image')
    expect(describeKind('index.tsx', 'text/plain')).toBe('TypeScript (JSX) File')
  })

  it('falls back to mime subtype when extension is unknown', () => {
    expect(describeKind('data.bin', 'application/octet-stream')).toBe('OCTET-STREAM (application)')
  })

  it('falls back to a generic label when nothing is known', () => {
    expect(describeKind('noext', '')).toBe('File')
  })
})

describe('getFileMetadata', () => {
  it('builds a full metadata record from a File', () => {
    const file = new File(['hello'], 'hello.txt', {
      type: 'text/plain',
      lastModified: Date.UTC(2024, 0, 1),
    })

    const meta = getFileMetadata(file)

    expect(meta.name).toBe('hello.txt')
    expect(meta.sizeBytes).toBe(5)
    expect(meta.kindLabel).toBe('Plain Text File')
    expect(meta.mimeType).toBe('text/plain')
    expect(meta.lastModifiedMs).toBe(Date.UTC(2024, 0, 1))
  })
})
