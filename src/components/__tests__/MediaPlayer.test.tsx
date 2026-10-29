import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MediaPlayer from '../MediaPlayer'

function media(name: string, type: string): File {
  return new File(['x'], name, { type })
}

describe('MediaPlayer', () => {
  const createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`)
  const revokeObjectURL = vi.fn()
  const play = vi.fn()
  const pause = vi.fn()
  const load = vi.fn()

  beforeEach(() => {
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    play.mockClear()
    pause.mockClear()
    load.mockClear()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    HTMLMediaElement.prototype.play = play
    HTMLMediaElement.prototype.pause = pause
    HTMLMediaElement.prototype.load = load
  })

  it('renders a native audio element with controls for audio', () => {
    const { container } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    const el = container.querySelector('audio')!
    expect(el).toBeTruthy()
    expect(container.querySelector('video')).toBeNull()
    expect(el.hasAttribute('controls')).toBe(true)
    expect(el.getAttribute('preload')).toBe('metadata')
    expect(el.getAttribute('src')).toBe('blob:a.mp3')
    expect(el.getAttribute('aria-label')).toBe('a.mp3')
    expect(el.hasAttribute('autoplay')).toBe(false)
  })

  it('renders a native video element with controls for video', () => {
    const { container } = render(<MediaPlayer file={media('a.mp4', 'video/mp4')} kind="video" />)
    const el = container.querySelector('video')!
    expect(el).toBeTruthy()
    expect(container.querySelector('audio')).toBeNull()
    expect(el.hasAttribute('controls')).toBe(true)
    expect(el.getAttribute('src')).toBe('blob:a.mp4')
    expect(el.getAttribute('aria-label')).toBe('a.mp4')
    expect(el.hasAttribute('autoplay')).toBe(false)
  })

  it('never calls play on mount', () => {
    render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    expect(play).not.toHaveBeenCalled()
  })

  it('keeps the URL and src after loadedmetadata and ended so the user can replay', () => {
    const { container } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    const el = container.querySelector('audio')!
    fireEvent(el, new Event('loadedmetadata'))
    fireEvent(el, new Event('ended'))
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(el.getAttribute('src')).toBe('blob:a.mp3')
  })

  it('revokes the URL once on unmount', () => {
    const { unmount } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.mp3')
  })

  it('revokes the previous URL when the file changes', () => {
    const { rerender, unmount } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    rerender(<MediaPlayer file={media('b.mp3', 'audio/mpeg')} kind="audio" />)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.mp3')
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:b.mp3')
    expect(play).not.toHaveBeenCalled()
  })
})
