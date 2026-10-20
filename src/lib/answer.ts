// The built-in answerer for "Ask the Note": answers visitors' questions straight
// from src/data/portfolio.ts, in the browser, with no network and no AI. It finds
// the things a question mentions (a project, a skill, a judge, a contest, a role)
// and what kind of answer it wants (contact, skills, experience…), then writes the
// answer from the data. It never invents: unknown questions get an honest "not in
// the note" plus suggestions. Used alone, or as the fallback when the AI is down.
import { contests, judges, judgesAsOf, problemSolving, profile, projects, roles, skillGroups, type SectionId } from '../data/portfolio.ts'
import { ordinal } from './knowledge.ts'

export type Reply = {
  /** Light markdown: **bold**, [label](url), "- " bullets, blank-line paragraphs. */
  text: string
  /** Section to offer a "Show me" jump to. */
  section?: SectionId
  /** Follow-up questions to offer as chips. */
  suggest?: string[]
}

const name = profile.shortName
const total = judges.reduce((n, j) => n + j.solved, 0)
/** profile.role as a phrase: 'CS student · Full-stack & AI/ML developer' → 'a CS student and full-stack & AI/ML developer'. */
const rolePhrase = `a ${profile.role.replace(' · ', ' and ').replace(' and Full', ' and full')}`

// ───────────────────────── text helpers ─────────────────────────
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/c\+\+/g, 'cpp')
    .replace(/c#/g, 'csharp')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9.@+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const words = (s: string) => new Set(norm(s).split(' ').filter(Boolean))

/** True if any of the phrases occurs in the normalised question (whole words). */
function has(q: string, phrases: string[]) {
  const padded = ` ${q} `
  return phrases.some((p) => padded.includes(` ${norm(p)} `) || (p.endsWith('*') && padded.includes(` ${norm(p.slice(0, -1))}`)))
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

// ───────────────────────── entities ─────────────────────────
const allSkills = skillGroups.flatMap((g) => g.items)
const SKILL_ALIASES: Record<string, string[]> = {
  'C++': ['cpp', 'c plus plus'],
  JavaScript: ['js', 'javascript'],
  TypeScript: ['ts', 'typescript'],
  Python: ['python', 'py'],
  React: ['react', 'reactjs', 'react js'],
  'Tailwind CSS': ['tailwind'],
  'HTML & CSS': ['html', 'css'],
  FastAPI: ['fastapi', 'fast api'],
  PostgreSQL: ['postgres', 'postgresql', 'sql'],
  MongoDB: ['mongo', 'mongodb', 'nosql'],
  'Git & GitHub': ['git', 'github'],
  'Graph search (A*, UCS, BFS…)': ['graph search', 'a star', 'bfs', 'dfs', 'dijkstra', 'shortest path'],
  'Groq & Gemini APIs': ['groq', 'gemini', 'llm', 'llms'],
  'Logistic regression': ['logistic regression'],
}
const skillTerms = (s: string) => SKILL_ALIASES[s] ?? [s]

const PROJECT_ALIASES: Record<string, string[]> = {
  'chattogram-routing': ['chattogram', 'routing', 'ambulance', 'emergency', 'dispatch', 'flood'],
  'electricity-billing': ['electricity', 'billing', 'bill', 'oop project', 'swing'],
  catvision: ['catvision', 'cat vision', 'cat', 'classifier', 'hello ml'],
  cognify: ['cognify', 'learning platform', 'tutor'],
  stockhub: ['stockhub', 'stock hub', 'warehouse', 'inventory'],
  drugscript: ['drugscript', 'drug script', 'prescription', 'medicine', 'pharmacy'],
}

const JUDGE_ALIASES: Record<string, string[]> = {
  Codeforces: ['codeforces', 'cf'],
  'Virtual Judge': ['vjudge', 'virtual judge'],
  LeetCode: ['leetcode', 'leet code', 'lc'],
  GeeksforGeeks: ['geeksforgeeks', 'gfg', 'geeks for geeks', 'geeks'],
}

// Only the distinctive names: generic words ("ctf", "brains") are left to the
// contest intent, which lists every contest.
const CONTEST_ALIASES: [string, string[]][] = [
  ['AL KHWARIZMI CTF', ['khwarizmi', 'al khwarizmi', 'alkhwarizmi']],
  ['Battle of Brains 2025', ['battle of brains 2025', 'bob 2025', 'bob25']],
  ['Battle of Brains 2024', ['battle of brains 2024', 'bob 2024', 'bob24']],
  ['DU CTF 2023', ['du ctf', 'ductf']],
]

const ROLE_ALIASES: [string, string[]][] = [
  ['Research Collaborator', ['research', 'researcher', 'mosaddek', 'supervisor', 'thesis']],
  ['Organizer & Problem Setter', ['problem setter', 'setter', 'set problems', 'problems did', 'battle of brains 2026', 'bob 2026', 'organizer', 'organiser']],
  ['Participant', ['cail', 'workshop']],
  ['Executive Member', ['club', 'csedu', 'executive', 'students club']],
  ['Volunteer', ['code samurai', 'samurai', 'volunteer', 'volunteering', 'hackathon']],
]

// ───────────────────────── answer builders ─────────────────────────
function projectReply(id: string): Reply {
  const p = projects.find((x) => x.id === id)!
  const links = [`[Code](${p.repo})`, ...(p.live ? [`[Live site](${p.live})`] : [])].join(' · ')
  return {
    text:
      `**${p.title}**: ${p.subtitle}. ${p.team ? 'A team project.' : `A solo project${p.year ? ` (${p.year})` : ''}.`}\n\n` +
      `${p.description}\n\n` +
      p.highlights.map((h) => `- ${h}`).join('\n') +
      `\n\n**Stack:** ${p.stack.join(', ')}\n${links}`,
    section: 'names',
    suggest: ['Show all projects', `What skills does ${name} have?`],
  }
}

function judgeReply(jName: string): Reply {
  const j = judges.find((x) => x.name === jName)!
  return {
    text: `On **${j.name}** (@${j.handle}) ${name} has solved **${j.solved}** problems, as of ${judgesAsOf}. [Open the profile](${j.url})\n\nAcross all judges: **${total}** solved.`,
    section: 'cases',
    suggest: ['Contest results?', 'Practice repositories?'],
  }
}

function contestReply(cName: string): Reply {
  const c = contests.find((x) => x.name === cName)!
  const field = `${c.field}${c.fieldPlus ? '+' : ''} ${c.kind === 'ctf' ? 'teams' : 'participants'}`
  return {
    text:
      `**${c.name}** (${c.year}), organized by ${c.organizer}: ` +
      `${c.kind === 'ctf' ? `a team CTF, as **${c.team}**` : 'a solo programming contest'}. ` +
      `Result: **${ordinal(c.rank)} place** among ${field}.` +
      (c.standings ? `\n\n[See the standings](${c.standings})` : ''),
    section: 'duels',
    suggest: ['All contests?', `How many problems has ${name} solved?`],
  }
}

function roleReply(title: string): Reply {
  const r = roles.find((x) => x.title === title)!
  const extra = [
    ...(r.problems ?? []).map((p) => `- Problem set: [${p.label}](${p.href})`),
    ...(r.links ?? []).map((l) => `- [${l.label}](${l.href})`),
  ]
  return {
    text:
      `**${r.title}**, ${r.org}${r.place ? `, ${r.place}` : ''} (${r.dates}).\n\n` +
      [...r.points.map((p) => `- ${p}`), ...extra].join('\n'),
    section: 'force',
    suggest: ['All experience?', `How can I contact ${name}?`],
  }
}

function skillReply(skill: string): Reply {
  const group = skillGroups.find((g) => g.items.includes(skill))
  const terms = skillTerms(skill).map(norm)
  const used = projects.filter((p) => p.stack.some((s) => terms.some((t) => norm(s).includes(t)) || norm(s) === norm(skill)))
  return {
    text:
      `Yes: **${skill}** is one of ${name}'s skills${group ? `, listed under ${group.title}` : ''}.` +
      (used.length ? `\n\nUsed in: ${list(used.map((p) => `**${p.title}**`))}.` : ''),
    section: 'eyes',
    suggest: used.length ? [`Tell me about ${used[0].title}`, 'All skills?'] : ['All skills?', 'Show all projects'],
  }
}

const R = {
  greet: (): Reply => ({
    text: `Hello. I have read every page of this note, and it belongs to **${profile.name}**, ${rolePhrase} in ${profile.location}.\n\nAsk me about projects, skills, experience, contests or how to get in touch.`,
    suggest: [`Who is ${name}?`, 'Show all projects', `How can I contact ${name}?`],
  }),
  about: (): Reply => ({
    text:
      `**${profile.name}** is ${rolePhrase}, based in ${profile.location}.\n\n` +
      `"${profile.tagline}"\n\n` +
      `- **${projects.length} projects**, from AI ambulance routing to an electricity billing system\n` +
      `- **${total}+ problems** solved across ${judges.length} online judges\n` +
      `- Currently a **research collaborator** at the University of Dhaka\n` +
      `- Interests: full-stack development, machine learning, algorithms and cybersecurity`,
    section: 'rules',
    suggest: ['Show all projects', 'Experience?', `How can I contact ${name}?`],
  }),
  contact: (): Reply => ({
    text:
      `You can reach ${name} here:\n\n` +
      (profile.email ? `- **Email:** [${profile.email}](mailto:${profile.email})\n` : '') +
      `- **LinkedIn:** [${profile.name}](${profile.links.linkedin})\n` +
      `- **GitHub:** [Md-Akram-Khan](${profile.links.github})\n\n` +
      `Based in ${profile.location}, and open to collaboration.`,
    section: 'contact',
    suggest: [`Who is ${name}?`, 'Show all projects'],
  }),
  projects: (): Reply => ({
    text:
      `${name} has written **${projects.length} names** in the note:\n\n` +
      projects.map((p) => `- **${p.title}**: ${p.subtitle}${p.team ? ' (team)' : ''}`).join('\n') +
      `\n\nAsk about any of them by name.`,
    section: 'names',
    suggest: projects.slice(0, 3).map((p) => `Tell me about ${p.title}`),
  }),
  skills: (): Reply => ({
    text: `${name}'s skills:\n\n` + skillGroups.map((g) => `- **${g.title}:** ${g.items.join(', ')}`).join('\n'),
    section: 'eyes',
    suggest: [`Does ${name} know React?`, 'Show all projects'],
  }),
  experience: (): Reply => ({
    text: `${name}'s experience, newest first:\n\n` + roles.map((r) => `- **${r.title}**, ${r.org} (${r.dates})`).join('\n'),
    section: 'force',
    suggest: ['Tell me about the research', 'Which problems did Akram set?'],
  }),
  cp: (): Reply => ({
    text:
      `**${total}** problems solved across ${judges.length} judges (as of ${judgesAsOf}):\n\n` +
      judges.map((j) => `- **${j.name}** (@${j.handle}): ${j.solved}`).join('\n') +
      `\n\nPractice notebooks on GitHub: ${list(problemSolving.map((p) => `[${p.title}](${p.repo})`))}.`,
    section: 'cases',
    suggest: ['Contest results?', 'Codeforces profile?'],
  }),
  contests: (): Reply => ({
    text:
      `Contest record, newest first:\n\n` +
      contests
        .map((c) => `- **${c.name}** (${c.year}, ${c.kind === 'ctf' ? 'team CTF' : 'solo'}): ${ordinal(c.rank)} of ${c.field}${c.fieldPlus ? '+' : ''}`)
        .join('\n') +
      `\n\nBest: **6th of 650+ teams** at AL KHWARIZMI CTF.`,
    section: 'duels',
    suggest: ['Tell me about AL KHWARIZMI CTF', `How many problems has ${name} solved?`],
  }),
  education: (): Reply => ({
    text: `${name} is a **Computer Science undergraduate**, involved with the **University of Dhaka**: a research collaborator in the Department of CSE (Apr 2026 – present) and formerly an executive member of the CSEDU Students' Club.\n\nThe note doesn't list degree dates or grades.`,
    section: 'force',
    suggest: ['Tell me about the research', 'Experience?'],
  }),
  location: (): Reply => ({
    text: `${name} is based in **${profile.location}**.`,
    section: 'contact',
    suggest: [`How can I contact ${name}?`],
  }),
  hire: (): Reply => ({
    text:
      `${name} is open to collaboration. The fastest way to start is ` +
      (profile.email ? `an email to [${profile.email}](mailto:${profile.email}), or ` : '') +
      `a message on [LinkedIn](${profile.links.linkedin}).\n\nThe note doesn't include a CV; ask ${name} for one directly.`,
    section: 'contact',
    suggest: [`Who is ${name}?`, 'Show all projects'],
  }),
  site: (): Reply => ({
    text: `This portfolio is a Death Note–inspired 3D site built with **React**, **Three.js** (React Three Fiber) and **TypeScript**, deployed on GitHub Pages. Each section is a page of the note: the rules are the About section, the names written are projects, and the Shinigami Eyes reveal skills.`,
    suggest: [`Who is ${name}?`, 'Show all projects'],
  }),
  ai: (): Reply => ({
    text: `On AI and machine learning, the note shows:\n\n- **CatVision**: logistic regression written from scratch in NumPy\n- **Chattogram Emergency Routing**: A* and five other graph search algorithms\n- **Cognify** (team): an AI tutor built on Groq with Gemini as fallback\n- The **CAIL Workshop 2026** on LLM inference, APIs and scalable deployment`,
    section: 'names',
    suggest: ['Tell me about CatVision', 'Tell me about Cognify'],
  }),
  security: (): Reply => ({
    text: `Cybersecurity is one of ${name}'s interests, shown in team CTFs:\n\n- **AL KHWARIZMI CTF 2025**: 6th of 650+ teams (DU_Restless_goblins)\n- **DU CTF 2023**: 10th of 100+ teams (DU_CTF_NOOBS)`,
    section: 'duels',
    suggest: ['All contests?'],
  }),
  thanks: (): Reply => ({
    text: `You're welcome. The note stays open: ask anything else.`,
    suggest: ['Show all projects', `How can I contact ${name}?`],
  }),
  help: (): Reply => ({
    text: `I answer from this portfolio only. Try asking about:\n\n- who ${name} is\n- projects, or one project by name\n- skills (e.g. "does ${name} know Python?")\n- experience and research\n- problem solving and contests\n- how to get in touch`,
    suggest: [`Who is ${name}?`, 'Show all projects', 'Skills?'],
  }),
}

/** Intents in priority order: phrases that signal them. */
const INTENTS: [keyof typeof R, string[]][] = [
  ['thanks', ['thanks', 'thank you', 'thx']],
  ['hire', ['hire', 'hiring', 'job', 'internship', 'intern', 'available', 'cv', 'resume', 'freelance', 'work with', 'collaborate']],
  ['contact', ['contact', 'email', 'mail', 'gmail', 'reach', 'linkedin', 'phone', 'message', 'touch', 'connect', 'social']],
  ['security', ['security', 'cyber', 'cybersecurity', 'hacking', 'pentest', 'capture the flag']],
  ['contests', ['contest', 'contests', 'competition', 'competitions', 'ctf', 'ctfs', 'rank', 'ranking', 'place', 'award', 'awards', 'achievement', 'achievements', 'battle of brains', 'duel', 'duels']],
  ['cp', ['competitive programming', 'cp', 'solved', 'problems solved', 'dsa', 'algorithm', 'algorithms', 'online judge', 'judges', 'rating', 'cases closed', 'problem solving']],
  ['site', ['this site', 'this website', 'website built', 'site built', 'death note', 'three.js', 'threejs', '3d', 'how was this']],
  ['ai', ['ai', 'ml', 'machine learning', 'artificial intelligence', 'deep learning', 'model', 'models']],
  ['experience', ['experience', 'work', 'worked', 'job history', 'role', 'roles', 'position', 'task force', 'volunteer', 'club', 'leadership']],
  ['education', ['education', 'study', 'studies', 'student', 'university', 'college', 'degree', 'cgpa', 'gpa', 'graduate', 'undergraduate', 'dhaka university', 'du']],
  ['projects', ['project', 'projects', 'built', 'build', 'made', 'portfolio work', 'apps', 'app', 'names written', 'repos', 'repository']],
  ['skills', ['skill', 'skills', 'stack', 'tech', 'technologies', 'tools', 'languages', 'language', 'framework', 'frameworks', 'know', 'knows', 'good at', 'expert', 'shinigami eyes']],
  ['location', ['where', 'location', 'based', 'live', 'lives', 'country', 'city', 'bangladesh']],
  ['about', ['who', 'about', 'introduce', 'introduction', 'yourself', 'himself', 'herself', 'akram', 'summary', 'tell me', 'bio', 'background']],
  ['greet', ['hi', 'hello', 'hey', 'salam', 'assalamu alaikum', 'good morning', 'good evening', 'yo']],
  ['help', ['help', 'what can you', 'what do you', 'options', 'menu']],
]

/** Answer a visitor's question from the portfolio data alone. */
export function answer(question: string): Reply {
  const q = norm(question)
  if (!q) return R.help()

  // 1. Specific things first: a project, judge, contest, role or skill by name.
  for (const p of projects) {
    if (has(q, [p.title, ...(PROJECT_ALIASES[p.id] ?? [])])) return projectReply(p.id)
  }
  for (const [title, aliases] of ROLE_ALIASES) {
    if (has(q, aliases)) return roleReply(title)
  }
  for (const [cName, aliases] of CONTEST_ALIASES) {
    if (has(q, aliases)) return contestReply(cName)
  }
  for (const j of judges) {
    if (has(q, JUDGE_ALIASES[j.name] ?? [j.name])) return judgeReply(j.name)
  }
  const skill = allSkills.find((s) => has(q, skillTerms(s)))
  const asksAboutSkill = has(q, [
    'know', 'knows', 'use', 'uses', 'used', 'using', 'with', 'familiar', 'experience with', 'work with', 'can', 'does', 'skill', 'skills', 'in',
  ])
  if (skill && (asksAboutSkill || words(q).size <= 3)) return skillReply(skill)

  // 2. A technology the note doesn't mention, asked as "does he know X?"
  const tech = q.match(/(?:know|knows|use|uses|familiar with|experience with|work with)\s+([a-z0-9.+#]+)/)
  if (tech && !skill && !INTENTS.some(([, ph]) => has(tech[1], ph))) {
    return {
      text: `**${tech[1]}** isn't written anywhere in this note, so I can't say. ${name}'s listed skills are in the Shinigami Eyes section, or ask ${name} directly.`,
      section: 'eyes',
      suggest: ['All skills?', `How can I contact ${name}?`],
    }
  }

  // 3. The kind of answer wanted.
  for (const [intent, phrases] of INTENTS) {
    if (has(q, phrases)) return R[intent]()
  }

  // 4. Nothing matched.
  return {
    text: `That isn't written in this note. I only know what ${name}'s portfolio says: projects, skills, experience, problem solving, contests and contact details.`,
    suggest: [`Who is ${name}?`, 'Show all projects', `How can I contact ${name}?`],
  }
}

/** Opening suggestions shown before the first question. */
export const starters = [`Who is ${name}?`, 'Show all projects', 'Skills?', 'Contest results?', `How can I contact ${name}?`]
