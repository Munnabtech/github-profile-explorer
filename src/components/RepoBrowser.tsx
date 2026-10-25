import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, GitFork, Search, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fmt, getReadme, timeAgo, type Repo } from "@/lib/github"

function Readme({ fullName }: { fullName: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    setHtml(null)
    getReadme(fullName).then((h) => live && setHtml(h))
    return () => { live = false }
  }, [fullName])
  useEffect(() => {
    ref.current?.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer" })
  }, [html])

  if (html === null) return <div className="space-y-2"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
  if (!html) return <p className="text-sm text-muted-foreground">This repository has no README.</p>
  // README HTML is rendered and sanitized by GitHub's API.
  return <div ref={ref} className="readme" dangerouslySetInnerHTML={{ __html: html }} />
}

export function RepoBrowser({ repos }: { repos: Repo[] }) {
  const [q, setQ] = useState("")
  const [sort, setSort] = useState("stars")
  const [lang, setLang] = useState("all")
  const [open, setOpen] = useState<Repo | null>(null)

  const langs = useMemo(() => [...new Set(repos.map((r) => r.language).filter(Boolean) as string[])].sort(), [repos])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return repos
      .filter((r) => (lang === "all" || r.language === lang) &&
        (!s || [r.name, r.description, ...(r.topics ?? [])].some((x) => x?.toLowerCase().includes(s))))
      .sort((a, b) =>
        sort === "stars" ? b.stargazers_count - a.stargazers_count
        : sort === "name" ? a.name.localeCompare(b.name)
        : +new Date(b.pushed_at) - +new Date(a.pushed_at))
  }, [repos, q, sort, lang])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, description, topic" aria-label="Search repositories" className="pl-9" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40" aria-label="Sort repositories"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stars">Most stars</SelectItem>
            <SelectItem value="updated">Recently pushed</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="w-40" aria-label="Filter by language"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {langs.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">{list.length} of {repos.length} repositories</p>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No repositories match these filters.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r)}
                className="flex h-full w-full flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-2 font-medium">
                  <span className="truncate">{r.name}</span>
                  {r.fork && <Badge variant="outline">fork</Badge>}
                </span>
                <span className="line-clamp-2 text-sm text-muted-foreground">{r.description || "No description"}</span>
                {!!r.topics?.length && (
                  <span className="flex flex-wrap gap-1">
                    {r.topics.slice(0, 5).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </span>
                )}
                <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                  {r.language && <span>{r.language}</span>}
                  <span className="flex items-center gap-1"><Star className="size-3.5" aria-hidden />{fmt(r.stargazers_count)}<span className="sr-only"> stars</span></span>
                  <span className="flex items-center gap-1"><GitFork className="size-3.5" aria-hidden />{fmt(r.forks_count)}<span className="sr-only"> forks</span></span>
                  <span>Pushed {timeAgo(r.pushed_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.full_name}</SheetTitle>
                <SheetDescription>{open.description || "No description"}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {open.language && <span>{open.language}</span>}
                  <span>{open.stargazers_count.toLocaleString()} stars</span>
                  <span>{open.forks_count.toLocaleString()} forks</span>
                  <span>{open.open_issues_count.toLocaleString()} open issues</span>
                  <span>Pushed {timeAgo(open.pushed_at)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm"><a href={open.html_url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open on GitHub</a></Button>
                  {open.homepage && <Button asChild size="sm" variant="outline"><a href={open.homepage.startsWith("http") ? open.homepage : `https://${open.homepage}`} target="_blank" rel="noopener noreferrer">Website</a></Button>}
                </div>
                <Readme fullName={open.full_name} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
