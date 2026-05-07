const STORAGE_KEY = 'us-checkin-data';
const REFLECTION_PROMPTS = [
  "What's one thing I appreciate about us right now?",
  "What's one thing I wish we did more of together?",
  "What made me feel closest to my partner recently?",
  "What's one thing I want to communicate better?",
  "What does my partner do that makes me feel loved?",
  "What's one thing I can do this week to invest in us?"
];

let currentStep = 1;
let checkinData = { mood: null, sliders: {}, yesno: {}, reflection: '' };
let trendChart = null;

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  screen.classList.add('active');
  if (id === 'screen-history') renderHistory();
  if (id === 'screen-home') renderHome();
}

// ── HOME ──────────────────────────────────────────────────────────────────────

function renderHome() {
  const now = new Date();
  document.getElementById('home-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const data = loadData();
  const lastEl = document.getElementById('last-checkin');
  if (data.checkins.length > 0) {
    const last = data.checkins[data.checkins.length - 1];
    const avg = avgScore(last.sliders);
    lastEl.classList.remove('hidden');
    lastEl.innerHTML = `<strong>Last check-in:</strong> ${last.date} &nbsp;${last.mood}&nbsp; avg score <strong>${avg}/10</strong>`;
  } else {
    lastEl.classList.add('hidden');
  }
}

// ── CHECK-IN FLOW ─────────────────────────────────────────────────────────────

function startCheckin() {
  currentStep = 1;
  checkinData = { mood: null, sliders: { connection: 5, communication: 5, trust: 5, happiness: 5, intimacy: 5 }, yesno: {}, reflection: '' };

  // Reset UI
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  ['connection','communication','trust','happiness','intimacy'].forEach(k => {
    document.getElementById('slider-' + k).value = 5;
    document.getElementById('val-' + k).textContent = 5;
  });
  document.querySelectorAll('.yn-btn').forEach(b => b.classList.remove('selected-yes','selected-no'));
  document.getElementById('reflection-text').value = '';
  document.getElementById('reflection-prompt').textContent = REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];

  showScreen('screen-checkin');
  goToStep(1);
}

function goToStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  document.getElementById('step-' + n).classList.remove('hidden');
  document.getElementById('step-label').textContent = `Step ${n} of 5`;
  document.getElementById('progress-fill').style.width = (n * 20) + '%';
  document.getElementById('btn-back').style.visibility = n === 1 ? 'hidden' : 'visible';
  document.getElementById('btn-next').style.display = n === 5 ? 'none' : 'inline-block';

  if (n === 5) renderSummary();
}

function nextStep() {
  if (currentStep === 1 && !checkinData.mood) {
    alert('Please select how you\'re feeling before continuing.');
    return;
  }
  if (currentStep < 5) { currentStep++; goToStep(currentStep); }
}

function prevStep() {
  if (currentStep > 1) { currentStep--; goToStep(currentStep); }
}

function selectMood(btn) {
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  checkinData.mood = btn.dataset.mood;
}

function updateSlider(key, val) {
  document.getElementById('val-' + key).textContent = val;
  checkinData.sliders[key] = parseInt(val);
}

function selectYN(btn) {
  const key = btn.dataset.key;
  const val = btn.dataset.val === 'true';
  // deselect siblings
  document.querySelectorAll(`.yn-btn[data-key="${key}"]`).forEach(b => {
    b.classList.remove('selected-yes', 'selected-no');
  });
  btn.classList.add(val ? 'selected-yes' : 'selected-no');
  checkinData.yesno[key] = val;
}

function renderSummary() {
  checkinData.reflection = document.getElementById('reflection-text').value.trim();
  const avg = avgScore(checkinData.sliders);
  const ynLabels = { heard: 'Feel heard', quality_time: 'Quality time', authentic: 'Authentic self', safe: 'Emotionally safe', aligned: 'Aligned on future' };

  let html = `<div class="summary-row"><span class="summary-label">Mood</span><span class="summary-val summary-mood">${checkinData.mood || '—'}</span></div>`;
  html += `<div class="summary-row"><span class="summary-label">Average Score</span><span class="summary-val">${avg}/10</span></div>`;

  Object.entries(checkinData.sliders).forEach(([k, v]) => {
    html += `<div class="summary-row"><span class="summary-label">${capitalize(k)}</span><span class="summary-val">${v}/10</span></div>`;
  });

  Object.entries(checkinData.yesno).forEach(([k, v]) => {
    html += `<div class="summary-row"><span class="summary-label">${ynLabels[k] || k}</span><span class="summary-val" style="color:${v ? 'var(--yes)' : 'var(--no)'}">${v ? 'Yes' : 'No'}</span></div>`;
  });

  if (checkinData.reflection) {
    html += `<div class="summary-row" style="flex-direction:column;align-items:flex-start;gap:0.3rem"><span class="summary-label">Reflection</span><span style="font-style:italic;color:var(--text)">"${checkinData.reflection}"</span></div>`;
  }

  document.getElementById('summary-content').innerHTML = html;
}

function saveCheckin() {
  const data = loadData();
  const entry = {
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    timestamp: Date.now(),
    mood: checkinData.mood,
    sliders: { ...checkinData.sliders },
    yesno: { ...checkinData.yesno },
    reflection: checkinData.reflection
  };
  data.checkins.push(entry);
  saveData(data);
  showScreen('screen-saved');
}

// ── HISTORY ───────────────────────────────────────────────────────────────────

function renderHistory() {
  const data = loadData();
  const checkins = data.checkins;

  const noHistory = document.getElementById('no-history');
  const chartEl = document.getElementById('trend-chart');
  const ratesEl = document.getElementById('yesno-rates');
  const listEl = document.getElementById('history-list');

  listEl.innerHTML = '';

  if (checkins.length === 0) {
    noHistory.classList.remove('hidden');
    chartEl.classList.add('hidden');
    ratesEl.classList.add('hidden');
    return;
  }

  noHistory.classList.add('hidden');
  chartEl.classList.remove('hidden');
  ratesEl.classList.remove('hidden');

  // Trend chart
  const labels = checkins.map(c => c.date);
  const datasets = [
    { label: 'Connection', data: checkins.map(c => c.sliders.connection), borderColor: '#c9738a', tension: 0.3, fill: false },
    { label: 'Communication', data: checkins.map(c => c.sliders.communication), borderColor: '#9b7fa8', tension: 0.3, fill: false },
    { label: 'Trust', data: checkins.map(c => c.sliders.trust), borderColor: '#7dbfa0', tension: 0.3, fill: false },
    { label: 'Happiness', data: checkins.map(c => c.sliders.happiness), borderColor: '#e8b4c0', tension: 0.3, fill: false },
    { label: 'Intimacy', data: checkins.map(c => c.sliders.intimacy), borderColor: '#f0c27f', tension: 0.3, fill: false },
  ];

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(chartEl, {
    type: 'line',
    data: { labels, datasets },
    options: {
      scales: { y: { min: 1, max: 10, ticks: { stepSize: 1 } } },
      plugins: { legend: { position: 'bottom' } },
      responsive: true
    }
  });

  // Yes/No rates
  const ynKeys = { heard: 'Feel heard', quality_time: 'Quality time', authentic: 'Authentic self', safe: 'Emotionally safe', aligned: 'Aligned on future' };
  let ratesHtml = '';
  Object.entries(ynKeys).forEach(([k, label]) => {
    const answered = checkins.filter(c => k in c.yesno);
    if (answered.length === 0) return;
    const yesCount = answered.filter(c => c.yesno[k]).length;
    const pct = Math.round((yesCount / answered.length) * 100);
    ratesHtml += `<div class="rate-chip"><strong>${pct}%</strong>${label}</div>`;
  });
  ratesEl.innerHTML = ratesHtml;

  // History list (newest first)
  [...checkins].reverse().forEach(c => {
    const avg = avgScore(c.sliders);
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-mood">${c.mood || '💞'}</div>
      <div class="history-info">
        <div class="history-date">${c.date}</div>
        <div class="history-score">${avg}/10 avg</div>
      </div>`;
    listEl.appendChild(item);
  });
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

function avgScore(sliders) {
  const vals = Object.values(sliders);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { checkins: [] };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── INIT ──────────────────────────────────────────────────────────────────────
renderHome();
