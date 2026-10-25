import type { GHEvent, Repo } from "@/lib/github"
import { commitCount } from "@/lib/github"

const PALETTE = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#64748b"]

export function LanguageDonut({ repos }: { repos: Repo[] }) {
  const counts = new Map<string, number>()
  repos.forEach((r) => r.language && counts.set(r.language, (counts.get(r.language) || 0) + 1))
  const sorted = [...counts].sort((a, b) => b[1] - a[1])
  const slices = sorted.slice(0, 8)
  const rest = sorted.slice(8).reduce((s, x) => s + x[1], 0)
  if (rest) slices.push(["Other", rest])
  const total = slices.reduce((s, x) => s + x[1], 0)
  if (!total) return <p className="text-sm text-muted-foreground">No language data in public repositories.</p>

  const R = 40, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" className="size-36 shrink-0 -rotate-90" role="img" aria-label="Language distribution by repository count">
        {slices.map(([lang, n], i) => {
          const len = (n / total) * C
          const el = (
            <circle key={lang} cx="50" cy="50" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]}
              strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <ul className="space-y-1 text-sm">
        {slices.map(([lang, n], i) => (
          <li key={lang} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            {lang}
            <span className="text-muted-foreground">{Math.round((n / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StarsBar({ repos }: { repos: Repo[] }) {
  const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 8)
  const max = Math.max(1, top[0]?.stargazers_count || 0)
  if (!top.length) return <p className="text-sm text-muted-foreground">No public repositories.</p>
  return (
    <ul className="space-y-2" aria-label="Repositories by stars">
      {top.map((r) => (
        <li key={r.id} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={r.name}>{r.name}</span>
          <div className="h-2.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.stargazers_count / max) * 100}%` }} />
          </div>
          <span className="tabular-nums text-muted-foreground">{r.stargazers_count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  )
}

const LEVELS = [
  "fill-muted",
  "fill-emerald-200 dark:fill-emerald-900",
  "fill-emerald-300 dark:fill-emerald-700",
  "fill-emerald-500",
  "fill-emerald-700 dark:fill-emerald-300",
]

export function Heatmap({ events }: { events: GHEvent[] }) {
  const WEEKS = 14
  const counts = new Map<string, number>()
  events.forEach((e) => {
    if (e.type === "WatchEvent" || e.type === "ForkEvent") return
    const key = e.created_at.slice(0, 10)
    counts.set(key, (counts.get(key) || 0) + (e.type === "PushEvent" ? commitCount(e) : 1))
  })
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - today.getUTCDay() - (WEEKS - 1) * 7)
  const cells: { key: string; n: number; i: number }[] = []
  for (const d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    cells.push({ key, n: counts.get(key) || 0, i: cells.length })
  }
  const max = Math.max(1, ...cells.map((c) => c.n))
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const total = cells.reduce((s, c) => s + c.n, 0)

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WEEKS * 14} 98`} className="w-full min-w-[320px] max-w-xl" role="img"
          aria-label={`Contribution heatmap: ${total} contributions in the last ${WEEKS} weeks`}>
          {cells.map((c) => (
            <rect key={c.key} x={Math.floor(c.i / 7) * 14} y={(c.i % 7) * 14} width="11" height="11" rx="2"
              className={LEVELS[level(c.n)]}>
              <title>{`${c.n} contribution${c.n === 1 ? "" : "s"} on ${c.key}`}</title>
            </rect>
          ))}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {total} contributions in the last {WEEKS} weeks, built from public events. GitHub's events API only returns the latest ~90 days or 300 events.
      </p>
    </div>
  )
}
