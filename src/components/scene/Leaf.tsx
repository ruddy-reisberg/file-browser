import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import './Leaf.css'

/** Matches the exit animation in Leaf.css; the fallback timer guarantees the leaf closes. */
const CLOSE_MS = 260

interface LeafProps {
  /** Accessible name of the dialog (the file name). */
  label: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * The metadata card of one file: a modal shaped like a leaf that unfurls in,
 * sways gently while open and folds away when closed.
 */
export default function Leaf({ label, onClose, children }: LeafProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const [closing, setClosing] = useState(false)

  // Move focus into the leaf, and hand it back to whatever had it when the leaf goes away.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => {
      window.clearTimeout(closeTimer.current)
      previous?.focus()
    }
  }, [])

  function requestClose() {
    if (closing) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      requestClose()
      return
    }
    if (event.key !== 'Tab') return

    // Keep Tab inside the dialog.
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className={`leaf-overlay${closing ? ' leaf-overlay--closing' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`leaf${closing ? ' leaf--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={handleKeyDown}
      >
        <div className="leaf__sway">
          <span className="leaf__stem" aria-hidden="true" />
          <div className="leaf__blade">
            <button ref={closeRef} type="button" className="leaf__close" aria-label="Close" onClick={requestClose}>
              ×
            </button>
            <div className="leaf__paper">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
