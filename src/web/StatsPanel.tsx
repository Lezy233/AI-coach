import { useId } from 'react'
import { ActivityCalendar, type Activity, type Labels } from 'react-activity-calendar'
import 'react-activity-calendar/tooltips.css'
import { computeStats } from '../domain/stats'
import type { Submission } from '../domain/submission'

export type StatsPanelProps = {
  subs: Submission[]
}

const percentFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const CALENDAR_LABELS: Labels = {
  months: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  legend: {
    less: '少',
    more: '多',
  },
}

const CALENDAR_THEME = {
  light: ['#f4f3ec', '#e9d5ff', '#d8b4fe', '#c084fc', '#aa3bff'],
  dark: ['#1f2028', '#3b2a4d', '#5b3a78', '#8b5cf6', '#c084fc'],
}

// 只把 computeStats 的 byDay 结果映射成日历组件需要的格式，不参与统计。
function toCalendarActivities(byDay: Record<string, number>): Activity[] {
  return Object.keys(byDay)
    .sort()
    .map((date) => ({
      date,
      count: byDay[date],
      level: Math.min(byDay[date], 4),
    }))
}

export function StatsPanel({ subs }: StatsPanelProps) {
  const titleId = useId()
  const stats = computeStats(subs)
  const activities = toCalendarActivities(stats.byDay)
  const verdictEntries = Object.entries(stats.byVerdict).filter(
    ([, count]) => count > 0,
  )

  return (
    <section className="stats-panel" aria-labelledby={titleId}>
      <h2 id={titleId}>提交统计</h2>

      <dl className="stats-summary">
        <div>
          <dt>总提交数</dt>
          <dd>{stats.total}</dd>
        </div>
        <div>
          <dt>AC 率</dt>
          <dd>{percentFormatter.format(stats.acceptedRate)}</dd>
        </div>
      </dl>

      <div className="stats-block">
        <h3>Verdict 分布</h3>
        {verdictEntries.length > 0 ? (
          <ul className="stats-verdict-list">
            {verdictEntries.map(([verdict, count]) => (
              <li key={verdict}>
                <span className="stats-verdict-name">{verdict}</span>
                <span className="stats-verdict-count">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="stats-empty">暂无提交记录。</p>
        )}
      </div>

      <div className="stats-block">
        <h3>每日提交</h3>
        {activities.length > 0 ? (
          <div className="stats-calendar">
            <ActivityCalendar
              data={activities}
              labels={CALENDAR_LABELS}
              theme={CALENDAR_THEME}
              weekStart={1}
              showWeekdayLabels={['mon', 'wed', 'fri']}
              showTotalCount={false}
              blockSize={11}
              blockMargin={3}
              blockRadius={2}
              fontSize={12}
              tooltips={{
                activity: {
                  text: (activity) =>
                    `${activity.date}：${activity.count} 次提交`,
                },
              }}
            />
          </div>
        ) : (
          <p className="stats-empty">暂无提交记录。</p>
        )}
      </div>
    </section>
  )
}
