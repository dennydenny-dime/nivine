import React, { useMemo, useState } from 'react';

type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type CompanyType = 'Startup' | 'MNC' | 'FAANG' | 'Generic';

type ResourceLink = { label: string; url: string };

type Topic = {
  title: string;
  what: string;
  why: string;
  links: ResourceLink[];
};

type CoreSkill = {
  category: string;
  skill: string;
  concept: string;
  useCase: string;
  task: string;
  links: ResourceLink[];
};

const EXPERIENCE_HINT: Record<ExperienceLevel, string> = {
  Beginner: 'Start with fundamentals and focus on consistency over speed. Build one project per topic.',
  Intermediate: 'You already know basics—prioritize production-quality projects and interview articulation.',
  Advanced: 'Focus on system trade-offs, optimization, leadership-level decisions, and edge cases.',
};

const makeFreeLinks = {
  cs50: { label: 'CS50x (Harvard, Free)', url: 'https://cs50.harvard.edu/x/' },
  roadmap: { label: 'roadmap.sh', url: 'https://roadmap.sh/' },
  freeCodeCamp: { label: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/' },
  mdn: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
  git: { label: 'Git Documentation', url: 'https://git-scm.com/doc' },
  systemDesignPrimer: { label: 'System Design Primer (GitHub)', url: 'https://github.com/donnemartin/system-design-primer' },
  neetCode: { label: 'NeetCode (YouTube)', url: 'https://www.youtube.com/@NeetCode' },
  gcpDesign: { label: 'Google Cloud Architecture Center', url: 'https://cloud.google.com/architecture' },
  owasp: { label: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' },
  leetcode: { label: 'LeetCode', url: 'https://leetcode.com/' },
  pramp: { label: 'Pramp Mock Interviews', url: 'https://www.pramp.com/' },
  interviewingIo: { label: 'interviewing.io', url: 'https://interviewing.io/' },
  behavioural: { label: 'Indeed STAR Method Guide', url: 'https://www.indeed.com/career-advice/interviewing/star-interview-method' },
  githubDocs: { label: 'GitHub Docs', url: 'https://docs.github.com/' },
  stackOverflow: { label: 'Stack Overflow', url: 'https://stackoverflow.com/' },
};

const LearningModulesPage: React.FC = () => {
  const [roleName, setRoleName] = useState('Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Beginner');
  const [companyType, setCompanyType] = useState<CompanyType>('Generic');
  const [country, setCountry] = useState('');

  const foundations: Topic[] = useMemo(() => [
    {
      title: 'Programming Fundamentals + Problem Solving',
      what: 'Variables, control flow, data structures, time complexity, and clean coding basics.',
      why: `This is the baseline for any ${roleName} role and is heavily tested in coding interviews.`,
      links: [makeFreeLinks.cs50, makeFreeLinks.freeCodeCamp, makeFreeLinks.neetCode],
    },
    {
      title: 'Version Control + Collaboration',
      what: 'Git branching, pull requests, commit hygiene, and code reviews.',
      why: 'Real teams ship collaboratively—strong Git habits are mandatory across startups and enterprises.',
      links: [makeFreeLinks.git, makeFreeLinks.githubDocs, { label: 'Atlassian Git Tutorials', url: 'https://www.atlassian.com/git/tutorials' }],
    },
    {
      title: 'Computer Science Core',
      what: 'Networking basics, OS processes/threads, and database fundamentals.',
      why: 'These concepts explain performance bottlenecks and design trade-offs in production systems.',
      links: [
        { label: 'Teach Yourself CS', url: 'https://teachyourselfcs.com/' },
        { label: 'Stanford CS 144 (Computer Networking)', url: 'https://cs144.github.io/' },
        { label: 'PostgreSQL Tutorial', url: 'https://www.postgresql.org/docs/current/tutorial.html' },
      ],
    },
  ], [roleName]);

  const coreSkills: CoreSkill[] = useMemo(() => [
    {
      category: 'Backend & APIs',
      skill: 'REST API design + data modeling',
      concept: 'Design endpoints, validation rules, schema relationships, and error contracts.',
      useCase: 'Build user authentication and profile workflows for a job platform.',
      task: 'Build an API with CRUD + auth + pagination + logging.',
      links: [
        { label: 'REST API Tutorial', url: 'https://restfulapi.net/' },
        { label: 'FastAPI Docs', url: 'https://fastapi.tiangolo.com/' },
        { label: 'Express.js Guide', url: 'https://expressjs.com/en/guide/routing.html' },
      ],
    },
    {
      category: 'Databases',
      skill: 'SQL optimization and indexing',
      concept: 'Joins, indexing strategy, query plans, and transaction behavior.',
      useCase: 'Speed up dashboards and analytics for candidate pipeline reports.',
      task: 'Design schema and optimize 5 slow queries with EXPLAIN plans.',
      links: [
        { label: 'Use The Index, Luke!', url: 'https://use-the-index-luke.com/' },
        { label: 'PostgreSQL EXPLAIN', url: 'https://www.postgresql.org/docs/current/using-explain.html' },
        { label: 'SQLBolt', url: 'https://sqlbolt.com/' },
      ],
    },
    {
      category: 'Testing + Delivery',
      skill: 'Unit/integration testing + CI/CD',
      concept: 'Automated testing pyramid, linting, build checks, and deployment pipelines.',
      useCase: 'Prevent regressions before production releases.',
      task: 'Set up CI pipeline with tests, lint checks, and preview deployments.',
      links: [
        { label: 'GitHub Actions Docs', url: 'https://docs.github.com/en/actions' },
        { label: 'Testing Library Docs', url: 'https://testing-library.com/docs/' },
        { label: 'Jest Docs', url: 'https://jestjs.io/docs/getting-started' },
      ],
    },
  ], []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl md:text-3xl font-black">📖 Role-based Learning Modules</h1>
        <p className="text-slate-300 mt-2">Generate a practical, structured roadmap with free learning links for your target role.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <input value={roleName} onChange={(e) => setRoleName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2" placeholder="Role name" />
          <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <select value={companyType} onChange={(e) => setCompanyType(e.target.value as CompanyType)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
            <option>Startup</option>
            <option>MNC</option>
            <option>FAANG</option>
            <option>Generic</option>
          </select>
          <input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2" placeholder="Country (optional)" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 space-y-6">
        <h2 className="text-xl font-bold"># 🚀 Role Overview</h2>
        <ul className="list-disc pl-5 text-slate-300 space-y-1">
          <li>{roleName} designs, builds, and improves reliable software systems that solve business problems.</li>
          <li>Key responsibilities: build features, review code, debug issues, collaborate across product/design, and ship production changes.</li>
          <li>Core skills required: coding, system thinking, communication, debugging, testing, and ownership mindset.</li>
        </ul>
        <p className="text-sm text-indigo-200 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-2">Experience lens: {EXPERIENCE_HINT[experienceLevel]}</p>
        <p className="text-sm text-slate-400">Target company type: <strong>{companyType}</strong>{country ? ` • Country context: ${country}` : ''}</p>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 space-y-5">
        <h2 className="text-xl font-bold"># 🧠 Skill Roadmap (Structured Learning Path)</h2>
        <h3 className="text-lg font-semibold">## 1️⃣ Foundations</h3>
        <div className="space-y-3">
          {foundations.map((topic) => (
            <article key={topic.title} className="rounded-xl border border-slate-800 p-4">
              <h4 className="font-semibold text-white">{topic.title}</h4>
              <p className="text-sm text-slate-300 mt-1"><strong>What to learn:</strong> {topic.what}</p>
              <p className="text-sm text-slate-300"><strong>Why it matters:</strong> {topic.why}</p>
              <div className="text-sm text-indigo-200 mt-1">{topic.links.map((link) => <a key={link.url} className="underline mr-3" href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
            </article>
          ))}
        </div>

        <h3 className="text-lg font-semibold">## 2️⃣ Core Technical Skills</h3>
        <div className="space-y-3">
          {coreSkills.map((skill) => (
            <article key={skill.skill} className="rounded-xl border border-slate-800 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{skill.category}</p>
              <h4 className="font-semibold">{skill.skill}</h4>
              <p className="text-sm text-slate-300"><strong>Concept:</strong> {skill.concept}</p>
              <p className="text-sm text-slate-300"><strong>Use case:</strong> {skill.useCase}</p>
              <p className="text-sm text-slate-300"><strong>Practical task:</strong> {skill.task}</p>
              <div className="text-sm text-indigo-200 mt-1">{skill.links.map((link) => <a key={link.url} className="underline mr-3" href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
            </article>
          ))}
        </div>

        <h3 className="text-lg font-semibold">## 3️⃣ Advanced / Interview-Level Skills</h3>
        <ul className="list-disc pl-5 text-slate-300 space-y-1">
          <li>System design: scalable APIs, caching, queues, consistency models. <a className="underline text-indigo-200" href={makeFreeLinks.systemDesignPrimer.url} target="_blank" rel="noreferrer">{makeFreeLinks.systemDesignPrimer.label}</a></li>
          <li>Optimization: latency profiling, query tuning, and cost/performance trade-offs. <a className="underline text-indigo-200" href={makeFreeLinks.gcpDesign.url} target="_blank" rel="noreferrer">Architecture Center</a></li>
          <li>Industry best practices: threat modeling, OWASP basics, observability, SLOs. <a className="underline text-indigo-200" href={makeFreeLinks.owasp.url} target="_blank" rel="noreferrer">OWASP Top 10</a></li>
          <li>Interview tools/frameworks: DSA prep cadence, STAR stories, mock interview loops. <a className="underline text-indigo-200" href={makeFreeLinks.leetcode.url} target="_blank" rel="noreferrer">LeetCode</a></li>
        </ul>

        <h3 className="text-lg font-semibold">## 4️⃣ Practical Projects Roadmap</h3>
        <ul className="space-y-2 text-slate-300">
          <li><strong>Beginner:</strong> Personal task tracker with login and CRUD. Demonstrates fundamentals, auth, and basic deployment.</li>
          <li><strong>Intermediate:</strong> Job application tracker with analytics dashboard. Demonstrates APIs, SQL optimization, and CI testing.</li>
          <li><strong>Advanced:</strong> Interview intelligence platform with role-based recommendations. Demonstrates system design, scale readiness, and product thinking.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 space-y-3">
        <h2 className="text-xl font-bold"># 🎯 Interview Preparation Section</h2>
        <ul className="list-disc pl-5 text-slate-300 space-y-1">
          <li>Common technical questions: data structures, API design, SQL joins/indexes, caching, concurrency.</li>
          <li>Behavioral questions: conflict resolution, ownership, failures, stakeholder communication (<a className="underline text-indigo-200" href={makeFreeLinks.behavioural.url} target="_blank" rel="noreferrer">STAR guide</a>).</li>
          <li>Case/scenario examples: “Design a scalable notification system” / “Debug sudden p95 latency regression.”</li>
          <li>Mock interview resources: <a className="underline text-indigo-200" href={makeFreeLinks.pramp.url} target="_blank" rel="noreferrer">Pramp</a>, <a className="underline text-indigo-200" href={makeFreeLinks.interviewingIo.url} target="_blank" rel="noreferrer">interviewing.io</a>.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 space-y-3">
        <h2 className="text-xl font-bold"># 🛠 Tools & Software to Master</h2>
        <ul className="list-disc pl-5 text-slate-300">
          <li>Version control: <a className="underline text-indigo-200" href="https://git-scm.com/" target="_blank" rel="noreferrer">Git</a>, <a className="underline text-indigo-200" href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a></li>
          <li>API tools: <a className="underline text-indigo-200" href="https://www.postman.com/" target="_blank" rel="noreferrer">Postman</a>, <a className="underline text-indigo-200" href="https://insomnia.rest/" target="_blank" rel="noreferrer">Insomnia</a></li>
          <li>Database tools: <a className="underline text-indigo-200" href="https://www.postgresql.org/" target="_blank" rel="noreferrer">PostgreSQL</a>, <a className="underline text-indigo-200" href="https://sqlite.org/" target="_blank" rel="noreferrer">SQLite</a></li>
          <li>DevOps/Cloud: <a className="underline text-indigo-200" href="https://docs.docker.com/" target="_blank" rel="noreferrer">Docker Docs</a>, <a className="underline text-indigo-200" href="https://docs.github.com/en/actions" target="_blank" rel="noreferrer">GitHub Actions</a></li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 space-y-2">
        <h2 className="text-xl font-bold"># 📚 Must-Read Resources</h2>
        <ul className="list-disc pl-5 text-slate-300 space-y-1">
          <li>Blogs: <a className="underline text-indigo-200" href="https://martinfowler.com/" target="_blank" rel="noreferrer">Martin Fowler</a>, <a className="underline text-indigo-200" href="https://netflixtechblog.com/" target="_blank" rel="noreferrer">Netflix Tech Blog</a>, <a className="underline text-indigo-200" href="https://engineering.fb.com/" target="_blank" rel="noreferrer">Meta Engineering</a></li>
          <li>YouTube channels: <a className="underline text-indigo-200" href="https://www.youtube.com/@NeetCode" target="_blank" rel="noreferrer">NeetCode</a>, <a className="underline text-indigo-200" href="https://www.youtube.com/@freecodecamp" target="_blank" rel="noreferrer">freeCodeCamp</a></li>
          <li>Documentation links: <a className="underline text-indigo-200" href="https://developer.mozilla.org/" target="_blank" rel="noreferrer">MDN Docs</a>, <a className="underline text-indigo-200" href="https://docs.python.org/3/" target="_blank" rel="noreferrer">Python Docs</a></li>
          <li>Community/forum: <a className="underline text-indigo-200" href={makeFreeLinks.stackOverflow.url} target="_blank" rel="noreferrer">Stack Overflow</a></li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 space-y-2">
        <h2 className="text-xl font-bold"># 🗺 30-60-90 Day Learning Plan</h2>
        <ul className="text-slate-300 space-y-1">
          <li><strong>Month 1 – Core fundamentals:</strong> language basics, DSA warm-up, Git workflow, one mini-project.</li>
          <li><strong>Month 2 – Skill building + projects:</strong> API + DB project, test coverage, CI setup, deploy and document.</li>
          <li><strong>Month 3 – Interview prep + advanced topics:</strong> system design drills, 60+ interview problems, mock interviews, resume/portfolio refinement.</li>
        </ul>
      </section>
    </div>
  );
};

export default LearningModulesPage;
