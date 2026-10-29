import { describe, expect, it } from 'vitest'
import { classifyFile, extensionOf, type FileKind } from '../file-kind'

function makeFile(name: string, type = '', lastModified?: number): File {
  return new File(['x'], name, { type, lastModified })
}

describe('classifyFile', () => {
  it.each<[string, string, FileKind]>([
    ['a.bin', 'audio/mpeg', 'audio'],
    ['a.bin', 'video/mp4', 'video'],
    ['a.bin', 'image/png', 'image'],
    ['a.bin', 'application/pdf', 'pdf'],
    ['a.bin', 'audio/x-m4a', 'audio'],
    ['a.bin', 'video/quicktime', 'video'],
  ])('maps the allowlisted MIME of %s (%s) to %s', (name, type, kind) => {
    expect(classifyFile(makeFile(name, type))).toBe(kind)
  })

  it('falls back to the extension when the MIME is empty, whatever its case', () => {
    expect(classifyFile(makeFile('song.MP3'))).toBe('audio')
    expect(classifyFile(makeFile('photo.PNG'))).toBe('image')
    expect(classifyFile(makeFile('doc.Pdf'))).toBe('pdf')
  })

  it('falls back to the extension when the MIME is generic', () => {
    expect(classifyFile(makeFile('clip.mp4', 'application/octet-stream'))).toBe('video')
    expect(classifyFile(makeFile('song.wav', 'application/octet-stream'))).toBe('audio')
  })

  it('does not treat a TypeScript source reported as video/mp2t as video', () => {
    expect(classifyFile(makeFile('main.ts', 'video/mp2t'))).toBe('other')
    expect(classifyFile(makeFile('main.ts'))).toBe('other')
  })

  it('classifies .ogg as audio and .webm as video', () => {
    expect(classifyFile(makeFile('a.ogg'))).toBe('audio')
    expect(classifyFile(makeFile('a.oga'))).toBe('audio')
    expect(classifyFile(makeFile('a.webm'))).toBe('video')
    expect(classifyFile(makeFile('a.ogv'))).toBe('video')
  })

  it('lets a specific MIME beat a misleading extension', () => {
    expect(classifyFile(makeFile('x.txt', 'image/png'))).toBe('image')
    expect(classifyFile(makeFile('x.mp3', 'video/mp4'))).toBe('video')
  })

  it('defers a non-allowlisted MIME to the extension', () => {
    expect(classifyFile(makeFile('report.pdf', 'text/plain'))).toBe('pdf')
    expect(classifyFile(makeFile('notes.txt', 'text/plain'))).toBe('other')
  })

  it('returns other without an extension, for dotfiles and for a trailing dot', () => {
    expect(classifyFile(makeFile('README'))).toBe('other')
    expect(classifyFile(makeFile('.png'))).toBe('other')
    expect(classifyFile(makeFile('archive.'))).toBe('other')
  })

  it('ignores lastModified', () => {
    expect(classifyFile(makeFile('a.pdf', '', 0))).toBe('pdf')
  })

  it('produces every FileKind', () => {
    const sample: Record<FileKind, File> = {
      image: makeFile('a.png'),
      pdf: makeFile('a.pdf'),
      audio: makeFile('a.mp3'),
      video: makeFile('a.mp4'),
      other: makeFile('a.txt'),
    }
    for (const kind of Object.keys(sample) as FileKind[]) {
      expect(classifyFile(sample[kind])).toBe(kind)
    }
  })

  it('classifies a bare { name, type } object like a File', () => {
    expect(classifyFile({ name: 'a.flac', type: '' })).toBe('audio')
  })

  it('does not match object prototype keys', () => {
    expect(classifyFile(makeFile('a.constructor', 'constructor'))).toBe('other')
  })
})

describe('extensionOf', () => {
  it('lowercases the extension and handles edge cases', () => {
    expect(extensionOf('Photo.PNG')).toBe('png')
    expect(extensionOf('archive.tar.gz')).toBe('gz')
    expect(extensionOf('noext')).toBe('')
    expect(extensionOf('.hidden')).toBe('')
    expect(extensionOf('trailing.')).toBe('')
  })
})
