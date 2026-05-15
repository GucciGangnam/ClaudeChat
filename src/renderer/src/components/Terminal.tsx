import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type Props = { chatId: string }

export default function Terminal({ chatId }: Props): React.JSX.Element {
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
