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

  function failWith(el: HTMLMediaElement, code?: number) {
    Object.defineProperty(el, 'error', { configurable: true, value: code === undefined ? null : { code } })
    fireEvent(el, new Event('error'))
  }

  it('shows the unsupported-format message in place of the player (code 4)', () => {
    const { container } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    failWith(container.querySelector('audio')!, 4)
    expect(container.querySelector('audio')).toBeNull()
    const msg = container.querySelector('.detail-pane__error')!
    expect(msg.textContent).toBe('This file cannot be played in this browser.')
    expect(msg.getAttribute('role')).toBe('alert')
  })

  it('shows the generic message for another or missing code', () => {
    const a = render(<MediaPlayer file={media('a.mp4', 'video/mp4')} kind="video" />)
    failWith(a.container.querySelector('video')!, 2)
    expect(a.container.querySelector('.detail-pane__error')!.textContent).toBe('Could not play this file.')
    expect(a.container.querySelector('video')).toBeNull()
    a.unmount()
    const b = render(<MediaPlayer file={media('b.mp3', 'audio/mpeg')} kind="audio" />)
    failWith(b.container.querySelector('audio')!)
    expect(b.container.querySelector('.detail-pane__error')!.textContent).toBe('Could not play this file.')
  })

  it('recovers with a new player when another file is given after an error', () => {
    const { container, rerender } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    failWith(container.querySelector('audio')!, 4)
    rerender(<MediaPlayer file={media('b.mp3', 'audio/mpeg')} kind="audio" />)
    expect(container.querySelector('.detail-pane__error')).toBeNull()
    expect(container.querySelector('audio')!.getAttribute('src')).toBe('blob:b.mp3')
  })

  it('pauses before revoking on unmount', () => {
    const { unmount } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    unmount()
    expect(pause).toHaveBeenCalledTimes(1)
    expect(pause.mock.invocationCallOrder[0]).toBeLessThan(revokeObjectURL.mock.invocationCallOrder[0])
  })

  it('pauses before revoking when the file changes, and leaves no element after unmount', () => {
    const { container, rerender, unmount } = render(<MediaPlayer file={media('a.mp3', 'audio/mpeg')} kind="audio" />)
    rerender(<MediaPlayer file={media('b.mp3', 'audio/mpeg')} kind="audio" />)
    expect(pause).toHaveBeenCalled()
    expect(pause.mock.invocationCallOrder[0]).toBeLessThan(revokeObjectURL.mock.invocationCallOrder[0])
    expect(container.querySelectorAll('audio')).toHaveLength(1)
    unmount()
    expect(container.querySelector('audio')).toBeNull()
  })
})
