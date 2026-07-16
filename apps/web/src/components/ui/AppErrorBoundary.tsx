import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/**
 * Last-resort catch for render crashes. Without it, any uncaught error
 * unmounts the whole tree and leaves a blank cream page with no feedback.
 * Inline styles only — must render even if the stylesheet never loaded.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    console.error('Unhandled app error:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#FBF7F2',
          fontFamily: "'Jost', system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#BFA14A',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Braids by Deb
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '34px',
              fontWeight: 500,
              color: '#111111',
              margin: '10px 0 8px',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: '#57534E', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            An unexpected error interrupted the page. Nothing was lost — reload to
            continue where you left off.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '22px',
              padding: '13px 34px',
              borderRadius: '999px',
              border: 'none',
              background: '#111111',
              color: '#FBF7F2',
              fontSize: '14px',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
