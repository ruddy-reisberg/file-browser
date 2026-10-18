import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Called once when the 3D view fails to load or render (no WebGL, chunk failure, GPU context loss…). */
  onError: (message: string) => void
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Keeps a 3D failure from taking the whole app down: the parent falls back to the classic list view. */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error.message || 'The 3D view could not start.')
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
