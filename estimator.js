// ── Price constants ────────────────────────────────────────────
const PRICES = {
  stairs: {
    concrete: [200, 680],
    mdf:      [120, 300],
    floated:  [500, 700],
  },
  removal: {
    carpet: [15, 35],
    timber: [25, 55],
  },
  sandingCoating: [60, 250],
};

const FLOOR_TYPES = [
  {
    name: 'Hybrid Flooring',
    emoji: '🏆',
    scratch: ['high', 'medium'],
    budget: ['economy', 'mid', 'premium'],
    supplyAndInstallPsm: [75, 135],
    desc: 'The modern standard for family homes. A rigid core makes it 100% waterproof and extremely hard-wearing. Floats over imperfect subfloors — easier to install and highly durable.',
    pro: 'Most scratch and water resistant; great for pets & kids',
  },
  {
    name: 'Engineered Timber',
    emoji: '🪵',
    scratch: ['medium', 'low'],
    budget: ['mid', 'premium'],
    supplyAndInstallPsm: [126, 232],
    desc: 'Real timber veneer over a hardwood core — looks and feels like solid timber but is more stable. Can be sanded and refinished once or twice over its lifetime.',
    pro: 'Authentic timber look and feel; can be refinished',
  },
  {
    name: 'Solid Hardwood',
    emoji: '🌳',
    scratch: ['medium', 'low'],
    budget: ['premium'],
    supplyAndInstallPsm: [179, 367],
    desc: 'The traditional choice. Spotted Gum, Blackbutt, Tallowwood — Australian hardwood is among the hardest in the world. Can be sanded and refinished multiple times over decades.',
    pro: 'Timeless, increases property value; can last 100+ years',
  },
  {
    name: 'Laminate Flooring',
    emoji: '💰',
    scratch: ['high', 'medium'],
    budget: ['economy'],
    supplyAndInstallPsm: [71, 105],
    desc: 'A practical, budget-friendly option with a timber look. Modern laminate is durable and easy to clean. Best in low-moisture areas.',
    pro: 'Most affordable; quick installation; easy maintenance',
  },
];

// ── Estimator state ────────────────────────────────────────────
let stepHistory = ['service'];
const answers = {};
let stairCount = 14;
let estimatorStarted = false;

function currentStepId() {
  return stepHistory[stepHistory.length - 1];
}

// ── Step routing ───────────────────────────────────────────────
function nextStepId(current) {
  const svc = answers.service;
  switch (current) {
    case 'service':
      if (svc === 'supply-install') return 'scratch';
      if (svc === 'stairs-only')    return 'stairs-count';
      if (svc === 'sanding')        return 'area';
      break;
    case 'scratch':      return 'area';
    case 'area':
      if (svc === 'sanding')     return 'results';
      if (answers.includeStairs) return 'stairs-count';
      return 'removal';
    case 'stairs-count': return 'stairs-base';
    case 'stairs-base':
      if (svc === 'stairs-only') return 'results';
      return 'removal';
    case 'removal':      return 'budget';
    case 'budget':       return 'results';
  }
  return 'results';
}

function expectedTotal() {
  const svc = answers.service;
  if (svc === 'sanding')        return 3;
  if (svc === 'stairs-only')    return 4;
  if (svc === 'supply-install') return answers.includeStairs ? 8 : 6;
  return 6;
}

function currentStepHasAnswer() {
  switch (currentStepId()) {
    case 'service':      return !!answers.service;
    case 'scratch':      return !!answers.scratch;
    case 'area':         return true;
    case 'stairs-count': return true;
    case 'stairs-base':  return !!answers.stairBase;
    case 'removal':      return !!answers.removal;
    case 'budget':       return !!answers.budget;
    case 'results':      return false;
  }
  return false;
}

// ── Navigation ─────────────────────────────────────────────────
function nextStep() {
  const current = currentStepId();
  if (current === 'results') return;
  const fromStep = current;
  const next = nextStepId(current);
  stepHistory.push(next);
  if (next === 'results') buildResults();
  showStep(next);
  trackEvent('estimator_step_complete', { from_step: fromStep, to_step: next, service: answers.service || null });
}

function prevStep() {
  if (stepHistory.length <= 1) return;
  stepHistory.pop();
  showStep(currentStepId());
}

function showStep(stepId) {
  document.querySelectorAll('.calc-step').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('estep-' + stepId);
  if (el) el.classList.add('active');

  if (stepId === 'area') {
    const isSanding = answers.service === 'sanding';
    document.getElementById('areaStepTitle').textContent = isSanding
      ? 'What area needs sanding & coating?'
      : 'What area needs flooring?';
    const toggleSection = document.getElementById('stairsToggleSection');
    if (toggleSection) toggleSection.classList.toggle('hidden', isSanding);
  }

  updateProgress();
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateProgress() {
  const total   = expectedTotal();
  const current = stepHistory.length;
  const pct     = Math.min(Math.round((current / total) * 100), 100);

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('stepLabel').textContent    = `Step ${current} of ${total}`;
  document.getElementById('stepPct').textContent      = pct + '%';

  const prev    = document.getElementById('prevBtn');
  const next    = document.getElementById('nextBtn');
  const calcNav = document.getElementById('calcNav');
  calcNav.classList.remove('hidden');

  if (stepHistory.length <= 1) {
    prev.classList.add('opacity-0', 'pointer-events-none');
    prev.setAttribute('aria-disabled', 'true');
  } else {
    prev.classList.remove('opacity-0', 'pointer-events-none');
    prev.removeAttribute('aria-disabled');
  }

  if (currentStepId() === 'results') {
    next.classList.add('hidden');
  } else {
    next.classList.remove('hidden');
    const hasAnswer = currentStepHasAnswer();
    next.disabled = !hasAnswer;
    next.classList.toggle('opacity-50', !hasAnswer);
    next.setAttribute('aria-disabled', String(!hasAnswer));
  }
}

// ── Option selection ───────────────────────────────────────────
function selectOption(btn) {
  const key = btn.dataset.key;
  document.querySelectorAll(`[data-key="${key}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  answers[key] = btn.dataset.val;

  if (key === 'service') {
    delete answers.scratch;
    delete answers.stairBase;
    delete answers.removal;
    delete answers.budget;
    answers.includeStairs = false;
    const cb = document.getElementById('hasStairs');
    if (cb) cb.checked = false;
    ['scratch', 'stairBase', 'removal', 'budget'].forEach(k => {
      document.querySelectorAll(`[data-key="${k}"]`).forEach(b => b.classList.remove('selected'));
    });
  }

  if (key === 'removal') {
    const tip = document.getElementById('timberRemovalTip');
    if (tip) tip.classList.toggle('hidden', btn.dataset.val !== 'timber');
  }

  if (!estimatorStarted) {
    estimatorStarted = true;
    trackEvent('estimator_started', { service: answers.service || null });
  }
  trackEvent('estimator_option_selected', { step: currentStepId(), key, value: btn.dataset.val });

  updateProgress();
}

// ── Stairs toggle + stepper ────────────────────────────────────
function toggleStairsSection(checkbox) {
  answers.includeStairs = checkbox.checked;
  updateProgress();
}

function changeSteps(delta) {
  stairCount = Math.max(1, Math.min(50, stairCount + delta));
  document.getElementById('stepsVal').textContent = stairCount;
}

// ── Build results ──────────────────────────────────────────────
function buildResults() {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';

  const svc = answers.service;
  if (svc === 'sanding') {
    document.getElementById('resultsTitle').textContent    = 'Your sanding & coating estimate';
    document.getElementById('resultsSubtitle').textContent = 'Based on your floor area, here\'s a rough cost guide.';
    buildSandingResults(container);
  } else if (svc === 'stairs-only') {
    document.getElementById('resultsTitle').textContent    = 'Your stair installation estimate';
    document.getElementById('resultsSubtitle').textContent = 'Based on your step count and base type, here\'s a rough cost guide.';
    buildStairsOnlyResults(container);
  } else {
    document.getElementById('resultsTitle').textContent    = 'Your personalised flooring guide';
    document.getElementById('resultsSubtitle').textContent = 'Based on your answers, here are the best options for your situation.';
    buildSupplyInstallResults(container);
  }

  const disc = document.createElement('p');
  disc.style.cssText = 'font-size:11px;color:#1C1410;opacity:0.35;font-family:Inter,sans-serif;text-align:center;margin-top:0.5rem;line-height:1.5';
  disc.textContent = 'Estimates are indicative only and vary by site conditions, materials and access. A free on-site quote is always required for an accurate price.';
  container.appendChild(disc);

  trackEvent('estimator_completed', { service: svc });
}

function appendSummaryPill(container, text) {
  const div = document.createElement('div');
  div.className = 'mb-4 p-4 rounded-xl text-sm font-body';
  div.style.cssText = 'background:#fdf8f3;border:1.5px solid #E8DDD0';
  div.innerHTML = `<strong class="text-walnut">Your job summary:</strong> <span class="text-walnut/60">${text}</span>`;
  container.appendChild(div);
}

function buildSandingResults(container) {
  const area = parseInt(document.getElementById('areaSlider').value) || 60;
  const low  = Math.round(PRICES.sandingCoating[0] * area);
  const high = Math.round(PRICES.sandingCoating[1] * area);

  appendSummaryPill(container, `${area} m² · sanding & coating`);

  const card = document.createElement('div');
  card.style.cssText = 'border:2px solid #C8873A;border-radius:1rem;padding:1.25rem;margin-bottom:0.75rem;background:#fdf8f3';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem">
      <div style="display:flex;align-items:center;gap:0.5rem">
        <span style="font-size:1.4rem">✨</span>
        <div>
          <div style="font-family:'Playfair Display',serif;font-weight:700;color:#1C1410;font-size:1.05rem">Sanding &amp; Coating</div>
          <span style="font-size:10px;background:#C8873A;color:white;padding:1px 8px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:600">ESTIMATE</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'Playfair Display',serif;font-weight:700;color:#1C1410;font-size:1.2rem">$${low.toLocaleString()} – $${high.toLocaleString()}</div>
        <div style="font-size:11px;color:#1C1410;opacity:0.45;font-family:Inter,sans-serif">rough total estimate</div>
      </div>
    </div>
    <p style="font-size:0.82rem;color:#1C1410;opacity:0.65;font-family:Inter,sans-serif;line-height:1.55;margin-bottom:0.6rem">Price varies by floor condition, timber species, and number of coats required. Water-based, oil, or polyurethane finishes — we'll recommend the right option on-site.</p>
    <div style="font-size:0.78rem;font-family:Inter,sans-serif">
      <span style="color:#16a34a;font-weight:600">✓ </span><span style="color:#1C1410;opacity:0.6">Often more cost-effective than full floor replacement</span>
    </div>
  `;
  container.appendChild(card);
}

function buildStairsOnlyResults(container) {
  const base      = answers.stairBase || 'concrete';
  const baseLabel = { concrete: 'Concrete', mdf: 'MDF', floated: 'Floated / open' }[base];
  const low       = stairCount * PRICES.stairs[base][0];
  const high      = stairCount * PRICES.stairs[base][1];

  appendSummaryPill(container, `${stairCount} stair steps · ${baseLabel} base`);

  const card = document.createElement('div');
  card.style.cssText = 'border:2px solid #C8873A;border-radius:1rem;padding:1.25rem;margin-bottom:0.75rem;background:#fdf8f3';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem">
      <div style="display:flex;align-items:center;gap:0.5rem">
        <span style="font-size:1.4rem">🪜</span>
        <div>
          <div style="font-family:'Playfair Display',serif;font-weight:700;color:#1C1410;font-size:1.05rem">Stair Tread Installation</div>
          <span style="font-size:10px;background:#C8873A;color:white;padding:1px 8px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:600">ESTIMATE</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'Playfair Display',serif;font-weight:700;color:#1C1410;font-size:1.2rem">$${low.toLocaleString()} – $${high.toLocaleString()}</div>
        <div style="font-size:11px;color:#1C1410;opacity:0.45;font-family:Inter,sans-serif">rough total estimate</div>
      </div>
    </div>
    <p style="font-size:0.82rem;color:#1C1410;opacity:0.65;font-family:Inter,sans-serif;line-height:1.55;margin-bottom:0.6rem">Based on ${stairCount} steps on a ${baseLabel.toLowerCase()} base at $${PRICES.stairs[base][0].toLocaleString()}–$${PRICES.stairs[base][1].toLocaleString()} per step. Includes supply and installation of timber treads.</p>
    <div style="font-size:0.78rem;font-family:Inter,sans-serif">
      <span style="color:#16a34a;font-weight:600">✓ </span><span style="color:#1C1410;opacity:0.6">Timber species matched to your existing floors on request</span>
    </div>
  `;
  container.appendChild(card);
}

function buildSupplyInstallResults(container) {
  const area          = parseInt(document.getElementById('areaSlider').value) || 60;
  const { scratch = 'medium', removal = 'none', budget = 'mid' } = answers;
  const includeStairs = answers.includeStairs;
  const base          = answers.stairBase || 'concrete';
  const baseLabel     = { concrete: 'Concrete', mdf: 'MDF', floated: 'Floated / open' }[base];

  let removalLow = 0, removalHigh = 0;
  if (removal === 'carpet') {
    removalLow  = area * PRICES.removal.carpet[0];
    removalHigh = area * PRICES.removal.carpet[1];
  } else if (removal === 'timber') {
    removalLow  = area * PRICES.removal.timber[0];
    removalHigh = area * PRICES.removal.timber[1];
  }

  let stairLow = 0, stairHigh = 0;
  if (includeStairs) {
    stairLow  = stairCount * PRICES.stairs[base][0];
    stairHigh = stairCount * PRICES.stairs[base][1];
  }

  let summaryText = `${area} m² floor area`;
  if (includeStairs) summaryText += ` + ${stairCount} stair steps (${baseLabel} base)`;
  if (removal !== 'none') summaryText += ' · includes removal';
  appendSummaryPill(container, summaryText);

  const suitable = FLOOR_TYPES.filter(f => f.scratch.includes(scratch) && f.budget.includes(budget));
  const shown    = suitable.length ? suitable : FLOOR_TYPES.filter(f => f.budget.includes(budget));

  shown.forEach((f, i) => {
    const floorLow  = Math.round(f.supplyAndInstallPsm[0] * area);
    const floorHigh = Math.round(f.supplyAndInstallPsm[1] * area);
    const totalLow  = floorLow  + removalLow  + stairLow;
    const totalHigh = floorHigh + removalHigh + stairHigh;

    const card = document.createElement('div');
    card.style.cssText = `border:2px solid ${i===0?'#C8873A':'#E8DDD0'};border-radius:1rem;padding:1.25rem;margin-bottom:0.75rem;background:${i===0?'#fdf8f3':'white'}`;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span style="font-size:1.4rem">${f.emoji}</span>
          <div>
            <div style="font-family:'Playfair Display',serif;font-weight:700;color:#1C1410;font-size:1.05rem">${f.name}</div>
            ${i===0 ? '<span style="font-size:10px;background:#C8873A;color:white;padding:1px 8px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:600">BEST MATCH</span>' : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Playfair Display',serif;font-weight:700;color:#1C1410;font-size:1.2rem">$${totalLow.toLocaleString()} – $${totalHigh.toLocaleString()}</div>
          <div style="font-size:11px;color:#1C1410;opacity:0.45;font-family:Inter,sans-serif">rough total estimate incl. install</div>
        </div>
      </div>
      <p style="font-size:0.82rem;color:#1C1410;opacity:0.65;font-family:Inter,sans-serif;line-height:1.55;margin-bottom:0.6rem">${f.desc}</p>
      <div style="font-size:0.78rem;font-family:Inter,sans-serif">
        <span style="color:#16a34a;font-weight:600">✓ </span><span style="color:#1C1410;opacity:0.6">${f.pro}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ── Contact / quote request ────────────────────────────────────
function buildContactMessage() {
  const name  = document.getElementById('quoteNameInput').value.trim() || 'a potential customer';
  const phone = document.getElementById('quotePhoneInput').value.trim() || 'not provided';
  const svc   = answers.service;
  let details = '';

  if (svc === 'supply-install') {
    const area = parseInt(document.getElementById('areaSlider').value) || 60;
    details = `Area: ~${area}m²`;
    if (answers.includeStairs) details += `, ${stairCount} stair steps (${answers.stairBase} base)`;
    if (answers.removal && answers.removal !== 'none') details += `, includes ${answers.removal} removal`;
    if (answers.budget) details += `, budget: ${answers.budget}`;
  } else if (svc === 'stairs-only') {
    details = `Stair installation: ${stairCount} steps, ${answers.stairBase || 'unknown'} base`;
  } else if (svc === 'sanding') {
    const area = parseInt(document.getElementById('areaSlider').value) || 60;
    details = `Sanding & coating: ~${area}m²`;
  }

  return `Hi Nick, my name is ${name} and I'd like a quote.\n${details}.\nPlease contact me on ${phone}. Thanks!`;
}

function requestCallSMS() {
  trackEvent('click_sms', { location: 'estimator_results' });
  const body = encodeURIComponent(buildContactMessage());
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const sep = isAndroid ? '?&' : isIOS ? '&' : null;
  window.location.href = sep ? `sms:+61413258185${sep}body=${body}` : 'sms:+61413258185';
}

function requestCallEmail() {
  trackEvent('click_email', { location: 'estimator_results' });
  const subject = encodeURIComponent('Flooring Quote Request');
  const body    = encodeURIComponent(buildContactMessage());
  window.location.href = `mailto:nick@hhtimberfloors.com.au?subject=${subject}&body=${body}`;
}

// ── Init ───────────────────────────────────────────────────────
updateProgress();
