import { useEffect, useRef } from 'react'
import { Terminal as XTerm, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type Props = { chatId: string }

// Claude's TUI assumes a dark background — its dim/reasoning text becomes
// unreadable on a white background — so we always render dark here even
// when the rest of the app is in light mode.
const TERMINAL_THEME: ITheme = {
  background: '#16161a',
  foreground: '#e8e8ed',
  cursor: '#e8e8ed',
  selectionBackground: 'rgba(74, 134, 255, 0.35)'
}

export default function Terminal({ chatId }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: 11,
      lineHeight: 1.2,
      theme: TERMINAL_THEME,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    const offOutput = window.api.chat.onOutput((incomingChatId, data) => {
      if (incomingChatId === chatId) {
        term.write(data)
      }
    })

    const inputDisposable = term.onData((data) => {
      window.api.chat.sendInput(chatId, data)
    })

    window.api.chat.attach(chatId, term.cols, term.rows)

    const handleResize = (): void => {
      try {
        fitAddon.fit()
        window.api.chat.resize(chatId, term.cols, term.rows)
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
  }, [chatId])

  return <div ref={containerRef} className="terminal" />
}
