#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const CodebaseAnalyzer = require('./analyzer');
const GemmaClient = require('./gemma');
const { buildDevpostPrompt } = require('./templates');

dotenv.config();

const program = new Command();

program
  .name('devpost-gemma')
  .description('Automated Devpost Post Generator using Gemma AI & Codebase Analysis')
  .version('1.0.0')
  .option('-p, --path <dir>', 'Directory path of project codebase', '.')
  .option('-t, --tone <type>', 'Tone: hacktober, technical, enthusiastic, concise', 'hacktober')
  .option('-o, --output <file>', 'Output markdown file path', 'DEVPOST.md')
  .option('--provider <provider>', 'Gemma AI provider: google, ollama, groq, openrouter', process.env.GEMMA_PROVIDER || 'google')
  .option('--key <apiKey>', 'API key for Gemma Provider', process.env.GEMMA_API_KEY || '')
  .option('--model <model>', 'Gemma model name', process.env.GEMMA_MODEL || 'gemma-2-27b-it')
  .option('--title <customTitle>', 'Override project title')
  .option('--context <extraContext>', 'Additional context / features to include');

program.parse(process.argv);
const options = program.opts();

async function runCLI() {
  try {
    console.log('🔍 Analyzing codebase at:', path.resolve(options.path));
    const analysis = CodebaseAnalyzer.analyzeDirectory(path.resolve(options.path));

    console.log(`✅ Codebase Analyzed: ${analysis.projectName} (${analysis.totalFiles} files, ${analysis.totalLinesOfCode} LOC)`);
    console.log(`🛠️ Detected Tech Stack: ${analysis.techStack.join(', ') || 'N/A'}`);

    const client = new GemmaClient({
      provider: options.provider,
      apiKey: options.key,
      model: options.model
    });

    console.log(`🤖 Requesting Gemma (${client.provider} - ${client.model}) to structure Devpost post...`);

    const { systemInstruction, userPrompt } = buildDevpostPrompt(analysis, {
      tone: options.tone,
      customTitle: options.title,
      extraContext: options.context
    });

    const rawResponse = await client.generateCompletion(systemInstruction, userPrompt);
    const parsedSections = GemmaClient.parseJSONResponse(rawResponse);

    let markdownOutput = '';

    if (parsedSections) {
      markdownOutput = `# ${options.title || analysis.projectName}

> **Tagline:** ${parsedSections.tagline}

## Inspiration
${parsedSections.inspiration}

## What it does
${parsedSections.what_it_does}

## How we built it
${parsedSections.how_built}

## Challenges we ran into
${parsedSections.challenges}

## Accomplishments that we're proud of
${parsedSections.accomplishments}

## What we learned
${parsedSections.what_learned}

## What's next for ${options.title || analysis.projectName}
${parsedSections.whats_next}

---
**Built With:** \`${parsedSections.built_with}\`
`;
    } else {
      console.log('⚠️ Raw text fallback output generated.');
      markdownOutput = rawResponse;
    }

    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, markdownOutput, 'utf8');

    console.log(`🎉 Devpost post successfully generated & saved to: ${outputPath}`);
  } catch (err) {
    console.error('❌ Error generating Devpost post:', err.message);
    process.exit(1);
  }
}

runCLI();
