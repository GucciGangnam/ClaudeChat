import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export default function Terminal(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4'
      },
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    const inputDisposable = term.onData((data) => {
      window.api.pty.sendInput(data)
    })

    const offOutput = window.api.pty.onOutput((data) => {
      term.write(data)
    })

    window.api.pty.resize(term.cols, term.rows)

    const handleResize = (): void => {
      try {
        fitAddon.fit()
        window.api.pty.resize(term.cols, term.rows)
      } catch {
        // ignore transient resize errors
      }
    }
    window.addEventListener('resize', handleResize)

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      offOutput()
      inputDisposable.dispose()
      term.dispose()
    }
  }, [])

  return <div ref={containerRef} className="terminal" />
}
