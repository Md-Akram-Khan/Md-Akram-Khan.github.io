// Everything the portfolio says, flattened into plain text for the AI assistant.
// Built from src/data/portfolio.ts, so it never drifts from what the page shows.
// The build writes it to /knowledge.txt (see vite.config.ts); the chat Worker
// reads it from the live site and gives it to the model as its only source.
import { contests, judges, judgesAsOf, problemSolving, profile, projects, roles, rules, skillGroups } from '../data/portfolio.ts'

const SITE = 'https://md-akram-khan.github.io/My-Portfolio/'

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export function buildKnowledge(): string {
  const out: string[] = []
  const line = (s = '') => out.push(s)

  line(`# ${profile.name} — portfolio facts`)
  line(`Site: ${SITE}`)
  line(`Name: ${profile.name} (goes by ${profile.shortName})`)
  line(`Role: ${profile.role}`)
  line(`Location: ${profile.location}`)
  line(`Tagline: ${profile.tagline}`)
  line(`GitHub: ${profile.links.github}`)
  line(`LinkedIn: ${profile.links.linkedin}`)
  if (profile.email) line(`Email: ${profile.email}`)

  line()
  line(`## About (in ${profile.shortName}'s own words: the site's "How to Use It" rules)`)
  for (const r of rules) {
    if (r.secret) continue // the secret rule is a site easter egg, not a fact
    line(`- ${r.title}: ${r.paragraphs.join(' ')}${r.coda ? ` ${r.coda}` : ''}`)
  }

  line()
  line('## Experience ("The Task Force")')
  for (const r of roles) {
    line(`- ${r.title} — ${r.org}${r.place ? `, ${r.place}` : ''} (${r.dates}; ${r.kind})`)
    for (const p of r.points) line(`  - ${p}`)
    for (const p of r.problems ?? []) line(`  - Problem set: "${p.label}" ${p.href}`)
    for (const l of r.links ?? []) line(`  - ${l.label}: ${l.href}`)
  }

  line()
  line('## Projects ("Names Written")')
  for (const p of projects) {
    line(`- ${p.title} — ${p.subtitle}. ${p.team ? 'Team project.' : `Solo project${p.year ? `, ${p.year}` : ''}.`}`)
    line(`  ${p.description}`)
    for (const h of p.highlights) line(`  - ${h}`)
    line(`  Stack: ${p.stack.join(', ')}`)
    line(`  Code: ${p.repo}${p.live ? ` · Live: ${p.live}` : ''}`)
  }

  line()
  line(`## Competitive programming ("Cases Closed"), counts as of ${judgesAsOf}`)
  line(`Total solved across judges: ${judges.reduce((n, j) => n + j.solved, 0)}`)
  for (const j of judges) line(`- ${j.name} (@${j.handle}): ${j.solved} solved — ${j.url}`)
  line('Practice repositories:')
  for (const p of problemSolving) line(`- ${p.title}${p.since ? ` (since ${p.since})` : ''}: ${p.detail} — ${p.repo}`)

  line()
  line('## Contests ("Duels Fought")')
  for (const c of contests) {
    const field = `${c.field}${c.fieldPlus ? '+' : ''} ${c.kind === 'ctf' ? 'teams' : 'participants'}`
    line(
      `- ${c.year} ${c.name} (${c.kind === 'ctf' ? 'CTF, team' : 'programming contest, solo'}), organized by ${c.organizer}` +
        `${c.team ? `, team "${c.team}"` : ''}${c.when ? `, ${c.when}` : ''}: ${ordinal(c.rank)} place among ${field}` +
        `${c.details ? ` (${c.details.join(', ')})` : ''}${c.standings ? ` — standings ${c.standings}` : ''}` +
        `${c.certificate ? ` — certificate of completion: ${SITE}${c.certificate.pdf}` : ''}`,
    )
  }

  line()
  line('## Skills ("Shinigami Eyes")')
  for (const g of skillGroups) line(`- ${g.title}: ${g.items.join(', ')}`)

  return out.join('\n') + '\n'
}
