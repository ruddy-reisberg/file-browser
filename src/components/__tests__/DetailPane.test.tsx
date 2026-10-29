import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DetailPane from '../DetailPane'
import type { TreeNode } from '../../lib/types'

const mounts = vi.hoisted(() => ({ image: 0 }))

vi.mock('../ImagePreview', () => ({
  default: function ImagePreviewDouble({ file }: { file: File }) {
    useEffect(() => {
      mounts.image += 1
    }, [])
    return <div data-testid="image-preview">{file.name}</div>
  },
}))

vi.mock('../PdfPreview', () => ({
  default: ({ file }: { file: File }) => <div data-testid="pdf-preview">{file.name}</div>,
}))

function fileNode(name: string, type = '', path = name): TreeNode {
  return { name, kind: 'file', path, file: new File(['x'], name, { type }) }
}

describe('DetailPane', () => {
  beforeEach(() => {
    mounts.image = 0
  })

  it('shows a hint when nothing is selected', () => {
    render(<DetailPane node={null} />)
    expect(screen.getByText('Select a file or folder to see its details.')).toBeTruthy()
  })

  it('summarises a folder', () => {
    const dir: TreeNode = { name: 'docs', kind: 'dir', path: 'docs', children: [fileNode('a.txt')] }
    render(<DetailPane node={dir} />)
    expect(screen.getByText('docs')).toBeTruthy()
    expect(screen.getByText('Folder · 1 item')).toBeTruthy()
  })

  it('shows the metadata rows and no preview for a file of another kind', () => {
    render(<DetailPane node={fileNode('notes.txt', 'text/plain')} />)
    expect(screen.getByText('Kind')).toBeTruthy()
    expect(screen.getByText('Size')).toBeTruthy()
    expect(screen.getByText('Last modified')).toBeTruthy()
    expect(screen.queryByTestId('image-preview')).toBeNull()
    expect(screen.queryByTestId('pdf-preview')).toBeNull()
  })

  it('routes an image to the image preview', () => {
    render(<DetailPane node={fileNode('photo.png', 'image/png')} />)
    expect(screen.getByTestId('image-preview').textContent).toBe('photo.png')
  })

  it('routes a PDF to the PDF preview', () => {
    render(<DetailPane node={fileNode('doc.pdf', 'application/pdf')} />)
    expect(screen.getByTestId('pdf-preview').textContent).toBe('doc.pdf')
    expect(screen.queryByTestId('image-preview')).toBeNull()
  })

  it('shows metadata only for audio and video until they have a player', () => {
    const { rerender } = render(<DetailPane node={fileNode('song.mp3', 'audio/mpeg')} />)
    expect(screen.getByText('MP3 Audio')).toBeTruthy()
    rerender(<DetailPane node={fileNode('clip.mp4', 'video/mp4')} />)
    expect(screen.getByText('MP4 Video')).toBeTruthy()
    expect(screen.queryByTestId('image-preview')).toBeNull()
    expect(screen.queryByTestId('pdf-preview')).toBeNull()
  })

  it('remounts the preview when the selection changes, even between two images', () => {
    const { rerender } = render(<DetailPane node={fileNode('a.png', 'image/png')} />)
    rerender(<DetailPane node={fileNode('b.png', 'image/png')} />)
    expect(mounts.image).toBe(2)
    expect(screen.getByTestId('image-preview').textContent).toBe('b.png')
  })

  it('keeps the preview mounted while the same node is re-rendered', () => {
    const node = fileNode('a.png', 'image/png')
    const { rerender } = render(<DetailPane node={node} />)
    rerender(<DetailPane node={node} />)
    expect(mounts.image).toBe(1)
  })
})
