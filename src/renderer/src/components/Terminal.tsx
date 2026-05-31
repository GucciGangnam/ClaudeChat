import { useEffect, useRef } from 'react'
import { Terminal as XTerm, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type Props = {
  chatId: string
  // Bumped every time the user picks this chat in the sidebar, so we can
  // refocus the terminal even when the user re-selects the chat already
  // showing (which doesn't remount this component).
  focusTick: number
}

// Claude's TUI assumes a dark background — its dim/reasoning text becomes
// unreadable on a white background — so we always render dark here even
// when the rest of the app is in light mode.
const TERMINAL_THEME: ITheme = {
  background: '#16161a',
  foreground: '#e8e8ed',
  cursor: '#e8e8ed',
  selectionBackground: 'rgba(74, 134, 255, 0.35)'
}

export default function Terminal({ chatId, focusTick }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)

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
    termRef.current = term

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    term.focus()

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
      termRef.current = null
      term.dispose()
    }
  }, [chatId])

  // Refocus when the user picks this chat in the sidebar (even if the
  // component didn't remount). Skips the very first run because the main
  // effect above already focuses on mount.
  const firstFocusRunRef = useRef(true)
  useEffect(() => {
    if (firstFocusRunRef.current) {
      firstFocusRunRef.current = false
      return
    }
    termRef.current?.focus()
  }, [focusTick])

  return <div ref={containerRef} className="terminal" />
}
