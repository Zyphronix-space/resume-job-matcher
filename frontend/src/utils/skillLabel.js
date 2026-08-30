// Display-only capitalization for taxonomy skill keys, which are stored
// lowercase for matching. Purely cosmetic — never affects matching logic.

const OVERRIDES = {
  'javascript': 'JavaScript', 'typescript': 'TypeScript', 'node.js': 'Node.js',
  'next.js': 'Next.js', 'react.js': 'React.js', 'c++': 'C++', 'c#': 'C#',
  'postgresql': 'PostgreSQL', 'mongodb': 'MongoDB', 'mysql': 'MySQL',
  'github': 'GitHub', 'gitlab': 'GitLab', '.net': '.NET', 'ci/cd': 'CI/CD',
  'html': 'HTML', 'html5': 'HTML5', 'css': 'CSS', 'css3': 'CSS3', 'sql': 'SQL',
  'aws': 'AWS', 'gcp': 'GCP', 'nlp': 'NLP', 'rest api': 'REST API',
  'graphql': 'GraphQL', 'oop': 'OOP', 'php': 'PHP', 'jquery': 'jQuery',
  'fastapi': 'FastAPI', 'numpy': 'NumPy', 'pytorch': 'PyTorch',
  'tensorflow': 'TensorFlow', 'scikit-learn': 'Scikit-learn', 'spring boot': 'Spring Boot',
}

export function skillLabel(skill) {
  return OVERRIDES[skill] || skill.charAt(0).toUpperCase() + skill.slice(1)
}
