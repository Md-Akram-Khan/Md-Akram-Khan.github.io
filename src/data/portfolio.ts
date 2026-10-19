// Single source of truth for all portfolio content.
// Every fact here comes from Md. Akram Khan's public GitHub repositories.

export type SectionId = 'hero' | 'rules' | 'names' | 'eyes' | 'contact'

export const sections: { id: SectionId; label: string; numeral: string }[] = [
  { id: 'hero', label: 'The Note', numeral: '0' },
  { id: 'rules', label: 'How to Use It', numeral: 'I' },
  { id: 'names', label: 'Names Written', numeral: 'II' },
  { id: 'eyes', label: 'Shinigami Eyes', numeral: 'III' },
  { id: 'contact', label: 'Write a Name', numeral: 'IV' },
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
  // Leave empty to hide the email link. Add an address here to show it.
  email: '',
}

// "HOW TO USE IT" — the About section, written as parody rules of the note.
export const rules: { numeral: string; text: string }[] = [
  {
    numeral: 'I',
    text: 'The developer whose name is written in this note shall turn real problems into working software: ambulance routes through flooded Chattogram streets, electricity bills under Bangladeshi tariff rules, and study tools powered by AI.',
  },
  {
    numeral: 'II',
    text: 'This note shall not take effect unless the writer has the stack in mind: React and FastAPI for the web, Python for machine learning, C++ for problem solving, and Java or Flutter where the job demands it.',
  },
  {
    numeral: 'III',
    text: 'If a model is written within 40 seconds of the name, it shall be built from first principles: logistic regression in NumPy before any framework is allowed to help.',
  },
  {
    numeral: 'IV',
    text: 'If no algorithm is specified, the shortest path shall be found by A*. BFS, DFS, UCS, IDS and Greedy search may be benchmarked against it at the writer’s leisure.',
  },
  {
    numeral: 'V',
    text: 'The note may be shared. Cognify, StockHub and DrugScript were written by many hands, and their owner has learned to merge without conflict.',
  },
  {
    numeral: 'VI',
    text: 'The owner of this note lives in Dhaka, Bangladesh, and remains open to collaboration until the last page is filled.',
  },
]

// "The Mind Behind the Note" — Akram's own words, framed as the owner's case file.
export const about = {
  label: 'Owner of this note · Case file',
  title: 'The Mind Behind the Note',
  paragraphs: [
    'I’m a Computer Science undergraduate who works by one principle: every problem has a solution, waiting to be uncovered, like a name waiting to be written.',
    'I design and build software that turns ideas into practical, reliable and scalable solutions. From intuitive interfaces to the backend systems beneath them, I write with intent: clean architecture, efficient algorithms and experiences that mean something to the people who use them.',
    'My interests span full-stack development, software engineering, cybersecurity and emerging technologies. Like any investigator, I follow the clues into complex problems and unfamiliar tools, until each technical challenge becomes a chance to build something better.',
    'My objective is clear: engineer software with real impact, sharpen my skills with every case, and create technology that leaves its mark.',
  ],
  /** Closing lines, handwritten in red ink. */
  verdict: ['Every system has a weakness.', 'Every problem has a solution.', 'The investigation never ends.'],
}

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

// Competitive programming and DSA practice repositories.
export const problemSolving: { title: string; detail: string; repo: string; since?: number }[] = [
  { title: 'Number Theory', detail: 'C++ solutions, practised since 2020', repo: 'https://github.com/Md-Akram-Khan/Number-theory', since: 2020 },
  { title: 'Data Structures & Algorithms', detail: 'The largest of the practice notebooks', repo: 'https://github.com/Md-Akram-Khan/DSA', since: 2024 },
  { title: 'Graph Theory', detail: 'Traversals, shortest paths and trees', repo: 'https://github.com/Md-Akram-Khan/Graph-Theory', since: 2024 },
  { title: 'CSES Problem Set', detail: 'Working through the CSES archive', repo: 'https://github.com/Md-Akram-Khan/CSES-problems', since: 2024 },
]
