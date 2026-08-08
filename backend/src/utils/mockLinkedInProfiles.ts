export const mockLinkedInProfiles: Record<string, {
  name: string;
  bio: string;
  skills: string[];
  experience: any[];
  education: any[];
  linkedin_url: string;
  portfolio_url: string;
  github_url: string;
  photo_url: string;
  phone: string;
}> = {
  mock_code_swe: {
    name: 'Alex Rivera',
    bio: 'Computer Science student at Stanford University | Passionate software engineering intern | Open source contributor',
    skills: ['TypeScript', 'React', 'Node.js', 'Python', 'GraphQL', 'Docker', 'PostgreSQL', 'Git'],
    experience: [
      {
        role: 'Software Engineer Intern',
        company: 'Tech Solutions Inc.',
        duration: 'Jun 2025 - Present',
        description: 'Collaborated in an agile team of 5 to develop and optimize high-throughput microservices using Node.js and TypeScript. Improved API response times by 20% through Redis caching.'
      },
      {
        role: 'Full Stack Developer',
        company: 'Stanford Open Source Lab',
        duration: 'Sep 2024 - May 2025',
        description: 'Contributed to frontend redesign and GraphQL API integrations, resulting in a 15% increase in user engagement.'
      }
    ],
    education: [
      {
        degree: 'B.S. in Computer Science',
        school: 'Stanford University',
        year: '2026'
      }
    ],
    linkedin_url: 'https://linkedin.com/in/alex-rivera-cs',
    portfolio_url: 'https://alexrivera.dev',
    github_url: 'https://github.com/alexrivera-codes',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&q=80',
    phone: '+1-555-0199'
  },
  mock_code_pm: {
    name: 'Taylor Morgan',
    bio: 'Associate Product Manager | Bridging technical execution and business value | Experienced in agile methodologies',
    skills: ['Product Strategy', 'Agile/Scrum', 'Data Analytics', 'Figma', 'SQL', 'A/B Testing', 'Jira'],
    experience: [
      {
        role: 'Product Manager Intern',
        company: 'Apex Digital Group',
        duration: 'May 2025 - Aug 2025',
        description: 'Owned the product discovery and lifecycle management of a new analytics dashboard module. Collaborated closely with engineering and design to launch a beta version.'
      },
      {
        role: 'Associate Scrum Master',
        company: 'NextGen Solutions',
        duration: 'Oct 2024 - Apr 2025',
        description: 'Facilitated sprint planning and daily standups for two cross-functional engineering teams, increasing sprint velocity by 12%.'
      }
    ],
    education: [
      {
        degree: 'B.A. in Management & Technology',
        school: 'University of Pennsylvania',
        year: '2026'
      }
    ],
    linkedin_url: 'https://linkedin.com/in/taylor-morgan-pm',
    portfolio_url: 'https://taylormorgan.pm',
    github_url: '',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80',
    phone: '+1-555-0188'
  },
  mock_code_ds: {
    name: 'Dr. Jordan Lee',
    bio: 'Data Science Candidate | Machine Learning Researcher | Expertise in PyTorch, NLP, and Big Data Technologies',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'Pandas', 'Apache Spark', 'SQL', 'Natural Language Processing'],
    experience: [
      {
        role: 'Data Scientist Intern',
        company: 'Quantum Analytics',
        duration: 'Jun 2025 - Present',
        description: 'Trained and optimized transformer-based LLM architectures for sentiment classification tasks. Successfully reduced training cost by 30% through mixed-precision parameters.'
      },
      {
        role: 'Graduate Research Assistant',
        company: 'MIT CSAIL',
        duration: 'Sep 2023 - May 2025',
        description: 'Conducted academic research in neural network interpretability, co-authoring 2 papers published in top-tier ML conferences.'
      }
    ],
    education: [
      {
        degree: 'Ph.D. in Computer Science (AI/ML)',
        school: 'Massachusetts Institute of Technology',
        year: '2025'
      },
      {
        degree: 'M.S. in Data Science',
        school: 'Carnegie Mellon University',
        year: '2021'
      }
    ],
    linkedin_url: 'https://linkedin.com/in/jordan-lee-ds',
    portfolio_url: 'https://jordanlee.ai',
    github_url: 'https://github.com/jordan-ds',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80',
    phone: '+1-555-0177'
  }
};
