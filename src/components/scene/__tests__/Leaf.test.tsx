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
