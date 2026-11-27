import './App.css'
import useSubmissions from './hooks/useSubmissions'
import { StatsPanel } from './StatsPanel'
import { SettingsProvider } from './SettingsProvider'
import { ImportPanel } from './ImportPanel'
import { AnalysisPanel } from './AnalysisPanel'
import { SettingsPanel } from './SettingsPanel'

function App() {
  const { subs, importSubmissions } = useSubmissions()

  return (
    <section id="center">
      <StatsPanel subs={subs} />
      <SettingsProvider>
        <ImportPanel importSubmissions={importSubmissions} />

        <AnalysisPanel />

        <SettingsPanel />
      </SettingsProvider>
    </section>
  )
}

export default App
