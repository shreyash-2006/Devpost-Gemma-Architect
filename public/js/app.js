/**
 * Devpost Gemma Architect - Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    currentStep: 1,
    analysisData: null,
    devpostSections: {},
    apiConfig: {
      provider: localStorage.getItem('gemma_provider') || 'google',
      apiKey: localStorage.getItem('gemma_api_key') || '',
      model: localStorage.getItem('gemma_model') || 'gemma-2-27b-it',
      ollamaHost: localStorage.getItem('gemma_ollama_host') || 'http://localhost:11434'
    },
    refineTargetSection: null
  };

  // Section metadata mapping
  const SECTION_META = [
    { key: 'tagline', name: 'Elevator Pitch / Tagline', icon: 'fa-quote-left' },
    { key: 'inspiration', name: 'Inspiration', icon: 'fa-lightbulb' },
    { key: 'what_it_does', name: 'What it does', icon: 'fa-gears' },
    { key: 'how_built', name: 'How we built it', icon: 'fa-code' },
    { key: 'challenges', name: 'Challenges we ran into', icon: 'fa-triangle-exclamation' },
    { key: 'accomplishments', name: 'Accomplishments', icon: 'fa-trophy' },
    { key: 'what_learned', name: 'What we learned', icon: 'fa-graduation-cap' },
    { key: 'whats_next', name: 'What\'s next', icon: 'fa-rocket' },
    { key: 'built_with', name: 'Built With Tags', icon: 'fa-tags' }
  ];

  // DOM Elements
  const elements = {
    steps: document.querySelectorAll('.step-card'),
    stepItems: document.querySelectorAll('.step-item'),
    
    // Config Modal
    settingsModal: document.getElementById('settingsModal'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    providerSelect: document.getElementById('providerSelect'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    modelNameInput: document.getElementById('modelNameInput'),
    ollamaHostInput: document.getElementById('ollamaHostInput'),
    apiKeyGroup: document.getElementById('apiKeyGroup'),
    ollamaHostGroup: document.getElementById('ollamaHostGroup'),
    activeModelName: document.getElementById('activeModelName'),

    // Step 1: Scanner
    localFolderPathInput: document.getElementById('localFolderPathInput'),
    analyzePathBtn: document.getElementById('analyzePathBtn'),
    fileDropzone: document.getElementById('fileDropzone'),
    fileInput: document.getElementById('fileInput'),
    browseFilesBtn: document.getElementById('browseFilesBtn'),
    analysisResultContainer: document.getElementById('analysisResultContainer'),
    resProjectName: document.getElementById('resProjectName'),
    resProjectDesc: document.getElementById('resProjectDesc'),
    resTotalFiles: document.getElementById('resTotalFiles'),
    resTotalLines: document.getElementById('resTotalLines'),
    resTechStack: document.getElementById('resTechStack'),
    resLangBar: document.getElementById('resLangBar'),
    resLangLegend: document.getElementById('resLangLegend'),
    goToStep2Btn: document.getElementById('goToStep2Btn'),

    // Step 2: Config
    customProjectTitle: document.getElementById('customProjectTitle'),
    toneSelect: document.getElementById('toneSelect'),
    extraContextInput: document.getElementById('extraContextInput'),
    backToStep1Btn: document.getElementById('backToStep1Btn'),
    generateDevpostBtn: document.getElementById('generateDevpostBtn'),

    // Step 3: Editor
    gemmaLoadingState: document.getElementById('gemmaLoadingState'),
    loadingText: document.getElementById('loadingText'),
    editorWorkspace: document.getElementById('editorWorkspace'),
    sectionsContainer: document.getElementById('sectionsContainer'),
    previewFormattedBody: document.getElementById('previewFormattedBody'),
    previewRawBody: document.getElementById('previewRawBody'),
    toggleFormattedBtn: document.getElementById('toggleFormattedBtn'),
    toggleRawBtn: document.getElementById('toggleRawBtn'),
    backToStep2Btn: document.getElementById('backToStep2Btn'),
    goToStep4Btn: document.getElementById('goToStep4Btn'),

    // Refine Modal
    refineModal: document.getElementById('refineModal'),
    closeRefineBtn: document.getElementById('closeRefineBtn'),
    cancelRefineBtn: document.getElementById('cancelRefineBtn'),
    submitRefineBtn: document.getElementById('submitRefineBtn'),
    refineTargetSectionName: document.getElementById('refineTargetSectionName'),
    refineInstructionInput: document.getElementById('refineInstructionInput'),

    // Step 4: Export
    exportTagline: document.getElementById('exportTagline'),
    exportBuiltWith: document.getElementById('exportBuiltWith'),
    exportFullMarkdownText: document.getElementById('exportFullMarkdownText'),
    copyFullMarkdownBtn: document.getElementById('copyFullMarkdownBtn'),
    downloadMarkdownBtn: document.getElementById('downloadMarkdownBtn'),
    backToStep3Btn: document.getElementById('backToStep3Btn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Initialize App
  init();

  function init() {
    loadSettingsIntoUI();
    bindEvents();
    checkServerStatus();
  }

  function bindEvents() {
    // Settings Modal
    elements.openSettingsBtn.addEventListener('click', () => showModal(elements.settingsModal));
    elements.closeSettingsBtn.addEventListener('click', () => hideModal(elements.settingsModal));
    elements.saveSettingsBtn.addEventListener('click', saveSettingsFromUI);
    elements.providerSelect.addEventListener('change', updateProviderFormVisibility);

    // Step 1 Events
    elements.analyzePathBtn.addEventListener('click', handlePathAnalyze);
    elements.browseFilesBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileInput);
    
    // Drag and Drop
    elements.fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.fileDropzone.classList.add('drag-over');
    });
    elements.fileDropzone.addEventListener('dragleave', () => elements.fileDropzone.classList.remove('drag-over'));
    elements.fileDropzone.addEventListener('drop', handleFileDrop);

    elements.goToStep2Btn.addEventListener('click', () => switchStep(2));

    // Step 2 Events
    elements.backToStep1Btn.addEventListener('click', () => switchStep(1));
    elements.generateDevpostBtn.addEventListener('click', handleDevpostGenerate);

    // Step 3 Events
    elements.backToStep2Btn.addEventListener('click', () => switchStep(2));
    elements.goToStep4Btn.addEventListener('click', () => {
      updateExportStepData();
      switchStep(4);
    });

    elements.toggleFormattedBtn.addEventListener('click', () => {
      elements.toggleFormattedBtn.classList.add('active');
      elements.toggleRawBtn.classList.remove('active');
      elements.previewFormattedBody.classList.remove('hidden');
      elements.previewRawBody.classList.add('hidden');
    });

    elements.toggleRawBtn.addEventListener('click', () => {
      elements.toggleRawBtn.classList.add('active');
      elements.toggleFormattedBtn.classList.remove('active');
      elements.previewFormattedBody.classList.add('hidden');
      elements.previewRawBody.classList.remove('hidden');
    });

    // Refine Modal
    elements.closeRefineBtn.addEventListener('click', () => hideModal(elements.refineModal));
    elements.cancelRefineBtn.addEventListener('click', () => hideModal(elements.refineModal));
    elements.submitRefineBtn.addEventListener('click', handleSectionRefine);

    // Step 4 Export Events
    elements.backToStep3Btn.addEventListener('click', () => switchStep(3));
    elements.copyFullMarkdownBtn.addEventListener('click', () => {
      copyToClipboard(elements.exportFullMarkdownText.value, 'Full Devpost Markdown copied!');
    });
    elements.downloadMarkdownBtn.addEventListener('click', downloadMarkdownFile);

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-btn')) {
        const targetId = e.target.dataset.target;
        const inputElem = document.getElementById(targetId);
        if (inputElem) {
          copyToClipboard(inputElem.value, 'Copied to clipboard!');
        }
      }
    });
  }

  /**
   * Check Backend Health & Environment Status
   */
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') {
        console.log('✅ Server online:', data);
      }
    } catch (err) {
      showToast('⚠️ Could not connect to backend server. Make sure server is running on port 3000.', 'error');
    }
  }

  /**
   * Step Switching Navigation
   */
  function switchStep(stepNum) {
    state.currentStep = stepNum;

    elements.steps.forEach(step => step.classList.add('hidden'));
    document.getElementById(`step${stepNum}`).classList.remove('hidden');

    elements.stepItems.forEach(item => {
      const step = parseInt(item.dataset.step, 10);
      if (step === stepNum) {
        item.classList.add('active');
      } else if (step < stepNum) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Scan Local Path via API
   */
  async function handlePathAnalyze() {
    const folderPath = elements.localFolderPathInput.value.trim();
    if (!folderPath) {
      showToast('Please enter a valid local folder path.', 'warning');
      return;
    }

    elements.analyzePathBtn.disabled = true;
    elements.analyzePathBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Scanning...`;

    try {
      const res = await fetch('/api/analyze-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed scanning path');

      state.analysisData = json.data;
      renderAnalysisData(json.data);
      showToast('Codebase analyzed successfully!');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      elements.analyzePathBtn.disabled = false;
      elements.analyzePathBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Scan Folder`;
    }
  }

  /**
   * Drag & Drop File Reading
   */
  async function handleFileDrop(e) {
    e.preventDefault();
    elements.fileDropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    await processVirtualFiles(files);
  }

  async function handleFileInput(e) {
    const files = Array.from(e.target.files);
    await processVirtualFiles(files);
  }

  async function processVirtualFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    showToast(`Reading ${fileList.length} files...`, 'info');

    const fileObjects = [];
    for (const file of fileList.slice(0, 150)) { // Limit max files for browser upload
      try {
        const text = await readFileAsText(file);
        fileObjects.push({
          path: file.webkitRelativePath || file.name,
          content: text
        });
      } catch (err) {}
    }

    try {
      const res = await fetch('/api/analyze-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileObjects })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed analyzing files');

      state.analysisData = json.data;
      renderAnalysisData(json.data);
      showToast('Files analyzed successfully!');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * Render Analysis Card in UI
   */
  function renderAnalysisData(data) {
    elements.resProjectName.textContent = data.projectName || 'Project';
    elements.resProjectDesc.textContent = data.description || 'No description found.';
    elements.resTotalFiles.textContent = data.totalFiles || 0;
    elements.resTotalLines.textContent = (data.totalLinesOfCode || 0).toLocaleString();

    elements.customProjectTitle.value = data.projectName || '';

    // Render Tech Stack Pills
    elements.resTechStack.innerHTML = '';
    const stack = data.techStack.length ? data.techStack : ['JavaScript', 'HTML/CSS'];
    stack.forEach(tech => {
      const span = document.createElement('span');
      span.className = 'tag-pill';
      span.textContent = tech;
      elements.resTechStack.appendChild(span);
    });

    // Render Language Bar
    renderLanguageBreakdown(data.languageStats, data.totalLinesOfCode);

    elements.analysisResultContainer.classList.remove('hidden');
  }

  function renderLanguageBreakdown(stats, totalLOC) {
    elements.resLangBar.innerHTML = '';
    elements.resLangLegend.innerHTML = '';

    if (!stats || !totalLOC) return;

    const colors = {
      'JavaScript': '#f7df1e',
      'React (JS)': '#61dafb',
      'TypeScript': '#3178c6',
      'React (TS)': '#007acc',
      'Python': '#3572A5',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Rust': '#dea584',
      'Go': '#00ADD8',
      'Java': '#b07219',
      'JSON': '#292929',
      'Other': '#8b5cf6'
    };

    for (const [lang, loc] of Object.entries(stats)) {
      const pct = ((loc / totalLOC) * 100).toFixed(1);
      if (pct < 0.5) continue;

      const seg = document.createElement('div');
      seg.className = 'lang-segment';
      seg.style.width = `${pct}%`;
      seg.style.backgroundColor = colors[lang] || '#8b5cf6';
      elements.resLangBar.appendChild(seg);

      const leg = document.createElement('div');
      leg.innerHTML = `<span style="color:${colors[lang] || '#8b5cf6'}">●</span> ${lang} (${pct}%)`;
      elements.resLangLegend.appendChild(leg);
    }
  }

  /**
   * Step 2 -> Step 3: Trigger Gemma Generation
   */
  async function handleDevpostGenerate() {
    if (!state.analysisData) {
      showToast('Please scan a codebase in Step 1 first.', 'warning');
      switchStep(1);
      return;
    }

    switchStep(3);
    elements.gemmaLoadingState.classList.remove('hidden');
    elements.editorWorkspace.classList.add('hidden');

    const options = {
      tone: elements.toneSelect.value,
      customTitle: elements.customProjectTitle.value.trim(),
      extraContext: elements.extraContextInput.value.trim()
    };

    elements.loadingText.textContent = `Analyzing with Gemma (${state.apiConfig.model})...`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: state.analysisData,
          options,
          apiConfig: state.apiConfig
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed generating post with Gemma');

      state.devpostSections = json.sections;
      renderEditorWorkspace(json.sections);
      showToast('🎉 Devpost Post generated with Gemma!');
    } catch (err) {
      showToast(`Generation Error: ${err.message}`, 'error');
    } finally {
      elements.gemmaLoadingState.classList.add('hidden');
      elements.editorWorkspace.classList.remove('hidden');
    }
  }

  /**
   * Render Section Editor Accordion & Live Preview
   */
  function renderEditorWorkspace(sections) {
    elements.sectionsContainer.innerHTML = '';

    SECTION_META.forEach(sec => {
      const content = sections[sec.key] || '';
      
      const card = document.createElement('div');
      card.className = 'section-editor-card';

      card.innerHTML = `
        <div class="section-card-header">
          <h3><i class="fa-solid ${sec.icon}"></i> ${sec.name}</h3>
          <div class="section-card-actions">
            <button class="btn btn-secondary btn-sm refine-btn" data-key="${sec.key}" data-name="${sec.name}">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Refine
            </button>
          </div>
        </div>
        <div class="section-card-body">
          <textarea class="form-control section-textarea" data-key="${sec.key}" rows="${sec.key === 'tagline' ? 2 : 4}">${escapeHtml(content)}</textarea>
        </div>
      `;

      elements.sectionsContainer.appendChild(card);
    });

    // Listen for live input changes in textareas
    elements.sectionsContainer.querySelectorAll('.section-textarea').forEach(ta => {
      ta.addEventListener('input', (e) => {
        const key = e.target.dataset.key;
        state.devpostSections[key] = e.target.value;
        updateLivePreview();
      });
    });

    // Listen for section refine button clicks
    elements.sectionsContainer.querySelectorAll('.refine-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = btn.dataset.key;
        const name = btn.dataset.name;
        openRefineModal(key, name);
      });
    });

    updateLivePreview();
  }

  function updateLivePreview() {
    const title = elements.customProjectTitle.value.trim() || state.analysisData?.projectName || 'Hackathon Project';
    const s = state.devpostSections;

    const markdown = `# ${title}

> **Tagline:** ${s.tagline || ''}

## Inspiration
${s.inspiration || ''}

## What it does
${s.what_it_does || ''}

## How we built it
${s.how_built || ''}

## Challenges we ran into
${s.challenges || ''}

## Accomplishments that we're proud of
${s.accomplishments || ''}

## What we learned
${s.what_learned || ''}

## What's next for ${title}
${s.whats_next || ''}

---
**Built With:** \`${s.built_with || ''}\`
`;

    elements.previewRawBody.value = markdown;
    elements.previewFormattedBody.innerHTML = simpleMarkdownToHtml(markdown);
  }

  /**
   * Refinement Modal Handler
   */
  function openRefineModal(key, name) {
    state.refineTargetSection = key;
    elements.refineTargetSectionName.textContent = name;
    elements.refineInstructionInput.value = '';
    showModal(elements.refineModal);
  }

  async function handleSectionRefine() {
    const key = state.refineTargetSection;
    const instruction = elements.refineInstructionInput.value.trim();
    const currentContent = state.devpostSections[key] || '';

    if (!instruction) {
      showToast('Please enter an instruction for Gemma.', 'warning');
      return;
    }

    elements.submitRefineBtn.disabled = true;
    elements.submitRefineBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Refining...`;

    try {
      const res = await fetch('/api/refine-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: key,
          currentContent,
          instruction,
          projectTitle: elements.customProjectTitle.value.trim() || state.analysisData?.projectName,
          apiConfig: state.apiConfig
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Refinement failed');

      state.devpostSections[key] = json.refinedText;

      // Update textarea in Step 3 editor
      const ta = elements.sectionsContainer.querySelector(`textarea[data-key="${key}"]`);
      if (ta) ta.value = json.refinedText;

      updateLivePreview();
      hideModal(elements.refineModal);
      showToast('Section refined with Gemma!');
    } catch (err) {
      showToast(`Refinement Error: ${err.message}`, 'error');
    } finally {
      elements.submitRefineBtn.disabled = false;
      elements.submitRefineBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Run Gemma Refinement`;
    }
  }

  /**
   * Update Export Step 4 Fields
   */
  function updateExportStepData() {
    const s = state.devpostSections;
    elements.exportTagline.value = s.tagline || '';
    elements.exportBuiltWith.value = s.built_with || '';
    elements.exportFullMarkdownText.value = elements.previewRawBody.value;
  }

  function downloadMarkdownFile() {
    const content = elements.exportFullMarkdownText.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DEVPOST_SUBMISSION.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded DEVPOST_SUBMISSION.md');
  }

  /**
   * Settings Configuration Modal
   */
  function loadSettingsIntoUI() {
    elements.providerSelect.value = state.apiConfig.provider;
    elements.apiKeyInput.value = state.apiConfig.apiKey;
    elements.modelNameInput.value = state.apiConfig.model;
    elements.ollamaHostInput.value = state.apiConfig.ollamaHost;
    updateProviderFormVisibility();
    updateHeaderBadge();
  }

  function saveSettingsFromUI() {
    state.apiConfig = {
      provider: elements.providerSelect.value,
      apiKey: elements.apiKeyInput.value.trim(),
      model: elements.modelNameInput.value.trim(),
      ollamaHost: elements.ollamaHostInput.value.trim()
    };

    localStorage.setItem('gemma_provider', state.apiConfig.provider);
    localStorage.setItem('gemma_api_key', state.apiConfig.apiKey);
    localStorage.setItem('gemma_model', state.apiConfig.model);
    localStorage.setItem('gemma_ollama_host', state.apiConfig.ollamaHost);

    updateHeaderBadge();
    hideModal(elements.settingsModal);
    showToast('Gemma configuration saved!');
  }

  function updateProviderFormVisibility() {
    const prov = elements.providerSelect.value;
    if (prov === 'ollama') {
      elements.apiKeyGroup.classList.add('hidden');
      elements.ollamaHostGroup.classList.remove('hidden');
    } else {
      elements.apiKeyGroup.classList.remove('hidden');
      elements.ollamaHostGroup.classList.add('hidden');
    }
  }

  function updateHeaderBadge() {
    const { provider, model } = state.apiConfig;
    let label = `${model} (${provider.toUpperCase()})`;
    elements.activeModelName.textContent = label;
  }

  /**
   * Helper Utilities
   */
  function showModal(modalElem) {
    modalElem.classList.remove('hidden');
  }

  function hideModal(modalElem) {
    modalElem.classList.add('hidden');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> <span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function copyToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || 'Copied to clipboard!');
    }).catch(() => {
      showToast('Failed copying to clipboard.', 'error');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function simpleMarkdownToHtml(md) {
    if (!md) return '';
    let html = escapeHtml(md);

    // Headers
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '### $1');

    // Blockquote
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bold & Code
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Bullet points
    html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs
    html = html.replace(/\n\n/g, '<br><br>');

    return html;
  }
});
