import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Leaf from '../Leaf'

describe('Leaf', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderLeaf(onClose = vi.fn()) {
    render(
      <Leaf label="holiday.jpg" onClose={onClose}>
        <p>metadata here</p>
      </Leaf>,
    )
    return onClose
  }

  it('is an accessible modal dialog named after the file, showing its content', () => {
    renderLeaf()

    const dialog = screen.getByRole('dialog', { name: 'holiday.jpg' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('metadata here')).toBeInTheDocument()
  })

  it('moves focus to the close button on open', () => {
    renderLeaf()

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('folds away, then closes, when the close button is pressed', () => {
    const onClose = renderLeaf()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('dialog')).toHaveClass('leaf--closing')
    expect(onClose).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape without letting the key reach the scene behind it', () => {
    const onClose = vi.fn()
    const onOuterKey = vi.fn()
    render(
      <div onKeyDown={onOuterKey}>
        <Leaf label="a.txt" onClose={onClose}>
          <p>x</p>
        </Leaf>
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onOuterKey).not.toHaveBeenCalled()
  })

  it('closes when the backdrop is clicked, but not when the leaf itself is', () => {
    const onClose = renderLeaf()

    fireEvent.click(screen.getByText('metadata here'))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('dialog').parentElement!)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('only closes once, however many times it is asked', () => {
    const onClose = renderLeaf()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab inside the dialog', () => {
    renderLeaf()
    const close = screen.getByRole('button', { name: 'Close' })

    // The close button is the only focusable element: Tab and Shift+Tab must both stay on it.
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(close).toHaveFocus()
  })

  describe('with media', () => {
    let pause: ReturnType<typeof vi.fn>

    beforeEach(() => {
      pause = vi.fn()
      HTMLMediaElement.prototype.pause = pause as unknown as () => void
      HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
      HTMLMediaElement.prototype.load = vi.fn()
    })

    function renderMedia(tag: 'audio' | 'video' = 'audio') {
      const onClose = vi.fn()
      const Tag = tag
      render(
        <Leaf label="song.mp3" onClose={onClose}>
          <Tag controls tabIndex={-1} data-testid="media" />
        </Leaf>,
      )
      return onClose
    }

    it('pauses at once when the close button is pressed, before the timer fires', () => {
      const onClose = renderMedia()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(pause).toHaveBeenCalledTimes(1)
      expect(onClose).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('pauses at once on Escape', () => {
      const onClose = renderMedia()
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(pause).toHaveBeenCalledTimes(1)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('pauses at once when the backdrop is clicked', () => {
      const onClose = renderMedia()
      fireEvent.click(screen.getByRole('dialog').parentElement!)
      expect(pause).toHaveBeenCalledTimes(1)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('pauses a video too', () => {
      renderMedia('video')
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(pause).toHaveBeenCalledTimes(1)
    })

    it('does not pause a second time when close is asked twice', () => {
      renderMedia()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(pause).toHaveBeenCalledTimes(1)
    })

    it('closes as before when there is no media', () => {
      const onClose = renderLeaf()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(pause).not.toHaveBeenCalled()
    })

    it('includes the media element in the focus trap', () => {
      renderMedia()
      const close = screen.getByRole('button', { name: 'Close' })
      const media = screen.getByTestId('media')
      media.focus()
      expect(media).toHaveFocus()

      fireEvent.keyDown(media, { key: 'Tab' })
      expect(close).toHaveFocus()
      fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
      expect(media).toHaveFocus()
    })
  })

  it('gives focus back to the element that opened it', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const { unmount } = render(
      <Leaf label="a.txt" onClose={() => {}}>
        <p>x</p>
      </Leaf>,
    )
    expect(opener).not.toHaveFocus()
    unmount()

    expect(opener).toHaveFocus()
    opener.remove()
  })
})
