import Terminal from './components/Terminal'

function App(): React.JSX.Element {
  return (
    <div className="app">
      <header className="titlebar">ClaudeChat — Phase 1: hello bash</header>
      <main className="terminal-pane">
        <Terminal />
      </main>
    </div>
  )
}

export default App
