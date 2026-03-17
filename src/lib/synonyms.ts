/**
 * Synonym groups for keyword matching in ATS analysis and job tailoring.
 *
 * Each group contains terms that should be treated as equivalent when
 * comparing a resume against a job description. Matching is case-insensitive.
 *
 * Categories:
 * - Programming languages and their abbreviations
 * - Frameworks and runtime variants
 * - Databases
 * - Cloud platforms and services
 * - DevOps and infrastructure
 * - Methodologies and practices
 * - Action verbs (common resume verb families)
 */

const SYNONYM_GROUPS: string[][] = [
  // Programming languages
  ['JavaScript', 'JS', 'ECMAScript'],
  ['TypeScript', 'TS'],
  ['C#', 'CSharp', 'C Sharp'],
  ['C++', 'CPP'],
  ['Golang', 'Go'],
  ['Python', 'Py'],
  ['Ruby on Rails', 'Rails', 'RoR'],

  // Frontend frameworks/libraries
  ['React', 'React.js', 'ReactJS'],
  ['Vue', 'Vue.js', 'VueJS'],
  ['Angular', 'Angular.js', 'AngularJS'],
  ['Next.js', 'NextJS', 'Next'],
  ['Nuxt', 'Nuxt.js', 'NuxtJS'],
  ['Svelte', 'SvelteKit'],

  // Backend / runtime
  ['Node.js', 'Node', 'NodeJS'],
  ['Express', 'Express.js', 'ExpressJS'],
  ['Deno', 'Deno.js'],
  ['FastAPI', 'Fast API'],
  ['Spring Boot', 'SpringBoot'],

  // Databases
  ['PostgreSQL', 'Postgres', 'PG'],
  ['MongoDB', 'Mongo'],
  ['MySQL', 'MariaDB'],
  ['Microsoft SQL Server', 'MSSQL', 'SQL Server'],
  ['DynamoDB', 'Dynamo DB'],
  ['Elasticsearch', 'Elastic Search', 'ES'],
  ['Redis', 'Redis Cache'],

  // Cloud platforms
  ['Amazon Web Services', 'AWS'],
  ['Google Cloud Platform', 'GCP', 'Google Cloud'],
  ['Microsoft Azure', 'Azure'],

  // Cloud services
  ['Amazon S3', 'S3', 'AWS S3'],
  ['Amazon EC2', 'EC2', 'AWS EC2'],
  ['Amazon Lambda', 'AWS Lambda', 'Lambda'],
  ['Amazon ECS', 'ECS', 'AWS ECS'],
  ['Amazon EKS', 'EKS', 'AWS EKS'],
  ['Amazon RDS', 'RDS', 'AWS RDS'],
  ['Amazon SQS', 'SQS', 'AWS SQS'],
  ['Amazon SNS', 'SNS', 'AWS SNS'],
  ['Google Kubernetes Engine', 'GKE'],
  ['Azure DevOps', 'ADO'],

  // DevOps / Infrastructure
  ['Kubernetes', 'k8s', 'K8s'],
  ['Docker', 'Docker Container', 'Containerization'],
  ['Terraform', 'TF'],
  ['CloudFormation', 'CFN'],
  ['continuous integration', 'CI'],
  ['continuous deployment', 'CD'],
  ['CI/CD', 'CICD', 'CI CD'],
  ['infrastructure as code', 'IaC'],
  ['GitHub Actions', 'GH Actions'],
  ['GitLab CI', 'GitLab CI/CD'],

  // APIs and protocols
  ['REST', 'RESTful', 'REST API'],
  ['GraphQL', 'GQL'],
  ['gRPC', 'GRPC'],
  ['WebSocket', 'WebSockets', 'WS'],

  // Methodologies
  ['Agile', 'Agile methodology'],
  ['Scrum', 'Scrum methodology'],
  ['test-driven development', 'TDD'],
  ['behavior-driven development', 'BDD'],
  ['object-oriented programming', 'OOP'],
  ['functional programming', 'FP'],

  // Data / ML
  ['machine learning', 'ML'],
  ['artificial intelligence', 'AI'],
  ['natural language processing', 'NLP'],
  ['large language model', 'LLM'],
  ['data science', 'data analytics'],

  // Tools
  ['Visual Studio Code', 'VS Code', 'VSCode'],
  ['IntelliJ IDEA', 'IntelliJ'],
  ['Jira', 'Atlassian Jira'],
  ['Confluence', 'Atlassian Confluence'],

  // Action verbs — leadership
  ['managed', 'led', 'directed', 'oversaw', 'supervised', 'headed'],
  ['coordinated', 'orchestrated', 'organized', 'facilitated'],
  ['mentored', 'coached', 'trained', 'guided'],

  // Action verbs — building
  ['developed', 'built', 'created', 'implemented', 'engineered', 'designed'],
  ['architected', 'designed', 'planned', 'structured'],

  // Action verbs — improvement
  ['improved', 'enhanced', 'optimized', 'upgraded', 'streamlined', 'refined'],
  ['reduced', 'decreased', 'minimized', 'cut'],
  ['increased', 'grew', 'expanded', 'scaled', 'boosted'],

  // Action verbs — analysis
  ['analyzed', 'evaluated', 'assessed', 'reviewed', 'audited', 'examined'],
  ['researched', 'investigated', 'explored', 'studied'],

  // Action verbs — delivery
  ['delivered', 'shipped', 'launched', 'released', 'deployed'],
  ['migrated', 'transitioned', 'converted', 'ported'],
  ['integrated', 'incorporated', 'unified', 'consolidated'],
  ['automated', 'scripted', 'programmed'],

  // Common title terms
  ['senior', 'sr', 'Sr.'],
  ['junior', 'jr', 'Jr.'],
  ['full-stack', 'fullstack', 'full stack'],
  ['front-end', 'frontend', 'front end'],
  ['back-end', 'backend', 'back end'],
  ['DevOps', 'Dev Ops', 'SRE', 'site reliability'],
  ['QA', 'quality assurance', 'quality engineering'],
  ['UI', 'user interface'],
  ['UX', 'user experience'],
  ['UI/UX', 'UX/UI'],
];

// ---------------------------------------------------------------------------
// Lookup map — built once at module load
// ---------------------------------------------------------------------------

/** Maps a lowercase term to all its lowercase synonyms (excluding itself) */
const synonymMap = new Map<string, string[]>();

for (const group of SYNONYM_GROUPS) {
  const lowerGroup = group.map((t) => t.toLowerCase());
  for (const term of lowerGroup) {
    const existing = synonymMap.get(term) ?? [];
    for (const other of lowerGroup) {
      if (other !== term && !existing.includes(other)) {
        existing.push(other);
      }
    }
    synonymMap.set(term, existing);
  }
}

/**
 * Get all synonyms for a term (case-insensitive).
 * Returns an empty array if no synonyms are known.
 */
export function getSynonyms(term: string): string[] {
  return synonymMap.get(term.toLowerCase()) ?? [];
}
