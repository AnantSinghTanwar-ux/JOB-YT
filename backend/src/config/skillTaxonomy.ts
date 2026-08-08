/**
 * ATS Skill Taxonomy
 *
 * Canonical skill list (500+ entries) organized by category.
 * Used by the ATS scoring engine to:
 *   1. Extract skills from resume text (substring match with word-boundary awareness)
 *   2. Extract skills from job descriptions
 *   3. Normalize aliases (js → JavaScript, postgres → PostgreSQL)
 *   4. Group skills by domain for structured experience matching
 *
 * ── Design decisions ────────────────────────────────────────────────────────
 *   • Skills with length ≥ 3 only — prevents single-char false-positives ('R').
 *   • Multi-word skills (e.g. "Machine Learning") are matched with word-boundary
 *     awareness by the extractor, not raw substring.
 *   • Aliases map ALL known variants → canonical name.
 *   • Domain concepts enable semantic clustering (e.g. "ML" → Machine Learning domain).
 */

// ── Canonical skill list by category ─────────────────────────────────────────

export const SKILL_CATEGORIES: Record<string, string[]> = {
  'Languages': [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'C',
    'Swift', 'Kotlin', 'PHP', 'Ruby', 'Scala', 'Elixir', 'Dart', 'Haskell',
    'Erlang', 'Clojure', 'Groovy', 'Perl', 'Lua', 'MATLAB', 'Julia', 'Nim',
    'Crystal', 'Zig', 'Solidity', 'Assembly', 'COBOL', 'Fortran', 'PowerShell',
    'Bash', 'Shell',
  ],
  'Frontend': [
    'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte', 'Remix', 'SvelteKit',
    'Astro', 'Qwik', 'HTML', 'CSS', 'Tailwind', 'Sass', 'SCSS', 'Bootstrap',
    'Material UI', 'Chakra UI', 'Ant Design', 'Shadcn', 'Radix UI',
    'Storybook', 'Webpack', 'Vite', 'Parcel', 'Rollup', 'esbuild', 'Babel',
    'PostCSS', 'CSS Modules', 'Styled Components', 'Emotion', 'Framer Motion',
    'GSAP', 'Three.js', 'D3.js', 'Chart.js', 'Redux', 'Zustand', 'Recoil',
    'MobX', 'Jotai', 'React Query', 'SWR', 'Axios', 'Fetch API',
    'Web Components', 'Lit', 'Alpine.js', 'Htmx', 'jQuery',
  ],
  'Backend': [
    'Node.js', 'Express.js', 'NestJS', 'Fastify', 'Hono', 'Koa',
    'Django', 'FastAPI', 'Flask', 'Tornado', 'Celery',
    'Spring', 'Spring Boot', 'Spring MVC', 'Hibernate',
    'Rails', 'Sinatra', 'Laravel', 'Symfony', 'CodeIgniter',
    'Gin', 'Fiber', 'Echo', 'Chi',
    'Actix', 'Axum', 'Rocket',
    'Ktor', 'Micronaut', 'Quarkus',
    'gRPC', 'REST', 'REST APIs', 'GraphQL', 'WebSockets', 'tRPC',
    'Microservices', 'Serverless', 'Event-Driven', 'CQRS', 'Event Sourcing',
    'Message Queue', 'RabbitMQ', 'SQS',
  ],
  'Databases': [
    'PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle',
    'MongoDB', 'CouchDB', 'RavenDB',
    'Redis', 'Memcached',
    'Cassandra', 'ScyllaDB',
    'Elasticsearch', 'OpenSearch', 'Solr',
    'DynamoDB', 'CosmosDB',
    'Firebase', 'Firestore', 'Supabase',
    'Snowflake', 'BigQuery', 'Redshift', 'ClickHouse',
    'CockroachDB', 'PlanetScale', 'Neon', 'Turso',
    'Neo4j', 'ArangoDB', 'OrientDB',
    'InfluxDB', 'TimescaleDB',
    'Fauna', 'Upstash',
    'SQL', 'NoSQL',
  ],
  'ORMs': [
    'Prisma', 'TypeORM', 'Sequelize', 'Drizzle', 'Knex',
    'SQLAlchemy', 'Django ORM', 'Peewee',
    'Hibernate', 'JPA', 'JOOQ', 'MyBatis',
    'Active Record', 'Ecto',
    'Mongoose', 'Mongoengine',
  ],
  'Cloud': [
    'AWS', 'GCP', 'Azure', 'Cloudflare', 'Vercel', 'Netlify',
    'Railway', 'Render', 'Heroku', 'Digital Ocean', 'Linode',
    'S3', 'EC2', 'Lambda', 'ECS', 'EKS', 'RDS', 'CloudFront',
    'IAM', 'VPC', 'Route 53', 'SNS', 'SQS', 'API Gateway',
    'Cloud Functions', 'Cloud Run', 'Cloud Storage', 'BigQuery',
    'App Engine', 'GKE',
    'Azure Functions', 'Azure DevOps', 'Azure Blob Storage', 'AKS',
    'Cloudflare Workers', 'Cloudflare Pages',
  ],
  'DevOps': [
    'Docker', 'Kubernetes', 'Helm', 'ArgoCD', 'Flux',
    'Terraform', 'Pulumi', 'Ansible', 'Chef', 'Puppet',
    'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI',
    'Bitbucket Pipelines', 'Drone CI', 'TeamCity',
    'CI/CD', 'DevOps', 'SRE', 'Platform Engineering',
    'Nginx', 'Apache', 'Caddy', 'HAProxy', 'Traefik',
    'Linux', 'Ubuntu', 'CentOS', 'Debian',
    'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Sentry',
    'Jaeger', 'OpenTelemetry', 'ELK Stack', 'Loki',
    'Vault', 'Consul', 'Service Mesh', 'Istio', 'Envoy',
  ],
  'AI/ML': [
    'Machine Learning', 'Deep Learning', 'Artificial Intelligence',
    'TensorFlow', 'PyTorch', 'Keras', 'JAX', 'MXNet',
    'scikit-learn', 'XGBoost', 'LightGBM', 'CatBoost',
    'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn', 'Plotly',
    'Jupyter', 'Jupyter Notebooks',
    'Hugging Face', 'Transformers', 'BERT', 'GPT', 'LLM',
    'OpenAI', 'LangChain', 'LlamaIndex', 'Langsmith',
    'Computer Vision', 'OpenCV', 'YOLO', 'Stable Diffusion',
    'NLP', 'spaCy', 'NLTK', 'Gensim',
    'RAG', 'Fine-tuning', 'RLHF', 'Embeddings',
    'MLflow', 'Weights & Biases', 'DVC', 'Kubeflow',
    'Reinforcement Learning', 'Generative AI', 'Diffusion Models',
    'Recommendation Systems', 'Time Series', 'Anomaly Detection',
  ],
  'Data Engineering': [
    'Apache Spark', 'Kafka', 'Apache Airflow', 'dbt', 'Apache Flink',
    'Hadoop', 'Hive', 'Pig', 'Sqoop',
    'Databricks', 'Delta Lake', 'Apache Iceberg',
    'Looker', 'Tableau', 'Power BI', 'Metabase', 'Superset',
    'ETL', 'ELT', 'Data Pipeline', 'Data Warehouse', 'Data Lake',
    'Data Engineering', 'Data Science', 'Data Analysis',
    'Business Intelligence', 'Analytics', 'A/B Testing',
    'Statistics', 'Probability',
  ],
  'Mobile': [
    'React Native', 'Flutter', 'SwiftUI', 'UIKit',
    'Jetpack Compose', 'Android', 'iOS',
    'Expo', 'Capacitor', 'Ionic', 'Xamarin', 'Cordova',
    'Mobile Development', 'Cross-Platform',
  ],
  'Testing': [
    'Jest', 'Vitest', 'Mocha', 'Chai', 'Jasmine',
    'Cypress', 'Playwright', 'Selenium', 'Puppeteer',
    'Testing Library', 'React Testing Library',
    'pytest', 'unittest', 'nose',
    'JUnit', 'Mockito', 'TestNG',
    'Postman', 'Insomnia', 'Hoppscotch',
    'k6', 'Artillery', 'Locust', 'JMeter',
    'TDD', 'BDD', 'Unit Testing', 'Integration Testing', 'E2E Testing',
  ],
  'Security': [
    'OAuth', 'OAuth2', 'JWT', 'Auth0', 'Okta', 'Keycloak',
    'OWASP', 'Penetration Testing', 'Cloud Security', 'IAM',
    'Zero Trust', 'DevSecOps', 'SIEM', 'SOC',
    'Kali Linux', 'Burp Suite', 'Nmap', 'Metasploit',
    'SSL/TLS', 'HTTPS', 'CORS', 'CSP', 'XSS', 'CSRF', 'SQL Injection',
    'Encryption', 'PKI', 'Certificates', 'Rate Limiting',
    'Web Application Firewall', 'WAF',
    'Cybersecurity', 'Information Security',
  ],
  'Tools': [
    'Git', 'GitHub', 'GitLab', 'Bitbucket',
    'Jira', 'Confluence', 'Notion', 'Linear', 'Trello', 'Asana',
    'Slack', 'Figma', 'Miro', 'Mermaid',
    'VS Code', 'IntelliJ IDEA', 'WebStorm', 'PyCharm',
    'Postman', 'Insomnia',
    'npm', 'yarn', 'pnpm', 'pip', 'poetry',
    'Make', 'Makefile', 'CMake',
  ],
  'Practices': [
    'Agile', 'Scrum', 'Kanban', 'SAFe', 'Lean',
    'System Design', 'Data Structures', 'Algorithms',
    'Design Patterns', 'SOLID', 'DRY', 'KISS',
    'Microservices Architecture', 'Monolithic Architecture',
    'API Design', 'REST API Design', 'OpenAPI', 'Swagger',
    'Code Review', 'Pair Programming', 'TDD', 'BDD',
    'Clean Code', 'Refactoring',
    'Problem Solving', 'Communication', 'Leadership',
    'Product Management', 'Project Management',
    'SEO', 'Performance Optimization', 'Accessibility', 'WCAG',
    'Responsive Design', 'Progressive Web Apps', 'PWA',
    'Internationalization', 'i18n',
  ],
};

// ── Alias map: variant → canonical name ──────────────────────────────────────
// Keys are lowercased for lookup efficiency.

export const SKILL_ALIASES: Record<string, string> = {
  // JavaScript
  'js': 'JavaScript',
  'vanilla js': 'JavaScript',
  'vanilla javascript': 'JavaScript',
  'ecmascript': 'JavaScript',
  'es6': 'JavaScript',
  'es2015': 'JavaScript',
  'es2020': 'JavaScript',
  // TypeScript
  'ts': 'TypeScript',
  // Python
  'py': 'Python',
  'python3': 'Python',
  // Go
  'golang': 'Go',
  'go lang': 'Go',
  // Rust
  'rust lang': 'Rust',
  'rustlang': 'Rust',
  // C#
  'csharp': 'C#',
  'c sharp': 'C#',
  'dotnet': '.NET',
  'dot net': '.NET',
  '.net core': '.NET',
  'asp.net': '.NET',
  'asp net': '.NET',
  // Kotlin
  'kt': 'Kotlin',
  // React
  'react.js': 'React',
  'reactjs': 'React',
  'react js': 'React',
  // Vue
  'vue.js': 'Vue',
  'vuejs': 'Vue',
  'vue js': 'Vue',
  'vue3': 'Vue',
  'vue2': 'Vue',
  // Angular
  'angular.js': 'Angular',
  'angularjs': 'Angular',
  'angular js': 'Angular',
  'angular2': 'Angular',
  // Next.js
  'next': 'Next.js',
  'nextjs': 'Next.js',
  'next js': 'Next.js',
  'next.js 13': 'Next.js',
  'next.js 14': 'Next.js',
  // Nuxt
  'nuxt.js': 'Nuxt',
  'nuxtjs': 'Nuxt',
  // Svelte
  'sveltejs': 'Svelte',
  'svelte.js': 'Svelte',
  // Node.js
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node js': 'Node.js',
  'node.js': 'Node.js',
  // Express.js
  'express': 'Express.js',
  'expressjs': 'Express.js',
  'express js': 'Express.js',
  'express.js': 'Express.js',
  // NestJS
  'nest': 'NestJS',
  'nest.js': 'NestJS',
  'nestjs': 'NestJS',
  // Spring
  'spring boot': 'Spring Boot',
  'spring framework': 'Spring',
  'springboot': 'Spring Boot',
  // Django
  'django rest framework': 'Django',
  'drf': 'Django',
  // FastAPI
  'fast api': 'FastAPI',
  'fast-api': 'FastAPI',
  // CSS
  'css3': 'CSS',
  'cascading style sheets': 'CSS',
  // HTML
  'html5': 'HTML',
  'hypertext markup language': 'HTML',
  // Tailwind
  'tailwindcss': 'Tailwind',
  'tailwind css': 'Tailwind',
  'tailwind.css': 'Tailwind',
  // Sass
  'scss': 'Sass',
  'less': 'CSS',
  // Bootstrap
  'bootstrap 5': 'Bootstrap',
  'bootstrap4': 'Bootstrap',
  // Redux
  'redux toolkit': 'Redux',
  'rtk': 'Redux',
  'redux-saga': 'Redux',
  'redux-thunk': 'Redux',
  // PostgreSQL
  'pg': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'psql': 'PostgreSQL',
  // MySQL
  'mariadb': 'MySQL',
  // MongoDB
  'mongo': 'MongoDB',
  // Redis
  'redis cache': 'Redis',
  'redis db': 'Redis',
  // SQL
  'structured query language': 'SQL',
  'sequel': 'SQL',
  // NoSQL
  'non-relational': 'NoSQL',
  'non relational': 'NoSQL',
  // Prisma
  'prisma orm': 'Prisma',
  // TypeORM
  'type orm': 'TypeORM',
  // Sequelize
  'sequelizejs': 'Sequelize',
  // AWS
  'amazon web services': 'AWS',
  'amazon aws': 'AWS',
  'aws cloud': 'AWS',
  // GCP
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'google cloud services': 'GCP',
  // Azure
  'microsoft azure': 'Azure',
  'ms azure': 'Azure',
  'azure cloud': 'Azure',
  // Docker
  'docker container': 'Docker',
  'containers': 'Docker',
  // Kubernetes
  'k8s': 'Kubernetes',
  'kube': 'Kubernetes',
  'k8': 'Kubernetes',
  // Terraform
  'tf': 'Terraform',
  'terraform hcl': 'Terraform',
  // GitHub Actions
  'github action': 'GitHub Actions',
  'gh actions': 'GitHub Actions',
  // GitLab CI
  'gitlab cicd': 'GitLab CI',
  'gitlab ci/cd': 'GitLab CI',
  // CI/CD
  'ci': 'CI/CD',
  'cd': 'CI/CD',
  'ci cd': 'CI/CD',
  'continuous integration': 'CI/CD',
  'continuous deployment': 'CI/CD',
  'continuous delivery': 'CI/CD',
  'devops': 'DevOps',
  // Machine Learning
  'ml': 'Machine Learning',
  'machine-learning': 'Machine Learning',
  'statistical modeling': 'Machine Learning',
  // Deep Learning
  'dl': 'Deep Learning',
  'neural networks': 'Deep Learning',
  'neural network': 'Deep Learning',
  // AI
  'ai': 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',
  'generative ai': 'Generative AI',
  'gen ai': 'Generative AI',
  // LLM
  'large language model': 'LLM',
  'large language models': 'LLM',
  'llms': 'LLM',
  // NLP
  'natural language processing': 'NLPs',
  'text analytics': 'NLP',
  // Computer Vision
  'cv': 'Computer Vision',
  'image recognition': 'Computer Vision',
  'image processing': 'Computer Vision',
  'object detection': 'Computer Vision',
  // RAG
  'retrieval augmented generation': 'RAG',
  'retrieval-augmented generation': 'RAG',
  // Hugging Face
  'huggingface': 'Hugging Face',
  'hf': 'Hugging Face',
  // OpenAI
  'openai api': 'OpenAI',
  'chatgpt api': 'OpenAI',
  'gpt4': 'OpenAI',
  'gpt-4': 'OpenAI',
  // LangChain
  'lang chain': 'LangChain',
  // Data Science
  'data science': 'Data Science',
  'data analysis': 'Data Analysis',
  'data analytics': 'Analytics',
  'business intelligence': 'Business Intelligence',
  // Pandas
  'pandas dataframe': 'Pandas',
  // NumPy
  'numpy': 'NumPy',
  // Spark
  'pyspark': 'Apache Spark',
  'spark': 'Apache Spark',
  // Kafka
  'apache kafka': 'Kafka',
  'kafka streams': 'Kafka',
  // Airflow
  'apache airflow': 'Apache Airflow',
  // React Native
  'rn': 'React Native',
  'react-native': 'React Native',
  // Flutter
  'flutter dart': 'Flutter',
  // Swift
  'swiftui': 'SwiftUI',
  'swift ui': 'SwiftUI',
  // Kotlin Compose
  'compose': 'Jetpack Compose',
  'jetpack': 'Jetpack Compose',
  // OAuth / Auth
  'oauth 2': 'OAuth',
  'oauth2': 'OAuth',
  'oidc': 'OAuth',
  'open id connect': 'OAuth',
  // JWT
  'json web token': 'JWT',
  'json web tokens': 'JWT',
  // Git
  'github': 'Git',
  'gitlab': 'Git',
  'bitbucket': 'Git',
  'version control': 'Git',
  'source control': 'Git',
  // GraphQL
  'gql': 'GraphQL',
  // REST
  'rest': 'REST APIs',
  'rest api': 'REST APIs',
  'restful': 'REST APIs',
  'restful api': 'REST APIs',
  'http api': 'REST APIs',
  // gRPC
  'grpc': 'gRPC',
  'protocol buffers': 'gRPC',
  'protobuf': 'gRPC',
  // WebSockets
  'websocket': 'WebSockets',
  'ws': 'WebSockets',
  'socket.io': 'WebSockets',
  // Data Structures
  'dsa': 'Data Structures',
  'data structures and algorithms': 'Data Structures',
  'ds and algo': 'Data Structures',
  'ds algo': 'Data Structures',
  // System Design
  'system design': 'System Design',
  'distributed systems': 'System Design',
  'low level design': 'System Design',
  'high level design': 'System Design',
  'lld': 'System Design',
  'hld': 'System Design',
  // Agile
  'agile methodology': 'Agile',
  'agile development': 'Agile',
  // Scrum
  'scrum methodology': 'Scrum',
  'scrum master': 'Scrum',
  // Shell/Bash
  'shell scripting': 'Bash',
  'shell script': 'Bash',
  'zsh': 'Bash',
  // Linux
  'unix': 'Linux',
  'ubuntu': 'Linux',
  'centos': 'Linux',
  'debian': 'Linux',
  'fedora': 'Linux',
  'rhel': 'Linux',
  // Security
  'penetration testing': 'Penetration Testing',
  'pen testing': 'Penetration Testing',
  'pen test': 'Penetration Testing',
  'ethical hacking': 'Penetration Testing',
  'cloud security': 'Cloud Security',
  'cyber security': 'Cybersecurity',
  'cybersecurity': 'Cybersecurity',
  'infosec': 'Information Security',
  'owasp top 10': 'OWASP',
  // Testing
  'unit test': 'Unit Testing',
  'unit tests': 'Unit Testing',
  'integration test': 'Integration Testing',
  'end to end': 'E2E Testing',
  'e2e': 'E2E Testing',
  'tdd': 'TDD',
  'test driven development': 'TDD',
  'bdd': 'BDD',
  'behavior driven development': 'BDD',
  // OOP
  'oop': 'Design Patterns',
  'object oriented programming': 'Design Patterns',
  'object-oriented': 'Design Patterns',
  'functional programming': 'Design Patterns',
  // Microservices
  'microservice': 'Microservices',
  'micro services': 'Microservices',
  'service oriented architecture': 'Microservices',
  'soa': 'Microservices',
  // Serverless
  'faas': 'Serverless',
  'function as a service': 'Serverless',
  'aws lambda': 'Serverless',
  // PWA
  'progressive web app': 'PWA',
  'progressive web apps': 'PWA',
  // Misc
  'problem-solving': 'Problem Solving',
  'communication skills': 'Communication',
  'team player': 'Communication',
  'team work': 'Communication',
  'teamwork': 'Communication',
};

// ── Flattened full skill list ─────────────────────────────────────────────────

export const ALL_SKILLS: string[] = Object.values(SKILL_CATEGORIES).flat();

// ── Domain → required skills mapping ─────────────────────────────────────────
// Used for experience scoring: if resume mentions a domain, we infer related skills.

export const DOMAIN_SKILLS: Record<string, string[]> = {
  'web development': ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'REST APIs'],
  'frontend': ['React', 'Vue', 'Angular', 'HTML', 'CSS', 'JavaScript', 'TypeScript'],
  'backend': ['Node.js', 'Express.js', 'REST APIs', 'PostgreSQL', 'SQL', 'Docker'],
  'full stack': ['React', 'Node.js', 'PostgreSQL', 'REST APIs', 'Docker', 'TypeScript'],
  'machine learning': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'],
  'data science': ['Python', 'Data Science', 'Pandas', 'NumPy', 'Machine Learning', 'SQL'],
  'data engineering': ['Python', 'Apache Spark', 'Kafka', 'SQL', 'Apache Airflow', 'ETL'],
  'devops': ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Linux', 'Bash'],
  'cloud': ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform'],
  'mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android'],
  'security': ['OAuth', 'JWT', 'OWASP', 'Penetration Testing', 'Cybersecurity'],
  'computer vision': ['Python', 'Computer Vision', 'OpenCV', 'TensorFlow', 'PyTorch', 'YOLO'],
  'nlp': ['Python', 'NLP', 'Hugging Face', 'BERT', 'spaCy', 'NLTK'],
  'generative ai': ['Python', 'LLM', 'OpenAI', 'LangChain', 'RAG', 'Hugging Face'],
  'system design': ['System Design', 'Microservices', 'Distributed Systems', 'SQL', 'NoSQL'],
  'blockchain': ['Solidity', 'Ethereum', 'Web3', 'Smart Contracts'],
};

// ── Job title → domain mapping ────────────────────────────────────────────────

export const TITLE_TO_DOMAIN: Record<string, string[]> = {
  'software engineer': ['backend', 'full stack'],
  'software developer': ['backend', 'full stack'],
  'full stack': ['full stack', 'frontend', 'backend'],
  'frontend': ['frontend', 'web development'],
  'frontend developer': ['frontend', 'web development'],
  'backend': ['backend'],
  'backend developer': ['backend'],
  'backend engineer': ['backend'],
  'react developer': ['frontend'],
  'node developer': ['backend'],
  'python developer': ['backend', 'machine learning'],
  'ml engineer': ['machine learning', 'data science'],
  'machine learning': ['machine learning'],
  'data scientist': ['data science', 'machine learning'],
  'data engineer': ['data engineering'],
  'devops': ['devops', 'cloud'],
  'sre': ['devops', 'cloud'],
  'platform engineer': ['devops', 'cloud'],
  'cloud': ['cloud', 'devops'],
  'mobile': ['mobile'],
  'ios': ['mobile'],
  'android': ['mobile'],
  'security': ['security'],
  'cybersecurity': ['security'],
  'computer vision': ['computer vision'],
  'nlp engineer': ['nlp'],
  'ai engineer': ['generative ai', 'machine learning'],
  'generative ai': ['generative ai'],
  'blockchain': ['blockchain'],
};

// ── Utility: normalize a skill string ────────────────────────────────────────

/**
 * Normalize a raw skill string to its canonical form.
 * 1. Lowercase + trim
 * 2. Check alias map
 * 3. Return canonical name (preserving original case) or original
 */
export function normalizeSkill(raw: string): string {
  const lower = raw.toLowerCase().trim();
  const aliased = SKILL_ALIASES[lower];
  if (aliased) return aliased;

  // Try partial alias lookup with word-boundary awareness (for compound terms like "vue.js development")
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (alias.length < 3) continue;

    // Use safe boundary transitions checking that matches boundaries of special characters
    const escaped = alias.replace(/[+#.]/g, '\\$&');
    const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');

    if (pattern.test(lower)) {
      // Specific safety overrides for common false-positive substring/word overlaps:
      if (alias === 'next' && lower.includes('generation')) continue;
      if (alias === 'git' && lower.includes('digital')) continue;
      if (alias === 'gin' && lower.includes('engineering')) continue;
      if (alias === 'rest' && lower.includes('interesting')) continue;

      return canonical;
    }
  }

  // Return original trimmed string if no alias found
  return raw.trim();
}

// ── Utility: extract skills from arbitrary text ───────────────────────────────

/**
 * Extract recognized skills from free-form text using the taxonomy.
 *
 * Strategy:
 *   1. For multi-word skills (e.g. "Machine Learning", "Spring Boot"):
 *      check if the exact phrase appears in text (case-insensitive).
 *   2. For single-word skills: use word-boundary-aware matching to prevent
 *      'Go' matching 'MongoDB', 'C' matching 'CI/CD', etc.
 *   3. Run alias normalization on extracted skills.
 *
 * Returns a deduplicated, canonical skill list sorted by category order.
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const upperText = text.toUpperCase();
  const found = new Set<string>();

  for (const skill of ALL_SKILLS) {
    if (skill.length < 2) continue; // safety guard

    const upperSkill = skill.toUpperCase();

    if (upperSkill.includes(' ')) {
      // Multi-word: exact phrase match (case-insensitive)
      if (upperText.includes(upperSkill)) {
        found.add(skill);
      }
    } else {
      // Single-word: word-boundary match
      // Use regex: \b matches [a-zA-Z0-9_] transitions — handles most cases.
      // Special chars like C++, C# require custom handling.
      if (upperSkill.includes('+') || upperSkill.includes('#') || upperSkill.includes('.')) {
        // Escape and require non-alphanumeric context
        const escaped = upperSkill.replace(/[+#.]/g, '\\$&');
        const pattern = new RegExp(`(?<![A-Z0-9])${escaped}(?![A-Z0-9])`, 'i');
        if (pattern.test(text)) {
          found.add(skill);
        }
      } else if (upperSkill.length >= 2) {
        // Standard word boundary
        const pattern = new RegExp(`\\b${upperSkill}\\b`, 'i');
        if (pattern.test(text)) {
          found.add(skill);
        }
      }
    }
  }

  // Also check aliases in text
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (alias.length < 2) continue;
    const upperAlias = alias.toUpperCase();
    let matched = false;

    if (upperAlias.includes(' ')) {
      matched = upperText.includes(upperAlias);
    } else {
      const pattern = new RegExp(`\\b${alias.replace(/[+#.]/g, '\\$&')}\\b`, 'i');
      matched = pattern.test(text);
    }

    if (matched) {
      found.add(canonical);
    }
  }

  return [...found];
}

// ── Utility: get domain concepts from text ────────────────────────────────────

/**
 * Detect which technology domains are referenced in text.
 * Returns matched domain names.
 */
export function extractDomains(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const domain of Object.keys(DOMAIN_SKILLS)) {
    // Check if domain name or its keywords appear in text
    if (lower.includes(domain)) {
      matched.push(domain);
      continue;
    }
    // Check if 2+ skills from this domain appear in text
    const domainSkills = DOMAIN_SKILLS[domain];
    const domainMatches = domainSkills.filter(s => lower.includes(s.toLowerCase()));
    if (domainMatches.length >= 2) {
      matched.push(domain);
    }
  }

  return [...new Set(matched)];
}

/**
 * Map a job title string to its closest known domain(s).
 */
export function titleToDomains(title: string): string[] {
  if (!title) return [];
  const lower = title.toLowerCase();

  for (const [pattern, domains] of Object.entries(TITLE_TO_DOMAIN)) {
    if (lower.includes(pattern)) {
      return domains;
    }
  }

  return [];
}
