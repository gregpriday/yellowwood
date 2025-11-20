/**
 * File icon utilities using Nerd Font icons.
 * Returns specific glyphs for file types to create a coherent visual system.
 */

// Common Nerd Font Glyphs (Devicons / Material Design)
const ICONS = {
  JS: '',         // JavaScript (e60c)
  TS: '',         // TypeScript (e628)
  REACT: '',      // React (e7ba)
  NPM: '',        // NPM (e71e)
  NODE: '',       // Node (e718)
  BOOK: '',       // Book/Readme (e28b)
  ROBOT: '󰚩',      // Robot/Agent (f06a9)
  MARKDOWN: '',   // Markdown (e609)
  JSON: '',       // JSON (e60b)
  CONFIG: '',     // Gear/Settings (e615)
  SHELL: '',      // Terminal/Shell (e795)
  LOCK: '',       // Lock (f456)
  DOCKER: '',     // Docker (f308)
  GIT: '',        // Git (f1d3)
  DEFAULT: '',    // Text File (f15c)
  FOLDER: '',     // Folder Closed (f07b)
  FOLDER_OPEN: '' // Folder Open (f07c)
};

/**
 * Map file extension or name to Nerd Font icon
 */
export function getFileIcon(fileName: string): string {
  const name = fileName.toLowerCase();
  const ext = name.split('.').pop() || '';

  // 1. AGENT FILES (Custom Detection)
  // Detects CLAUDE.md, GEMINI.md, AGENTS.md
  if (name.endsWith('.md')) {
    if (name.includes('agent') || name.includes('claude') || name.includes('gemini') || name.includes('gpt')) {
      return ICONS.ROBOT;
    }
  }

  // 2. EXACT FILENAME MATCHES (High Priority)
  const nameMap: Record<string, string> = {
    // Node / NPM
    'package.json': ICONS.NPM,
    'package-lock.json': ICONS.NPM,
    'yarn.lock': ICONS.NPM,
    'pnpm-lock.yaml': ICONS.NPM,
    
    // Documentation
    'readme.md': ICONS.BOOK,
    'license': ICONS.BOOK,
    'changelog.md': ICONS.BOOK,
    
    // Configs
    'tsconfig.json': ICONS.TS,
    '.gitignore': ICONS.GIT,
    '.gitattributes': ICONS.GIT,
    '.env': ICONS.CONFIG,
    'dockerfile': ICONS.DOCKER,
    'docker-compose.yml': ICONS.DOCKER,
    'makefile': ICONS.SHELL,
  };

  if (nameMap[name]) {
    return nameMap[name];
  }

  // 3. EXTENSION MATCHES
  const extMap: Record<string, string> = {
    // JavaScript / TypeScript
    js: ICONS.JS,
    mjs: ICONS.JS,
    cjs: ICONS.JS,
    jsx: ICONS.REACT,
    ts: ICONS.TS,
    tsx: ICONS.REACT,
    'd.ts': ICONS.TS,

    // Web
    html: '',
    css: '',
    scss: '',
    json: ICONS.JSON,
    xml: '󰗀',
    yaml: '',
    yml: '',

    // Code
    py: '',   // Python
    go: '',   // Go
    rs: '',   // Rust
    java: '', // Java
    c: '',    // C
    cpp: '',  // C++
    lua: '',  // Lua
    sh: ICONS.SHELL,
    zsh: ICONS.SHELL,
    bash: ICONS.SHELL,

    // Documents
    md: ICONS.MARKDOWN,
    txt: ICONS.DEFAULT,
    pdf: '',
    
    // Media
    png: '',
    jpg: '',
    svg: '󰜡',
  };

  if (extMap[ext]) {
    return extMap[ext];
  }

  // 4. Default Fallback
  // Returns a generic "document" icon instead of the dash
  return ICONS.DEFAULT;
}

/**
 * Get folder icon based on name and expansion state
 */
export function getFolderIcon(folderName: string, expanded: boolean): string {
  // You can expand this for specific folders like "src", "tests" later if desired
  return expanded ? ICONS.FOLDER_OPEN : ICONS.FOLDER;
}
