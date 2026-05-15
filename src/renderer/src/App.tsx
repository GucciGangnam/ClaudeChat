import Terminal from './components/Terminal'

function App(): React.JSX.Element {
  return (
    <div className="app">
      <header className="titlebar">ClaudeChat — Phase 3: claude wrapped in tmux</header>
      <main className="terminal-pane">
        <Terminal />
      </main>
    </div>
  )
}

export default App
