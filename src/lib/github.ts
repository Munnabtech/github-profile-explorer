export interface Profile {
  login: string; name: string | null; avatar_url: string; html_url: string
  bio: string | null; company: string | null; location: string | null
  blog: string | null; twitter_username: string | null
  followers: number; following: number; public_repos: number; created_at: string
}
export interface Repo {
  id: number; name: string; full_name: string; html_url: string
  description: string | null; fork: boolean; language: string | null
  topics?: string[]; stargazers_count: number; forks_count: number
  watchers_count: number; open_issues_count: number
  pushed_at: string; homepage: string | null
}
export interface GHEvent {
  id: string; type: string; created_at: string
  repo: { name: string }
  payload: any
}

export class GHError extends Error {
  kind: "notfound" | "rate" | "other"
  reset?: number
  constructor(kind: "notfound" | "rate" | "other", message: string, reset?: number) {
    super(message)
    this.kind = kind
    this.reset = reset
  }
}

const BASE = "https://api.github.com"
export const getToken = () => localStorage.getItem("gh_token") || ""
export const setToken = (t: string) =>
  t ? localStorage.setItem("gh_token", t) : localStorage.removeItem("gh_token")

async function gh<T>(path: string, accept = "application/vnd.github+json"): Promise<T> {
  const token = getToken()
  const res = await fetch(BASE + path, {
    headers: { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (res.status === 404) throw new GHError("notfound", "Not found")
  if (res.status === 401) throw new GHError("other", "Your token was rejected. Remove it or paste a valid one.")
  if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000 || undefined
    throw new GHError("rate", "Rate limit exceeded", reset)
  }
  if (!res.ok) throw new GHError("other", `GitHub API error (${res.status})`)
  return (accept.includes("html") ? await res.text() : await res.json()) as T
}

async function loadRepos(login: string): Promise<Repo[]> {
  const all: Repo[] = []
  for (let page = 1; page <= 5; page++) {
    const batch = await gh<Repo[]>(`/users/${login}/repos?per_page=100&page=${page}&sort=pushed`)
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all
}

export const commitCount = (e: GHEvent): number =>
  e.payload?.size ?? e.payload?.commits?.length ?? 1

async function loadEvents(login: string): Promise<GHEvent[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((p) =>
      gh<GHEvent[]>(`/users/${login}/events/public?per_page=100&page=${p}`).catch(() => [] as GHEvent[])
    )
  )
  const events = pages.flat()
  // GitHub may omit commit messages from push payloads; fetch a few so the feed stays useful.
  const pushes = events
    .filter((e) => e.type === "PushEvent" && !e.payload?.commits?.length && e.payload?.head)
    .slice(0, 6)
  await Promise.all(
    pushes.map(async (e) => {
      try {
        const c = await gh<any>(`/repos/${e.repo.name}/commits/${e.payload.head}`)
        e.payload.commits = [{ message: c.commit.message }]
      } catch { /* ignore */ }
    })
  )
  return events
}

export async function loadUser(name: string) {
  const profile = await gh<Profile>(`/users/${encodeURIComponent(name)}`)
  const [repos, events] = await Promise.all([loadRepos(profile.login), loadEvents(profile.login)])
  return { profile, repos, events }
}
export type UserData = Awaited<ReturnType<typeof loadUser>>

export async function getReadme(fullName: string): Promise<string> {
  try {
    return await gh<string>(`/repos/${fullName}/readme`, "application/vnd.github.html+json")
  } catch {
    return ""
  }
}

/* ---------- helpers ---------- */
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
export function timeAgo(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60],
  ]
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u)
  return "just now"
}
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
export const fmt = (n: number) => compact.format(n)

const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "")
export function describeEvent(e: GHEvent): { text: string; detail?: string } {
  const p = e.payload ?? {}
  switch (e.type) {
    case "PushEvent": {
      const n = commitCount(e)
      const branch = String(p.ref ?? "").replace("refs/heads/", "")
      const last = p.commits?.[p.commits.length - 1]?.message as string | undefined
      return { text: `Pushed ${n} commit${n === 1 ? "" : "s"}${branch ? ` to ${branch}` : ""}`, detail: last?.split("\n")[0] }
    }
    case "PullRequestEvent":
      return {
        text: `${p.action === "closed" && p.pull_request?.merged ? "Merged" : cap(p.action)} pull request #${p.number}`,
        detail: p.pull_request?.title,
      }
    case "IssuesEvent": return { text: `${cap(p.action)} issue #${p.issue?.number}`, detail: p.issue?.title }
    case "IssueCommentEvent": return { text: `Commented on #${p.issue?.number}`, detail: p.issue?.title }
    case "WatchEvent": return { text: "Starred" }
    case "ForkEvent": return { text: "Forked" }
    case "ReleaseEvent": return { text: `Released ${p.release?.tag_name ?? ""}`, detail: p.release?.name }
    case "CreateEvent": return { text: `Created ${p.ref_type}${p.ref ? ` ${p.ref}` : ""}` }
    case "DeleteEvent": return { text: `Deleted ${p.ref_type} ${p.ref ?? ""}` }
    default: return { text: e.type.replace("Event", "") }
  }
}
