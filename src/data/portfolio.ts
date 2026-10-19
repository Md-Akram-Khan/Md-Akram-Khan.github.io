// Single source of truth for all portfolio content.
// Every fact here comes from Md. Akram Khan's public GitHub repositories.

export type SectionId = 'hero' | 'rules' | 'force' | 'names' | 'cases' | 'eyes' | 'duels' | 'contact'

export const sections: { id: SectionId; label: string; numeral: string }[] = [
  { id: 'hero', label: 'The Note', numeral: '0' },
  { id: 'rules', label: 'How to Use It', numeral: 'I' },
  { id: 'force', label: 'The Task Force', numeral: 'II' },
  { id: 'names', label: 'Names Written', numeral: 'III' },
  { id: 'cases', label: 'Cases Closed', numeral: 'IV' },
  { id: 'eyes', label: 'Shinigami Eyes', numeral: 'V' },
  { id: 'duels', label: 'Duels Fought', numeral: 'VI' },
  { id: 'contact', label: 'Write a Name', numeral: 'VII' },
]

export const profile = {
  name: 'Md. Akram Khan',
  shortName: 'Akram',
  role: 'CS student · Full-stack & AI/ML developer',
  location: 'Dhaka, Bangladesh',
  tagline: 'I build software for the problems I can see around me.',
  links: {
    github: 'https://github.com/Md-Akram-Khan',
    linkedin: 'https://www.linkedin.com/in/md-akram-khan-534363291',
  },
  /** Portrait in /public (webp + jpg fallback, 480×600, metadata stripped). */
  photo: { webp: 'media/akram-portrait.webp', jpg: 'media/akram-portrait.jpg', alt: 'Portrait of Md. Akram Khan' },
  // Leave empty to hide the email link. Add an address here to show it.
  email: '',
}

// "HOW TO USE IT" — the About section: the rules of this note, in Akram's own words.
// Pages: rules on `page: 1` sit beside the notebook on the left half of the screen,
// rules on `page: 2` on the right half (the notebook crosses to the left for them).
export type Rule = {
  /** "01", "02", … */
  num: string
  title: string
  paragraphs: string[]
  /** A closing line, handwritten in red ink under the rule. */
  coda?: string
  /** Pin the owner's portrait to this rule, like a photo clipped to a case file. */
  photo?: boolean
  /** The final, secret rule: styled as sealed. Its interaction comes later. */
  secret?: boolean
  page: 1 | 2
}

export const rules: Rule[] = [
  {
    num: '01',
    title: 'The Mind Behind the Note',
    photo: true,
    paragraphs: [
      'The name is Md. Akram Khan. A CS undergraduate and software developer driven by curiosity, logic and the pursuit of better solutions. I see every problem as a system waiting to be understood, and every idea as an opportunity to build something meaningful.',
    ],
    page: 1,
  },
  {
    num: '02',
    title: 'Understand the Method',
    paragraphs: [
      'Observe before acting. Analyze before building. Test before trusting. I approach software development as an iterative process of investigation, experimentation and refinement, turning complex problems into practical, reliable and scalable solutions.',
    ],
    page: 1,
  },
  {
    num: '03',
    title: 'Know the Arsenal',
    paragraphs: [
      'Different languages. Different tools. One objective: engineer effective solutions. From full-stack applications to algorithmic problem-solving and machine learning, I choose my tools according to the problem, rather than forcing every problem into the same solution.',
    ],
    page: 1,
  },
  {
    num: '04',
    title: 'Question the Unknown',
    paragraphs: [
      'Understanding matters more than simply making things work. I explore algorithms from first principles, experiment with machine learning and investigate the systems behind the interfaces. My interests extend into cybersecurity and emerging technologies, where curiosity is often the first step toward discovery.',
    ],
    page: 2,
  },
  {
    num: '05',
    title: 'Examine the Evidence',
    paragraphs: [
      'Each project represents an attempt to solve a real problem, explore an idea or turn knowledge into something useful. Through building, debugging and collaborating, I continue to refine not only my code but also the way I think as an engineer.',
    ],
    page: 2,
  },
  {
    num: '06',
    title: 'Leave the Story Open',
    paragraphs: [
      'The objective is not merely to write code. It is to engineer impactful software, keep learning beyond familiar boundaries and contribute to technology that makes a difference. There are still systems to understand, problems to solve and ideas waiting to become reality.',
    ],
    coda: 'The name is written. The work is still being written.',
    page: 2,
  },
  {
    num: '07',
    title: 'The Eye Deal',
    paragraphs: [
      'Make the eye deal, and this floating Death Note may turn into a Love Note.',
      'The Shinigami Eyes reveal every page of the secret Love Note hidden inside: all 52 of them. One condition remains: you must possess the Shinigami Eyes.',
    ],
    coda: 'Do you dare make the deal?',
    secret: true,
    page: 2,
  },
]

// "The Task Force" — experience: research, organizing, leadership, workshops and
// volunteering, newest first. Akram's own record.
export type Role = {
  title: string
  org: string
  place?: string
  dates: string
  /** Still ongoing: the date badge glows. */
  current?: boolean
  kind: string
  points: string[]
  links?: { label: string; href: string }[]
  /** Problems Akram set, listed in their own bullet with each name linked. */
  problems?: { label: string; href: string }[]
}

export const roles: Role[] = [
  {
    title: 'Research Collaborator',
    org: 'University of Dhaka',
    dates: 'Apr 2026 – Present',
    current: true,
    kind: 'Research',
    points: [
      'Research under the supervision of Dr. Md. Mosaddek Khan, Associate Professor, Department of Computer Science and Engineering, University of Dhaka.',
    ],
  },
  {
    title: 'Organizer & Problem Setter',
    org: 'Battle of Brains 2026',
    place: 'University of Dhaka',
    dates: '2026',
    kind: 'Organizing',
    points: [
      'Organized an intra-university programming contest between freshers and sophomores.',
    ],
    problems: [
      { label: 'Ask for the Deck If you Wish ♠️', href: 'https://toph.co/_/challenges/6a47ebc1c22781da616684cd' },
      { label: 'Tumi, Ami ar Ak Cup Coffee, kobe!?', href: 'https://toph.co/_/challenges/6a3eb9b7a627d883da7d862a' },
    ],
    links: [{ label: 'Contest', href: 'https://toph.co/c/battle-brains-2026' }],
  },
  {
    title: 'Participant',
    org: 'CAIL Workshop 2026',
    dates: '2026',
    kind: 'Workshop',
    points: [
      'Topic: “From Language Model to Service: LLM Inference, APIs and Scalable Deployment”.',
      'Took part in a hands-on workshop on LLM inference, APIs and scalable deployment.',
    ],
  },
  {
    title: 'Executive Member',
    org: 'CSEDU Students’ Club',
    place: 'University of Dhaka',
    dates: 'Feb 2024 – Nov 2025',
    kind: 'Leadership',
    points: [
      'Organized departmental events.',
      'Collaborated with other DU departments on inter-department activities.',
    ],
  },
  {
    title: 'Volunteer',
    org: 'Code Samurai 2024',
    dates: '2024',
    kind: 'Volunteering',
    points: [
      'Volunteered at Code Samurai, the biggest inter-university hackathon in Bangladesh, organized by the University of Dhaka in collaboration with BJIT, Japan.',
    ],
  },
]

export type Project = {
  id: string
  title: string
  /** One line shown under the title. */
  subtitle: string
  description: string
  highlights: string[]
  stack: string[]
  repo: string
  live?: string
  /** true when it is a team project (a fork of a teammate's repo). */
  team: boolean
  /** Year the work started, only for repos Akram created. */
  year?: number
  /** Short red text revealed by the "Shinigami Eyes" hover effect. */
  reveal: string
}

export const projects: Project[] = [
  {
    id: 'chattogram-routing',
    title: 'Chattogram Emergency Routing',
    subtitle: 'AI routing for ambulances',
    description:
      'A dispatch and routing simulator for ambulances and rescue teams across Chattogram. It models monsoon flooding, port traffic, landslide risk and night-time safety, then compares six graph search algorithms.',
    highlights: [
      '45 metropolitan nodes and 60+ road links, including hospitals, port gates and flyovers',
      'Dynamic edge costs from road type, traffic, flood depth and day/night safety',
      'A* with a Haversine heuristic, benchmarked against BFS, DFS, UCS, IDS and Greedy in Chart.js',
    ],
    stack: ['JavaScript', 'HTML', 'CSS', 'Google Maps', 'Chart.js'],
    repo: 'https://github.com/Md-Akram-Khan/chattogram-emergency-routing-simulator',
    team: false,
    year: 2026,
    reveal: '6 algorithms · 45 nodes · 60+ roads',
  },
  {
    id: 'electricity-billing',
    title: 'Electricity Billing System',
    subtitle: 'Bangladeshi power bills, done properly',
    description:
      'A Java Swing desktop app for an electricity provider, built as a university OOP project. Admins manage customers, meters and monthly bills; customers view, understand and pay them. Data lives in PostgreSQL on Supabase behind a small backend API.',
    highlights: [
      'BERC slab tariff with the lifeline rate, demand charge, 5% VAT and late fees',
      'Bills created from a meter photo, with a checker that flags suspicious bills',
      'Online payment through SSLCommerz: bKash, Nagad, Rocket and cards',
    ],
    stack: ['Java', 'Swing', 'PostgreSQL', 'Supabase', 'Python'],
    repo: 'https://github.com/Md-Akram-Khan/OOP-project',
    team: false,
    year: 2025,
    reveal: 'BERC tariff · 5% VAT · SSLCommerz',
  },
  {
    id: 'catvision',
    title: 'CatVision',
    subtitle: 'Machine learning from first principles',
    description:
      'A cat vs non-cat image classifier. The model is logistic regression written by hand in NumPy, served by a Flask API on Render, with a React frontend on GitHub Pages.',
    highlights: [
      'Logistic regression implemented from scratch, no ML framework',
      'Flask API with a health-check endpoint',
      'React + Vite frontend deployed to GitHub Pages',
    ],
    stack: ['Python', 'NumPy', 'Flask', 'React', 'Vite'],
    repo: 'https://github.com/Md-Akram-Khan/Hello-ML',
    live: 'https://md-akram-khan.github.io/Hello-ML/',
    team: false,
    year: 2026,
    reveal: 'Logistic regression · from scratch',
  },
  {
    id: 'cognify',
    title: 'Cognify',
    subtitle: 'AI-powered learning platform',
    description:
      'A full-stack study platform with an AI tutor, practice exams generated on any topic in several languages, and summaries and quizzes extracted from uploaded PDFs and slide decks.',
    highlights: [
      'AI tutoring with Groq as the primary model and Gemini as the fallback',
      'Quizzes in English, Bengali, Hindi, Spanish and German',
      'Offline demo mode that runs without API keys or a database',
    ],
    stack: ['FastAPI', 'React 19', 'Vite', 'MongoDB', 'Tailwind CSS', 'Groq', 'Gemini'],
    repo: 'https://github.com/Md-Akram-Khan/Cognify-AI-Powered-Learning-Platform',
    live: 'https://cognify-ai-powered-learning-platfor.vercel.app',
    team: true,
    reveal: 'Groq → Gemini failover',
  },
  {
    id: 'stockhub',
    title: 'StockHub',
    subtitle: 'Warehouse and storage management',
    description:
      'A warehouse management system with separate workspaces for customers, employees and admins: storage applications, inventory tracking, branch capacity and audit logs.',
    highlights: [
      'Role-based access for customers, employees and admins',
      'Optimistic locking for concurrent inventory updates',
      'Containerised with Docker and served through Nginx',
    ],
    stack: ['FastAPI', 'React', 'Docker', 'Nginx', 'Tailwind CSS', 'Python'],
    repo: 'https://github.com/Md-Akram-Khan/StockHub',
    live: 'https://stock-hub-eight.vercel.app/',
    team: true,
    reveal: '3 roles · optimistic locking',
  },
  {
    id: 'drugscript',
    title: 'DrugScript',
    subtitle: 'Prescriptions, medicine and ambulances in one app',
    description:
      'A cross-platform healthcare app: digital prescriptions shared by QR code, medicine search and delivery, ambulance requests, and medication reminders.',
    highlights: [
      'Prescriptions shared and scanned as QR codes',
      'Medicine delivery flows for patients, shops and delivery staff',
      'Ambulance service hub for patients and drivers',
    ],
    stack: ['Flutter', 'Dart', 'Firebase'],
    repo: 'https://github.com/Md-Akram-Khan/DrugScript',
    team: true,
    reveal: 'QR prescriptions · delivery · ambulance',
  },
]

export const skillGroups: { title: string; items: string[] }[] = [
  { title: 'Languages', items: ['Python', 'C++', 'Java', 'JavaScript', 'TypeScript', 'Dart'] },
  { title: 'Web', items: ['React', 'Vite', 'Tailwind CSS', 'HTML & CSS', 'FastAPI', 'Flask'] },
  { title: 'AI & Data', items: ['NumPy', 'Logistic regression', 'Graph search (A*, UCS, BFS…)', 'Groq & Gemini APIs'] },
  { title: 'Mobile', items: ['Flutter', 'Firebase'] },
  { title: 'Databases', items: ['PostgreSQL', 'Supabase', 'MongoDB'] },
  { title: 'Tools', items: ['Git & GitHub', 'Docker', 'Nginx', 'Vercel', 'Render', 'GitHub Pages'] },
]

// "Cases Closed" — competitive programming: problems solved per online judge.
// Counts are Akram's own figures; update them here (and `judgesAsOf`) as they grow.
export type Judge = { name: string; handle: string; url: string; solved: number; color: string }

export const judges: Judge[] = [
  { name: 'Codeforces', handle: 'Thank_you', url: 'https://codeforces.com/profile/Thank_you', solved: 575, color: '#3b8fd1' },
  { name: 'Virtual Judge', handle: 'Thank_youu', url: 'https://vjudge.net/user/Thank_youu', solved: 175, color: '#b89b5e' },
  { name: 'LeetCode', handle: 'Thank_you', url: 'https://leetcode.com/u/Thank_you/', solved: 67, color: '#ffa116' },
  { name: 'GeeksforGeeks', handle: 'thankyou05', url: 'https://www.geeksforgeeks.org/profile/thankyou05', solved: 24, color: '#2f8d46' },
]

/** When the counts above were last written down. */
export const judgesAsOf = 'October 2026'

// "Duels Fought" — contests: team CTFs and solo programming contests, newest first.
// Akram's own results. `field` is the number of teams/participants; `fieldPlus`
// marks counts given as "650+" (the true field was larger).
export type Contest = {
  kind: 'ctf' | 'cp'
  year: number
  name: string
  organizer: string
  team?: string
  rank: number
  field: number
  fieldPlus?: boolean
  /** Public final standings page, if there is one. */
  standings?: string
}

export const contests: Contest[] = [
  { kind: 'ctf', year: 2025, name: 'AL KHWARIZMI CTF', organizer: 'Bangladesh Islami Chhatrashibir Science', team: 'DU_Restless_goblins', rank: 6, field: 650, fieldPlus: true },
  { kind: 'cp', year: 2025, name: 'Battle of Brains 2025', organizer: 'University of Dhaka', rank: 10, field: 105, standings: 'https://toph.co/c/battle-brains-2025/standings' },
  { kind: 'cp', year: 2024, name: 'Battle of Brains 2024', organizer: 'University of Dhaka', rank: 14, field: 68, standings: 'https://toph.co/c/battle-brains-2024/standings' },
  { kind: 'ctf', year: 2023, name: 'DU CTF 2023', organizer: 'University of Dhaka', team: 'DU_CTF_NOOBS', rank: 10, field: 100, fieldPlus: true },
]

// Competitive programming and DSA practice repositories.
export const problemSolving: { title: string; detail: string; repo: string; since?: number }[] = [
  { title: 'Number Theory', detail: 'C++ solutions, practised since 2020', repo: 'https://github.com/Md-Akram-Khan/Number-theory', since: 2020 },
  { title: 'Data Structures & Algorithms', detail: 'The largest of the practice notebooks', repo: 'https://github.com/Md-Akram-Khan/DSA', since: 2024 },
  { title: 'Graph Theory', detail: 'Traversals, shortest paths and trees', repo: 'https://github.com/Md-Akram-Khan/Graph-Theory/tree/Topics', since: 2024 },
  { title: 'CSES Problem Set', detail: 'Working through the CSES archive', repo: 'https://github.com/Md-Akram-Khan/CSES-problems', since: 2024 },
]
