/**
 * Devpost Standard Section Specification and Prompt Engineering for Gemma
 */

const DEVPOST_SECTIONS = [
  {
    id: 'tagline',
    name: 'Elevator Pitch / Tagline',
    description: 'A 1-sentence catchy description of your project (Max 140 chars).'
  },
  {
    id: 'inspiration',
    name: 'Inspiration',
    description: 'Why you decided to build this project and what problem it solves.'
  },
  {
    id: 'what_it_does',
    name: 'What it does',
    description: 'Overview of features, core functionality, and how it works for users.'
  },
  {
    id: 'how_built',
    name: 'How we built it',
    description: 'Detailed technical breakdown, Gemma AI model usage, architecture, tools & languages.'
  },
  {
    id: 'challenges',
    name: 'Challenges we ran into',
    description: 'Technical hurdles, API complexities, debug sessions, and how you solved them.'
  },
  {
    id: 'accomplishments',
    name: 'Accomplishments that we\'re proud of',
    description: 'What team highlights, UI quality, performance metrics or wins stand out.'
  },
  {
    id: 'what_learned',
    name: 'What we learned',
    description: 'Key insights gained about Gemma AI, architecture, open source, or tooling.'
  },
  {
    id: 'whats_next',
    name: 'What\'s next for the project',
    description: 'Future roadmap, open source contributions for Hacktoberfest, and planned features.'
  },
  {
    id: 'built_with',
    name: 'Built With (Devpost Tags)',
    description: 'Comma-separated tech stack tags for Devpost submission fields.'
  }
];

const TONE_PRESETS = {
  hacktober: 'Hacktoberfest Open Source & Community Focused (engaging, collaborative, highlights open-source contributions)',
  technical: 'Deep Technical & Professional (detailed architectural explanations, clean engineering terminology)',
  enthusiastic: 'High Energy & Inspiring Storytelling (exciting hackathon vibe, passion-driven narrative)',
  concise: 'Clean, Bulleted & Concise (direct, easy to scan, bullet points, crisp statements)'
};

/**
 * Builds system & user prompts for Gemma model based on analysis data.
 */
function buildDevpostPrompt(analysis, options = {}) {
  const tone = TONE_PRESETS[options.tone] || TONE_PRESETS.hacktober;
  const projectTitle = options.customTitle || analysis.projectName || 'Hackathon Project';
  const extraContext = options.extraContext || '';

  const systemInstruction = `You are an expert Devpost Hackathon Copywriter and Technical Writer. 
Your goal is to generate an exceptional, highly structured Devpost post for a project submitted to Hacktoberfest / Hackathon.
You MUST base your post on the actual analyzed codebase details provided, highlighting the real architecture, files, technologies, and features.
You must adopt the following tone: ${tone}.
Return the response strictly formatted in JSON so each section can be extracted independently.`;

  const userPrompt = `
Here is the automated Codebase Analysis for the project "${projectTitle}":

--- PROJECT ANALYSIS ---
Project Name: ${projectTitle}
Description / Overview: ${analysis.description}
Tech Stack Detected: ${analysis.techStack.join(', ') || 'JavaScript / Web Tech'}
Dependencies: ${analysis.dependencies.join(', ') || 'Standard Libraries'}
Total Files Analyzed: ${analysis.totalFiles}
Total Lines of Code: ${analysis.totalLinesOfCode}
Languages Breakdown (LOC): ${JSON.stringify(analysis.languageStats)}

Key Code Snippets / Entry points:
${analysis.keySnippets.map(s => `=== File: ${s.file} ===\n${s.content.slice(0, 800)}\n`).join('\n')}

README Content Excerpt:
${analysis.readmeContent.slice(0, 1500)}

Additional User Context / Highlights:
${extraContext ? extraContext : 'No extra user notes provided.'}

--- REQUIRED DEVPOST SECTIONS ---
Please generate the Devpost post content as a JSON object with the following exact keys:

{
  "tagline": "Short, punchy 1-sentence pitch (max 140 chars)",
  "inspiration": "Markdown content for Inspiration section",
  "what_it_does": "Markdown content for What it does section with feature bullet points",
  "how_built": "Markdown content for How we built it section, explicitly detailing language, architecture, and Gemma AI integration",
  "challenges": "Markdown content for Challenges we ran into and solutions",
  "accomplishments": "Markdown content for Accomplishments that we are proud of",
  "what_learned": "Markdown content for What we learned section",
  "whats_next": "Markdown content for What's next section (including Hacktoberfest open source roadmap)",
  "built_with": "Comma-separated list of tech tags (e.g. gemma, nodejs, express, javascript, open-source, hacktoberfest)"
}

IMPORTANT RULES:
1. Write rich, detailed markdown for each section (use bullet points, bold headers, code snippets where appropriate).
2. Do NOT use generic placeholder text. Refer directly to the technologies and code detected (${analysis.techStack.join(', ')}).
3. Emphasize open-source collaboration and Hacktoberfest spirit where relevant.
4. Output valid, raw JSON only.
`;

  return { systemInstruction, userPrompt };
}

/**
 * Prompt for refining a single section using Gemma
 */
function buildRefinementPrompt(sectionKey, currentContent, userInstruction, projectTitle) {
  const systemInstruction = `You are an expert Devpost content editor. You edit and polish specific Devpost sections while preserving accuracy to the codebase context. Output ONLY the updated Markdown text.`;
  
  const userPrompt = `
Project Title: ${projectTitle}
Section: ${sectionKey}

Current Content:
${currentContent}

User Instruction for Revision:
"${userInstruction}"

Please provide the revised Markdown content for this section based on the instruction:
`;

  return { systemInstruction, userPrompt };
}

module.exports = {
  DEVPOST_SECTIONS,
  TONE_PRESETS,
  buildDevpostPrompt,
  buildRefinementPrompt
};
