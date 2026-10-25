import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import {
  AtSign, Building2, CalendarDays, CircleDot, GitBranch, GitCommitHorizontal, GitFork, GitPullRequest,
  History, KeyRound, Link2, MapPin, Moon, Search, Star, Sun, Tag, Users, Eye, X, MessageSquare, TriangleAlert,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heatmap, LanguageDonut, StarsBar } from "@/components/charts"
import { RepoBrowser } from "@/components/RepoBrowser"
import {
  GHError, describeEvent, fmt, getToken, loadUser, setToken, timeAgo, type UserData,
} from "@/lib/github"

type State =
  | { status: "idle" } | { status: "loading" }
  | { status: "error"; err: GHError } | { status: "ready"; data: UserData }

const SUGGESTED = ["torvalds", "gaearon", "sindresorhus", "yyx990803", "tj", "ThePrimeagen"]
const RECENT_KEY = "gh_recent"
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") } catch { return [] } }

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches
  })
  const [state, setState] = useState<State>({ status: "idle" })
  const [input, setInput] = useState("")
  const [recent, setRecent] = useState<string[]>(readRecent)
  const [tokenOpen, setTokenOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])

  const search = useCallback(async (name: string, push = true) => {
    const user = name.trim().replace(/^@/, "")
    if (!user) return
    setInput(user)
    setState({ status: "loading" })
    if (push) history.pushState(null, "", `?user=${encodeURIComponent(user)}`)
    try {
      const data = await loadUser(user)
      setState({ status: "ready", data })
      document.title = `${data.profile.login} · GitHub Profile Explorer`
      const next = [data.profile.login, ...readRecent().filter((r) => r.toLowerCase() !== data.profile.login.toLowerCase())].slice(0, 8)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      setRecent(next)
    } catch (e) {
      setState({ status: "error", err: e instanceof GHError ? e : new GHError("other", (e as Error).message) })
    }
  }, [])

  // Shareable links: /?user=torvalds
  useEffect(() => {
    const init = () => {
      const u = new URLSearchParams(location.search).get("user")
      if (u) search(u, false)
      else { setState({ status: "idle" }); setInput(""); document.title = "GitHub Profile Explorer" }
    }
    init()
    window.addEventListener("popstate", init)
    return () => window.removeEventListener("popstate", init)
  }, [search])

  // "/" focuses the search box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const submit = (e: FormEvent) => { e.preventDefault(); search(input) }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a href="?" className="text-lg font-semibold tracking-tight">GitHub Profile Explorer</a>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setTokenOpen(true)}>
              <KeyRound /> {getToken() ? "Token set" : "Add token"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section aria-label="Search" className="space-y-3">
          <form onSubmit={submit} role="search" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className="pl-9"
                placeholder="Enter a GitHub username (press / to focus)" aria-label="GitHub username"
                autoComplete="off" autoCapitalize="off" spellCheck={false} />
            </div>
            <Button type="submit" disabled={state.status === "loading"}>Load profile</Button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Try</span>
            {SUGGESTED.map((u) => <Button key={u} size="sm" variant="outline" onClick={() => search(u)}>{u}</Button>)}
          </div>
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <History className="size-4 text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Recent</span>
              {recent.map((u) => <Button key={u} size="sm" variant="secondary" onClick={() => search(u)}>{u}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]) }}>
                <X /> Clear
              </Button>
            </div>
          )}
        </section>

        {state.status === "idle" && (
          <Card><CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Look up any public GitHub profile</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Enter a username above, or pick one of the suggestions. You'll get stats, repositories, recent activity and charts.
            </p>
          </CardContent></Card>
        )}
        {state.status === "loading" && <LoadingSkeleton />}
        {state.status === "error" && <ErrorState err={state.err} name={input} onToken={() => setTokenOpen(true)} onRetry={() => search(input, false)} />}
        {state.status === "ready" && <Profile key={state.data.profile.login} data={state.data} />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground">
        Data comes from GitHub's public REST API, directly in your browser.
      </footer>

      <TokenDialog open={tokenOpen} onOpenChange={setTokenOpen} />
    </div>
  )
}

function TokenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [value, setValue] = useState(getToken())
  useEffect(() => { if (open) setValue(getToken()) }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>GitHub token (optional)</DialogTitle>
          <DialogDescription>
            Anonymous requests are limited to 60 per hour. A token raises that to 5,000. It needs no scopes for public data and is stored only in this browser.
          </DialogDescription>
        </DialogHeader>
        <Input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ghp_… or github_pat_…" aria-label="GitHub personal access token" autoComplete="off" />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setToken(""); setValue(""); onOpenChange(false) }}>Remove token</Button>
          <Button onClick={() => { setToken(value.trim()); onOpenChange(false) }}>Save token</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ErrorState({ err, name, onToken, onRetry }: { err: GHError; name: string; onToken: () => void; onRetry: () => void }) {
  if (err.kind === "notfound")
    return (
      <Alert variant="destructive"><TriangleAlert />
        <AlertTitle>User not found</AlertTitle>
        <AlertDescription>No GitHub user named "{name}". Check the spelling and try again.</AlertDescription>
      </Alert>
    )
  if (err.kind === "rate")
    return (
      <Alert variant="destructive"><TriangleAlert />
        <AlertTitle>GitHub API rate limit reached</AlertTitle>
        <AlertDescription>
          <p>{err.reset ? `The limit resets at ${new Date(err.reset).toLocaleTimeString()}.` : "Try again later."} Adding a free personal access token raises the limit from 60 to 5,000 requests per hour.</p>
          <div className="mt-2 flex gap-2"><Button size="sm" onClick={onToken}>Add token</Button><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>
        </AlertDescription>
      </Alert>
    )
  return (
    <Alert variant="destructive"><TriangleAlert />
      <AlertTitle>Couldn't load this profile</AlertTitle>
      <AlertDescription>
        <p>{err.message}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>Retry</Button>
      </AlertDescription>
    </Alert>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <Card><CardContent className="flex gap-4 pt-6">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex-1 space-y-2"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
      </CardContent></Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  )
}

function Profile({ data }: { data: UserData }) {
  const { profile: p, repos, events } = data
  const totals = repos.reduce(
    (a, r) => ({ stars: a.stars + r.stargazers_count, forks: a.forks + r.forks_count, watchers: a.watchers + r.watchers_count, issues: a.issues + r.open_issues_count }),
    { stars: 0, forks: 0, watchers: 0, issues: 0 }
  )
  const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3)
  const blog = p.blog ? (p.blog.startsWith("http") ? p.blog : `https://${p.blog}`) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row">
          <Avatar className="size-24">
            <AvatarImage src={p.avatar_url} alt={`${p.login} avatar`} />
            <AvatarFallback>{p.login.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-semibold">{p.name || p.login}</h1>
              <a href={p.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline-offset-4 hover:underline">@{p.login}</a>
            </div>
            {p.bio && <p className="max-w-2xl text-sm">{p.bio}</p>}
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {p.company && <li className="flex items-center gap-1.5"><Building2 className="size-4" aria-hidden />{p.company}</li>}
              {p.location && <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{p.location}</li>}
              {blog && <li className="flex items-center gap-1.5"><Link2 className="size-4" aria-hidden /><a href={blog} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.blog}</a></li>}
              {p.twitter_username && <li className="flex items-center gap-1.5"><AtSign className="size-4" aria-hidden /><a href={`https://twitter.com/${p.twitter_username}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.twitter_username}</a></li>}
              <li className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden />Joined {new Date(p.created_at).toLocaleDateString("en", { month: "long", year: "numeric" })}</li>
            </ul>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary"><Users /> {fmt(p.followers)} followers</Badge>
              <Badge variant="secondary">{fmt(p.following)} following</Badge>
              <Badge variant="secondary">{fmt(p.public_repos)} public repos</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-label="Totals across public repositories" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Stars", value: totals.stars, icon: Star },
          { label: "Forks", value: totals.forks, icon: GitFork },
          { label: "Watchers", value: totals.watchers, icon: Eye },
          { label: "Open issues", value: totals.issues, icon: CircleDot },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-1"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Icon className="size-4" aria-hidden />{label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p></CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="repos">Repositories ({repos.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Contributions</CardTitle></CardHeader>
            <CardContent><Heatmap events={events} /></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Languages</CardTitle></CardHeader><CardContent><LanguageDonut repos={repos} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Repositories by stars</CardTitle></CardHeader><CardContent><StarsBar repos={repos} /></CardContent></Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Top repositories</CardTitle></CardHeader>
            <CardContent>
              {top.length === 0 ? <p className="text-sm text-muted-foreground">No public repositories yet.</p> : (
                <ul className="grid gap-3 md:grid-cols-3">
                  {top.map((r) => (
                    <li key={r.id} className="rounded-lg border p-3">
                      <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{r.name}</a>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description || "No description"}</p>
                      <p className="mt-2 flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="size-3.5" aria-hidden />{fmt(r.stargazers_count)}</span>
                        <span className="flex items-center gap-1"><GitFork className="size-3.5" aria-hidden />{fmt(r.forks_count)}</span>
                        {r.language && <span>{r.language}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repos" className="mt-4"><RepoBrowser repos={repos} /></TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Recent public activity</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? <p className="text-sm text-muted-foreground">No public activity in the last 90 days.</p> : (
                <ol className="divide-y">
                  {events.slice(0, 40).map((e) => {
                    const { text, detail } = describeEvent(e)
                    return (
                      <li key={e.id} className="flex gap-3 py-3">
                        <EventIcon type={e.type} />
                        <div className="min-w-0 flex-1 text-sm">
                          <p>{text} <a href={`https://github.com/${e.repo.name}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{e.repo.name}</a></p>
                          {detail && <p className="truncate text-muted-foreground">{detail}</p>}
                        </div>
                        <time dateTime={e.created_at} title={new Date(e.created_at).toLocaleString()} className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</time>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EventIcon({ type }: { type: string }) {
  const cls = "mt-0.5 size-4 shrink-0 text-muted-foreground"
  const props = { className: cls, "aria-hidden": true as const }
  switch (type) {
    case "PushEvent": return <GitCommitHorizontal {...props} />
    case "PullRequestEvent": return <GitPullRequest {...props} />
    case "IssuesEvent": return <CircleDot {...props} />
    case "IssueCommentEvent": return <MessageSquare {...props} />
    case "WatchEvent": return <Star {...props} />
    case "ForkEvent": return <GitFork {...props} />
    case "ReleaseEvent": return <Tag {...props} />
    default: return <GitBranch {...props} />
  }
}
