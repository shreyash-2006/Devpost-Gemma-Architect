const fs = require('fs');
const path = require('path');

// File extensions to include for code inspection
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs',
  '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.html', '.css', '.scss',
  '.sql', '.sh', '.bat', '.ps1', '.json', '.yaml', '.yml', '.md', '.vue', '.svelte'
]);

// Ignored folders and files
const IGNORE_PATTERNS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.idea', '.vscode', '.gemini', 'package-lock.json', 'yarn.lock',
  'pnpm-lock.yaml', 'vendor', '__pycache__', '.pytest_cache', 'target', 'bin', 'obj'
]);

// Max file size to read directly for snippet context (100 KB)
const MAX_FILE_SIZE = 100 * 1024;
// Max snippets character count per file to prevent prompt overflow
const MAX_SNIPPET_CHARS = 2000;

class CodebaseAnalyzer {
  /**
   * Scans a local filesystem folder path recursively.
   * @param {string} dirPath 
   * @param {object} options 
   */
  static analyzeDirectory(dirPath, options = {}) {
    const maxFiles = options.maxFiles || 100;
    const maxTotalSize = options.maxTotalSize || 5 * 1024 * 1024; // 5MB limit overall

    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }

    const fileList = [];
    const languageStats = {};
    let totalLinesOfCode = 0;
    let manifestData = {};
    let readmeContent = '';
    const keySnippets = [];

    function walkDir(currentPath, depth = 0) {
      if (depth > 8) return; // Prevent excessive recursion depth

      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const item of items) {
        if (IGNORE_PATTERNS.has(item.name)) continue;

        const fullPath = path.join(currentPath, item.name);
        const relPath = path.relative(dirPath, fullPath).replace(/\\/g, '/');

        if (item.isDirectory()) {
          walkDir(fullPath, depth + 1);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          const fileSize = fs.statSync(fullPath).size;

          // Check if README
          if (item.name.toLowerCase() === 'readme.md' && !readmeContent) {
            try {
              readmeContent = fs.readFileSync(fullPath, 'utf8').slice(0, 4000);
            } catch (err) {
              console.error('Failed reading README:', err.message);
            }
          }

          // Check for manifest files
          if (item.name === 'package.json' && !manifestData.packageJson) {
            try {
              manifestData.packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            } catch (e) {}
          } else if (item.name === 'requirements.txt' && !manifestData.requirements) {
            try {
              manifestData.requirements = fs.readFileSync(fullPath, 'utf8');
            } catch (e) {}
          } else if (item.name === 'Cargo.toml' && !manifestData.cargo) {
            try {
              manifestData.cargo = fs.readFileSync(fullPath, 'utf8');
            } catch (e) {}
          } else if (item.name === 'go.mod' && !manifestData.goMod) {
            try {
              manifestData.goMod = fs.readFileSync(fullPath, 'utf8');
            } catch (e) {}
          }

          if (CODE_EXTENSIONS.has(ext)) {
            let lineCount = 0;
            let fileContent = '';

            try {
              if (fileSize < MAX_FILE_SIZE) {
                fileContent = fs.readFileSync(fullPath, 'utf8');
                lineCount = fileContent.split('\n').length;
              }
            } catch (e) {}

            const lang = getLanguageFromExt(ext);
            languageStats[lang] = (languageStats[lang] || 0) + lineCount;
            totalLinesOfCode += lineCount;

            fileList.push({
              path: relPath,
              extension: ext,
              lines: lineCount,
              size: fileSize
            });

            // Capture important snippet if main or entrypoint file
            if (isKeyFile(relPath, item.name) && fileContent) {
              keySnippets.push({
                file: relPath,
                content: fileContent.slice(0, MAX_SNIPPET_CHARS)
              });
            }
          }
        }
      }
    }

    walkDir(dirPath);

    // Limit files summary to top 50
    fileList.sort((a, b) => b.lines - a.lines);

    const projectInfo = extractProjectMetadata(dirPath, manifestData, readmeContent);

    return {
      projectName: projectInfo.name,
      description: projectInfo.description,
      techStack: projectInfo.techStack,
      dependencies: projectInfo.dependencies,
      totalFiles: fileList.length,
      totalLinesOfCode,
      languageStats,
      fileTree: fileList.slice(0, 40),
      readmeContent: readmeContent || 'No README provided.',
      keySnippets: keySnippets.slice(0, 10),
      rawManifests: manifestData
    };
  }

  /**
   * Analyzes an array of uploaded virtual files from browser or memory
   * @param {Array<{path: string, content: string}>} files 
   */
  static analyzeVirtualFiles(files) {
    const fileList = [];
    const languageStats = {};
    let totalLinesOfCode = 0;
    let manifestData = {};
    let readmeContent = '';
    const keySnippets = [];

    for (const file of files) {
      const fileName = path.basename(file.path);
      const ext = path.extname(fileName).toLowerCase();
      const content = file.content || '';
      const lineCount = content ? content.split('\n').length : 0;

      if (fileName.toLowerCase() === 'readme.md') {
        readmeContent = content.slice(0, 4000);
      }

      if (fileName === 'package.json') {
        try {
          manifestData.packageJson = JSON.parse(content);
        } catch (e) {}
      } else if (fileName === 'requirements.txt') {
        manifestData.requirements = content;
      } else if (fileName === 'Cargo.toml') {
        manifestData.cargo = content;
      }

      if (CODE_EXTENSIONS.has(ext)) {
        const lang = getLanguageFromExt(ext);
        languageStats[lang] = (languageStats[lang] || 0) + lineCount;
        totalLinesOfCode += lineCount;

        fileList.push({
          path: file.path,
          extension: ext,
          lines: lineCount,
          size: content.length
        });

        if (isKeyFile(file.path, fileName) && content) {
          keySnippets.push({
            file: file.path,
            content: content.slice(0, MAX_SNIPPET_CHARS)
          });
        }
      }
    }

    const projectInfo = extractProjectMetadata('.', manifestData, readmeContent);

    return {
      projectName: projectInfo.name,
      description: projectInfo.description,
      techStack: projectInfo.techStack,
      dependencies: projectInfo.dependencies,
      totalFiles: fileList.length,
      totalLinesOfCode,
      languageStats,
      fileTree: fileList.slice(0, 40),
      readmeContent: readmeContent || 'No README provided.',
      keySnippets: keySnippets.slice(0, 10),
      rawManifests: manifestData
    };
  }
}

function getLanguageFromExt(ext) {
  const map = {
    '.js': 'JavaScript',
    '.jsx': 'React (JS)',
    '.ts': 'TypeScript',
    '.tsx': 'React (TS)',
    '.py': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'Sass',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.md': 'Markdown'
  };
  return map[ext] || 'Other';
}

function isKeyFile(filePath, fileName) {
  const lowerName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();
  return (
    lowerName.includes('app') ||
    lowerName.includes('server') ||
    lowerName.includes('index') ||
    lowerName.includes('main') ||
    lowerName.includes('api') ||
    lowerName.includes('controller') ||
    lowerName.includes('model') ||
    lowerName.includes('route') ||
    lowerPath.includes('src/') ||
    lowerPath.includes('lib/')
  );
}

function extractProjectMetadata(dirPath, manifests, readme) {
  let name = path.basename(path.resolve(dirPath)) || 'Hackathon Project';
  let description = '';
  const techStack = [];
  const dependencies = [];

  if (manifests.packageJson) {
    const pkg = manifests.packageJson;
    if (pkg.name && pkg.name !== 'new-folder') name = pkg.name;
    if (pkg.description) description = pkg.description;

    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const [dep, ver] of Object.entries(allDeps)) {
      dependencies.push(`${dep} (${ver})`);
      if (dep.includes('react')) techStack.push('React');
      if (dep.includes('next')) techStack.push('Next.js');
      if (dep.includes('vue')) techStack.push('Vue.js');
      if (dep.includes('express')) techStack.push('Express.js');
      if (dep.includes('tailwind')) techStack.push('Tailwind CSS');
      if (dep.includes('three')) techStack.push('Three.js');
      if (dep.includes('firebase')) techStack.push('Firebase');
      if (dep.includes('supabase')) techStack.push('Supabase');
      if (dep.includes('prisma')) techStack.push('Prisma');
      if (dep.includes('mongodb') || dep.includes('mongoose')) techStack.push('MongoDB');
      if (dep.includes('gemma') || dep.includes('genai') || dep.includes('gemini')) techStack.push('Google Gemma / AI Studio');
    }
  }

  if (manifests.requirements) {
    techStack.push('Python');
    const lines = manifests.requirements.split('\n');
    lines.forEach(l => {
      const clean = l.trim();
      if (clean && !clean.startsWith('#')) dependencies.push(clean);
    });
  }

  if (manifests.cargo) {
    techStack.push('Rust');
  }

  if (manifests.goMod) {
    techStack.push('Go');
  }

  // Deduplicate tech stack
  const uniqueTech = Array.from(new Set(techStack));

  return {
    name,
    description: description || extractDescriptionFromReadme(readme) || 'A modern hackathon project built for Hacktoberfest.',
    techStack: uniqueTech,
    dependencies: dependencies.slice(0, 30)
  };
}

function extractDescriptionFromReadme(readme) {
  if (!readme) return '';
  const lines = readme.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('#') && line.length > 20) {
      return line;
    }
  }
  return '';
}

module.exports = CodebaseAnalyzer;
