import { memo, useState } from 'react'
import './App.css'
import type { Submission, Verdict } from '../domain/submission'
import useSubmissions from './hooks/useSubmissions'
import { StatsPanel } from './StatsPanel'
import { SettingsProvider } from './SettingsProvider'
import { useSettings } from './hooks/useSettings'
import { ImportPanel } from './ImportPanel'

function SettingsPanel() {
  const { settings, setApiKey, setModel } = useSettings();
  const [ keyInput, setKeyInput ] = useState("");

  return (
    <div>
      <h2>AI Settings</h2>

      <label>
        API Key:
        <input
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
        />
        <button onClick={() => {
          setApiKey(keyInput)
        }}>Apply</button>
      </label>

      <br />

      <label>
        Model:
        <select
          value={settings.model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
        </select>
      </label>
    </div>
  )
}

const AnalysisBar = memo(function AnalysisBar() {
  const { settings } = useSettings();

  return (
    <div>
      <h2>Analysis Bar</h2>
      <p>Current API Key: {settings.apiKey}</p>
      <p>Current Model: {settings.model}</p>
    </div>
  )
});

function submissionUiKey({ platform, id }: Submission) {
  return `${platform}:${id}`;
}

function SubmissionList({
  submission,
  verdict,
  expandedIds,
  onToggle
}: {
  submission: Submission[],
  verdict: Verdict,
  expandedIds: Set<string>,
  onToggle: (key: string) => void
}) {
  return (
    <ul>
      {submission.filter((s) => s.verdict === verdict).map((s) => {
        const key = submissionUiKey(s);

        return (
          <li key={key}>
            {s.problem} - {s.verdict}
            <button onClick={() => onToggle(key)}>
              {expandedIds.has(key) ? "收起" : "展开"}
            </button>
          </li>
        );
      })}
    </ul>
  )
}

function SettingsSection() {
  return (
    <div>
      <SettingsPanel />
      <AnalysisBar />
    </div>
  )
}


function ShowAll({ submission }: {
  submission: Submission[],
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (key: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }

  return (
    <div>
      <SettingsSection />

      <h2>AC 部分</h2>
      <SubmissionList
        submission={submission}
        verdict="AC"
        expandedIds={expandedIds}
        onToggle={toggleExpanded}
      />

      <h2>WA 部分</h2>
      <SubmissionList
        submission={submission}
        verdict="WA"
        expandedIds={expandedIds}
        onToggle={toggleExpanded}
      />
    </div>
  )
}

function App() {
  const { subs, importSubmissions, markAC } = useSubmissions()

  return (
    <>
      <section id="center">
        <StatsPanel subs={subs} />
        <SettingsProvider>
          <ImportPanel importSubmissions={importSubmissions} />

          <ul>
            {subs.map((s) => (
              <li key={submissionUiKey(s)}>
                {s.problem} - {s.verdict}
                <button onClick={() => markAC(s.platform, s.id)}>标为 AC</button>
              </li>
            ))}
          </ul>


          <ShowAll submission={subs}/>
        </SettingsProvider>
      </section>
    </>
  )
}

export default App
