import './style.css';

const summarizeBtn = document.getElementById('summarize-btn');
const quickHighlightBtn = document.getElementById('quick-highlight-btn');
const resetBtn = document.getElementById('reset-btn');
const copyBtn = document.getElementById('copy-btn');

const initialView = document.getElementById('initial-view');
const loadingView = document.getElementById('loading-view');
const resultView = document.getElementById('result-view');
const errorView = document.getElementById('error-view');

const output = document.getElementById('summary-output');
const scoreBadge = document.getElementById('score-badge');
const pageTitleLbl = document.getElementById('page-title-label');
const readingLbl = document.getElementById('reading-time-label');
const highlightStatus = document.getElementById('highlight-status');

let lastSummaryData = null;

const sanitize = (str) => (str || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');

function show(view) {
  [initialView, loadingView, resultView, errorView].forEach(v => v?.classList.remove('active'));
  view.classList.add('active');
  resetBtn?.classList.toggle('hidden', view === initialView);
}

function scoreClass(n) {
  if (n >= 80) return 'bg-green-700';
  if (n >= 60) return 'bg-amber-600';
  return 'bg-red-700';
}

async function runAnalysis(autoHighlight = false) {
  show(loadingView);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let pageData = null;

    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { action: 'GET_CONTENT' });
    } catch {
      pageData = null;
    }

    const safePayload = {
      text: pageData?.text || "",
      title: pageData?.title || tab.title,
      url: pageData?.url || tab.url
    };

    chrome.runtime.sendMessage({ action: 'SUMMARIZE', payload: safePayload }, (response) => {
      if (chrome.runtime.lastError || response?.error) {
        show(errorView);
        return;
      }

      const data = typeof response === 'string' ? JSON.parse(response) : response;
      lastSummaryData = data;

      scoreBadge.textContent = data.score;
      scoreBadge.className = `w-9 h-9 rounded-lg flex items-center justify-center font-display font-black text-sm text-white shrink-0 ${scoreClass(data.score)}`;
      pageTitleLbl.textContent = data.title || tab.title;
      readingLbl.textContent = data.readingTime;

      renderSummary(data);
      show(resultView);
      switchTab('summary');

      if (autoHighlight) {
        triggerHighlight(data.keywords || data.summary.slice(0, 3));
      }
      saveToHistory(data, tab);
    });
  } catch {
    show(errorView);
  }
}

async function triggerHighlight(segments) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT', payload: { sentences: segments } }, () => {
    if (chrome.runtime.lastError) return;
    highlightStatus?.classList.remove('hidden');
    setTimeout(() => highlightStatus?.classList.add('hidden'), 3000);
  });
}

function renderSummary(data) {
  if (!output) return;

  const summaryHTML = (data.summary || []).map((point, i) => `
    <div class="flex gap-3 bg-white border border-border rounded-xl px-4 py-3 mb-2 shadow-sm">
      <span class="font-mono text-[10px] text-accent mt-0.5">${String(i + 1).padStart(2, '0')}</span>
      <p class="text-[12px] leading-relaxed text-[#2d2a26]">${sanitize(point)}</p>
    </div>`).join('');

  const insightsHTML = `
    <div class="mt-6 mb-3 px-1"><h3 class="text-[10px] font-bold uppercase tracking-widest text-muted">💡 Key Insights</h3></div>
    ${(data.keyInsights || []).map(insight => `
      <div class="bg-amber-100 border border-amber-100/10 rounded-xl px-4 py-3 mb-2">
        <p class="text-[12px] leading-relaxed text-[#e0830a] font-medium">⚡ ${sanitize(insight)}</p>
      </div>`).join('')}`;

  const takeawaysHTML = `
    <div class="mt-6 mb-3 px-1"><h3 class="text-[10px] font-bold uppercase tracking-widest text-muted">🎯 Takeaways</h3></div>
    <div class="grid grid-cols-1 gap-2 mb-6">
      ${(data.takeaways || []).map(t => `
        <div class="bg-indigo-950/70 border border-indigo-100 rounded-xl px-4 py-3">
          <p class="text-[12px] text-indigo-100 italic">"${sanitize(t)}"</p>
        </div>`).join('')}
    </div>`;

  output.innerHTML = summaryHTML + insightsHTML + takeawaysHTML;
}

function saveToHistory(data, tab) {
  const newItem = {
    id: Date.now(),
    title: data.title || tab.title,
    score: data.score || 0,
    summary: data.summary || [],
    keyInsights: data.keyInsights || [],
    takeaways: data.takeaways || [],
    time: data.readingTime || "N/A",
    url: tab.url,
    date: new Date().toLocaleDateString()
  };

  chrome.storage.local.get({ sumarin_history: [] }, ({ sumarin_history }) => {
    const filtered = sumarin_history.filter(i => i.url !== tab.url);
    const updated = [newItem, ...filtered].slice(0, 50);
    chrome.storage.local.set({ sumarin_history: updated });
  });
}

function renderHistory() {
  chrome.storage.local.get({ sumarin_history: [] }, ({ sumarin_history }) => {
    const list = document.getElementById('history-list');
    if (!list) return;

    if (!sumarin_history.length) {
      list.innerHTML = `<p class="font-mono text-[10px] text-muted text-center py-10">No history yet</p>`;
      return;
    }

    list.innerHTML = sumarin_history.map(item => `
      <div class="history-card flex items-center gap-3 p-3 bg-white border border-border rounded-xl cursor-pointer mb-2" data-id="${item.id}">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white ${scoreClass(item.score)}">${item.score}</div>
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-bold text-slate-800 truncate">${sanitize(item.title)}</p>
          <p class="text-[9px] text-muted mt-0.5">${item.date} · ${item.time}</p>
        </div>
      </div>`).join('');
  });
}

function switchTab(targetId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active-tab', b.dataset.tab === targetId));
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.add('hidden');
    if (p.id === 'tab-' + targetId) p.classList.remove('hidden');
  });

  if (targetId === "history") {
    renderHistory();
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

summarizeBtn?.addEventListener('click', () => runAnalysis(false));
quickHighlightBtn?.addEventListener('click', () => runAnalysis(true));
resetBtn?.addEventListener('click', () => { show(initialView); lastSummaryData = null; });

copyBtn?.addEventListener('click', () => {
  if (!lastSummaryData) return;
  const text = (lastSummaryData.summary || []).map((p, i) => `${i + 1}. ${p}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const old = copyBtn.textContent;
    copyBtn.textContent = '✓';
    setTimeout(() => copyBtn.textContent = old, 2000);
  });
});

document.addEventListener('click', (e) => {
  const card = e.target.closest('.history-card');
  if (!card) return;

  chrome.storage.local.get({ sumarin_history: [] }, ({ sumarin_history }) => {
    const item = sumarin_history.find(i => i.id == card.dataset.id);
    if (!item) return;
    lastSummaryData = item;
    scoreBadge.textContent = item.score;
    scoreBadge.className = `w-9 h-9 rounded-lg flex items-center justify-center font-display font-black text-sm text-white shrink-0 ${scoreClass(item.score)}`;
    pageTitleLbl.textContent = item.title;
    readingLbl.textContent = item.time;
    renderSummary(item);
    show(resultView);
    switchTab('summary');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  show(initialView);
  renderHistory();
});