const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const CodebaseAnalyzer = require('./analyzer');
const GemmaClient = require('./gemma');
const { DEVPOST_SECTIONS, buildDevpostPrompt, buildRefinementPrompt } = require('./templates');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

/**
 * Health check & environment info
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    defaultProvider: process.env.GEMMA_PROVIDER || 'google',
    defaultModel: process.env.GEMMA_MODEL || 'gemma-2-27b-it',
    hasApiKey: Boolean(process.env.GEMMA_API_KEY)
  });
});

/**
 * Analyze a local directory path on disk
 */
app.post('/api/analyze-path', (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required.' });
    }

    const targetPath = path.resolve(folderPath);
    console.log(`[Analyzer] Scanning directory: ${targetPath}`);

    const result = CodebaseAnalyzer.analyzeDirectory(targetPath);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Analyzer Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Analyze virtual uploaded files array from client UI
 */
app.post('/api/analyze-files', (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Array of files is required.' });
    }

    console.log(`[Analyzer] Processing ${files.length} uploaded virtual files`);
    const result = CodebaseAnalyzer.analyzeVirtualFiles(files);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Virtual Analyzer Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate full structured Devpost post using Gemma AI
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { analysis, options = {}, apiConfig = {} } = req.body;
    if (!analysis) {
      return res.status(400).json({ error: 'Codebase analysis data is required.' });
    }

    const client = new GemmaClient({
      provider: apiConfig.provider || process.env.GEMMA_PROVIDER || 'google',
      apiKey: apiConfig.apiKey || process.env.GEMMA_API_KEY || '',
      model: apiConfig.model || process.env.GEMMA_MODEL || 'gemma-2-27b-it',
      ollamaHost: apiConfig.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434'
    });

    console.log(`[Gemma Generation] Provider: ${client.provider}, Model: ${client.model}`);

    const { systemInstruction, userPrompt } = buildDevpostPrompt(analysis, options);

    const rawResponse = await client.generateCompletion(systemInstruction, userPrompt);
    const parsedSections = GemmaClient.parseJSONResponse(rawResponse);

    if (!parsedSections) {
      // Fallback: If JSON parsing failed, return raw response as how_built or general section
      return res.json({
        success: true,
        isFallback: true,
        rawText: rawResponse,
        sections: {
          tagline: `${analysis.projectName} - Hackathon Project`,
          inspiration: 'Parsed directly from Gemma markdown output.',
          what_it_does: rawResponse,
          how_built: `Built with ${analysis.techStack.join(', ')}.`,
          challenges: 'Technical challenges encountered during hackathon development.',
          accomplishments: 'Working prototype and clean modular design.',
          what_learned: 'Key learnings from Gemma AI integration and rapid iteration.',
          whats_next: 'Future plans include expanding feature set and open source community support.',
          built_with: analysis.techStack.join(', ') || 'gemma, nodejs, javascript'
        }
      });
    }

    // Combine into full markdown document
    const fullMarkdown = buildFullMarkdown(analysis.projectName, parsedSections);

    res.json({
      success: true,
      sections: parsedSections,
      fullMarkdown,
      meta: {
        provider: client.provider,
        model: client.model
      }
    });

  } catch (err) {
    console.error('[Gemma Generation Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Refine a specific section using Gemma
 */
app.post('/api/refine-section', async (req, res) => {
  try {
    const { sectionKey, currentContent, instruction, projectTitle, apiConfig = {} } = req.body;
    if (!sectionKey || !instruction) {
      return res.status(400).json({ error: 'Section key and user instruction are required.' });
    }

    const client = new GemmaClient({
      provider: apiConfig.provider || process.env.GEMMA_PROVIDER || 'google',
      apiKey: apiConfig.apiKey || process.env.GEMMA_API_KEY || '',
      model: apiConfig.model || process.env.GEMMA_MODEL || 'gemma-2-27b-it',
      ollamaHost: apiConfig.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434'
    });

    const { systemInstruction, userPrompt } = buildRefinementPrompt(
      sectionKey,
      currentContent,
      instruction,
      projectTitle || 'Hackathon Project'
    );

    const refinedText = await client.generateCompletion(systemInstruction, userPrompt);

    res.json({
      success: true,
      refinedText: refinedText.trim()
    });
  } catch (err) {
    console.error('[Refinement Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function buildFullMarkdown(title, sections) {
  return `# ${title || 'Devpost Submission'}

> **Tagline:** ${sections.tagline || ''}

## Inspiration
${sections.inspiration || ''}

## What it does
${sections.what_it_does || ''}

## How we built it
${sections.how_built || ''}

## Challenges we ran into
${sections.challenges || ''}

## Accomplishments that we're proud of
${sections.accomplishments || ''}

## What we learned
${sections.what_learned || ''}

## What's next for ${title || 'this project'}
${sections.whats_next || ''}

---
**Built With:** \`${sections.built_with || 'gemma, javascript, hacktoberfest'}\`
`;
}

app.listen(PORT, () => {
  console.log(`🚀 Devpost Gemma Generator Server running at http://localhost:${PORT}`);
});
