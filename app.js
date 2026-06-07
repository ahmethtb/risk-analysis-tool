// ================================
// SUPABASE CONNECTION
// ================================

const SUPABASE_URL = 'https://jhlcymefogldlulkplrk.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Rh0P0NBYcOD1mRBpoC3cdQ_BwkrSCKY'
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ================================
// SCORE COLOR
// ================================

function scoreClass(score) {
  if (score <= 4) return 'score-low'
  if (score <= 12) return 'score-medium'
  return 'score-high'
}

// ================================
// PAGE NAVIGATION
// ================================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'))
  document.getElementById(pageId).classList.remove('hidden')
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'))
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  document.getElementById(tabId).classList.remove('hidden')
  event.target.classList.add('active')
  if (tabId === 'tab-risks') loadRisksOverview()
  if (tabId === 'tab-impact') loadImpactScale()
}

// ================================
// HELP SYSTEM
// ================================

function showHelp(page) {
  const pages = {
    'dashboard': {
      title: 'Dashboard',
      content: [
        'This is your overview of all risk analyses.',
        'Click <strong>Open</strong> to view or continue working on an analysis.',
        'Click <strong>Edit</strong> to change the name, description or main process.',
        'Click <strong>+ New Analysis</strong> to start a new risk analysis.'
      ]
    },
    'new-analysis': {
      title: 'New Risk Analysis',
      content: [
        '<strong>Name</strong> — Give your analysis a clear name. For example: Thailand Vacation.',
        '<strong>Description</strong> — A short summary of what this analysis is about.',
        '<strong>Main Process</strong> — Describe what you want to achieve or protect.'
      ]
    },
    'detail': {
      title: 'Risk Analysis',
      content: [
        '<strong>Components</strong> — Add everything your main process depends on. Click a component to add risks.',
        '<strong>Risk Overview</strong> — See all risks across all components in one table, sorted by highest score.',
        '<strong>Impact Scale</strong> — Define what each impact score means for this specific analysis.'
      ]
    },
    'component': {
      title: 'Component Risks',
      content: [
        'Here you add risks for this specific component.',
        '<strong>Scenario</strong> — What can go wrong?',
        '<strong>Chance & Impact</strong> — Score from 1 (low) to 5 (high). Score is calculated automatically.',
        '<strong>Treatment</strong> — Accept, Avoid, Mitigate or Transfer.',
        '<strong>Measures</strong> — What will you do to reduce the risk?',
        '<strong>Residual Chance</strong> — What is the chance after your measures are applied?'
      ]
    }
  }
  const data = pages[page]
  if (!data) return
  document.getElementById('help-title').textContent = data.title
  document.getElementById('help-content').innerHTML = data.content.map(function(line) {
    return '<p>' + line + '</p>'
  }).join('')
  document.getElementById('help-overlay').style.display = 'none'
}

function closeHelp() {
  document.getElementById('help-overlay').style.display = 'flex'
}

// ================================
// AUTHENTICATION
// ================================

async function register() {
  const email = document.getElementById('register-email').value
  const password = document.getElementById('register-password').value
  const errorEl = document.getElementById('register-error')
  const successEl = document.getElementById('register-success')
  errorEl.textContent = ''
  successEl.textContent = ''
  const { error } = await db.auth.signUp({ email, password })
  if (error) {
    errorEl.textContent = error.message
  } else {
    successEl.textContent = 'Account created! You can now login.'
    showPage('page-login')
  }
}

async function login() {
  const email = document.getElementById('login-email').value
  const password = document.getElementById('login-password').value
  const errorEl = document.getElementById('login-error')
  errorEl.textContent = ''
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) {
    errorEl.textContent = 'Login failed. Check your email and password.'
  } else {
    loadDashboard()
  }
}

async function logout() {
  await db.auth.signOut()
  showPage('page-login')
}

// ================================
// STARTUP
// ================================

async function init() {
  const { data: { session } } = await db.auth.getSession()
  if (session) {
    loadDashboard()
  } else {
    showPage('page-login')
  }
}

// ================================
// DASHBOARD
// ================================

async function loadDashboard() {
  showPage('page-dashboard')
  const { data: analyses, error } = await db
    .from('risk_analyses')
    .select('*')
    .order('updated_at', { ascending: false })
  const list = document.getElementById('analyses-list')
  if (error) {
    list.innerHTML = '<p class="error">Error loading analyses.</p>'
    return
  }
  if (analyses.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No analyses yet.</p><p>Create your first analysis to get started.</p></div>'
    return
  }
  let html = '<div class="analyses-grid">'
  analyses.forEach(function(a) {
    html += '<div class="analysis-card">'
    html += '<div class="analysis-card-body">'
    html += '<h3>' + a.name + '</h3>'
    if (a.description) html += '<p>' + a.description + '</p>'
    if (a.main_process) html += '<div class="main-process">' + a.main_process + '</div>'
    html += '</div>'
    html += '<div class="analysis-card-footer">'
    html += '<span class="date">Updated: ' + new Date(a.updated_at).toLocaleDateString('en-GB') + '</span>'
    html += '<div class="actions">'
    html += '<button onclick="openAnalysis(\'' + a.id + '\')">Open</button>'
    html += '<button class="btn-secondary" onclick="editAnalysis(\'' + a.id + '\')">Edit</button>'
    html += '<button class="btn-danger" onclick="deleteAnalysis(\'' + a.id + '\')">Delete</button>'
    html += '</div>'
    html += '</div>'
    html += '</div>'
  })
  html += '</div>'
  list.innerHTML = html
}

// ================================
// CREATE / EDIT ANALYSIS
// ================================

async function createAnalysis() {
  const name = document.getElementById('new-name').value
  const description = document.getElementById('new-description').value
  const main_process = document.getElementById('new-process').value
  const errorEl = document.getElementById('new-analysis-error')
  errorEl.textContent = ''
  if (!name) {
    errorEl.textContent = 'Name is required.'
    return
  }
  const { data: { user } } = await db.auth.getUser()
  const { error } = await db
    .from('risk_analyses')
    .insert({ user_id: user.id, name, description, main_process })
  if (error) {
    errorEl.textContent = 'Save failed. Please try again.'
  } else {
    document.getElementById('new-name').value = ''
    document.getElementById('new-description').value = ''
    document.getElementById('new-process').value = ''
    loadDashboard()
  }
}

let editingAnalysisId = null

async function editAnalysis(id) {
  editingAnalysisId = id
  const { data: analysis } = await db
    .from('risk_analyses')
    .select('*')
    .eq('id', id)
    .single()
  document.getElementById('new-name').value = analysis.name
  document.getElementById('new-description').value = analysis.description || ''
  document.getElementById('new-process').value = analysis.main_process || ''
  document.getElementById('new-analysis-error').textContent = ''
  const saveBtn = document.querySelector('#page-new-analysis button[onclick="createAnalysis()"]')
  if (saveBtn) saveBtn.setAttribute('onclick', 'updateAnalysis()')
  const h2 = document.querySelector('#page-new-analysis h2')
  if (h2) h2.textContent = 'Edit Risk Analysis'
  showPage('page-new-analysis')
}

async function updateAnalysis() {
  const name = document.getElementById('new-name').value
  const description = document.getElementById('new-description').value
  const main_process = document.getElementById('new-process').value
  const errorEl = document.getElementById('new-analysis-error')
  errorEl.textContent = ''
  if (!name) {
    errorEl.textContent = 'Name is required.'
    return
  }
  const { error } = await db
    .from('risk_analyses')
    .update({ name, description, main_process })
    .eq('id', editingAnalysisId)
  if (error) {
    errorEl.textContent = 'Save failed. Please try again.'
  } else {
    editingAnalysisId = null
    const saveBtn = document.querySelector('#page-new-analysis button[onclick="updateAnalysis()"]')
    if (saveBtn) saveBtn.setAttribute('onclick', 'createAnalysis()')
    const h2 = document.querySelector('#page-new-analysis h2')
    if (h2) h2.textContent = 'New Risk Analysis'
    document.getElementById('new-name').value = ''
    document.getElementById('new-description').value = ''
    document.getElementById('new-process').value = ''
    loadDashboard()
  }
}

async function deleteAnalysis(id) {
  if (!confirm('Are you sure you want to delete this analysis?')) return
  const { error } = await db.from('risk_analyses').delete().eq('id', id)
  if (!error) loadDashboard()
}

// ================================
// OPEN ANALYSIS
// ================================

let currentAnalysisId = null

async function openAnalysis(id) {
  currentAnalysisId = id
  const { data: analysis } = await db
    .from('risk_analyses')
    .select('*')
    .eq('id', id)
    .single()
  document.getElementById('detail-name').textContent = analysis.name
  document.getElementById('detail-description').textContent = analysis.description || ''
  document.getElementById('detail-process').textContent = analysis.main_process || ''
  showPage('page-detail')
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'))
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('tab-components').classList.remove('hidden')
  document.querySelectorAll('.tab-btn')[0].classList.add('active')
  loadComponents()
}

// ================================
// COMPONENTS
// ================================

function showAddComponent() {
  document.getElementById('add-component-form').classList.remove('hidden')
  document.getElementById('edit-component-form').classList.add('hidden')
}

function hideAddComponent() {
  document.getElementById('add-component-form').classList.add('hidden')
}

async function saveComponent() {
  const name = document.getElementById('component-name').value
  const description = document.getElementById('component-description').value
  const dependencies = document.getElementById('component-dependencies').value
  const errorEl = document.getElementById('component-error')
  errorEl.textContent = ''
  if (!name) {
    errorEl.textContent = 'Name is required.'
    return
  }
  const { error } = await db
    .from('components')
    .insert({ analysis_id: currentAnalysisId, name, description, dependencies })
  if (error) {
    errorEl.textContent = 'Save failed. Please try again.'
  } else {
    document.getElementById('component-name').value = ''
    document.getElementById('component-description').value = ''
    document.getElementById('component-dependencies').value = ''
    hideAddComponent()
    loadComponents()
  }
}

let editingComponentId = null
let cachedComponents = {}

async function editComponent(id) {
  editingComponentId = id
  const c = cachedComponents[id]
  if (!c) return
  document.getElementById('edit-component-name').value = c.name
  document.getElementById('edit-component-description').value = c.description || ''
  document.getElementById('edit-component-dependencies').value = c.dependencies || ''
  document.getElementById('edit-component-error').textContent = ''
  document.getElementById('edit-component-form').classList.remove('hidden')
  document.getElementById('add-component-form').classList.add('hidden')
  window.scrollTo(0, 0)
}

function hideEditComponent() {
  document.getElementById('edit-component-form').classList.add('hidden')
  editingComponentId = null
}

async function updateComponent() {
  const name = document.getElementById('edit-component-name').value
  const description = document.getElementById('edit-component-description').value
  const dependencies = document.getElementById('edit-component-dependencies').value
  const errorEl = document.getElementById('edit-component-error')
  errorEl.textContent = ''
  if (!name) {
    errorEl.textContent = 'Name is required.'
    return
  }
  const { error } = await db
    .from('components')
    .update({ name, description, dependencies })
    .eq('id', editingComponentId)
  if (error) {
    errorEl.textContent = 'Save failed. Please try again.'
  } else {
    hideEditComponent()
    loadComponents()
  }
}

async function loadComponents() {
  const { data: components, error } = await db
    .from('components')
    .select('*')
    .eq('analysis_id', currentAnalysisId)
    .order('created_at', { ascending: true })
  const list = document.getElementById('components-list')
  if (error) {
    list.innerHTML = '<p class="error">Error loading components.</p>'
    return
  }
  if (components.length === 0) {
    list.innerHTML = '<div class="empty-state">No components yet. Add your first component.</div>'
    return
  }
  cachedComponents = {}
  components.forEach(function(c) { cachedComponents[c.id] = c })
  let html = ''
  components.forEach(function(c) {
    html += '<div class="component-card" onclick="openComponent(\'' + c.id + '\')">'
    html += '<div>'
    html += '<h4>' + c.name + '</h4>'
    if (c.description) html += '<p>' + c.description + '</p>'
    if (c.dependencies) html += '<p><strong>Dependencies:</strong> ' + c.dependencies + '</p>'
    html += '</div>'
    html += '<div class="actions">'
    html += '<button onclick="event.stopPropagation(); openComponent(\'' + c.id + '\')">Open</button>'
    html += '<button class="btn-secondary" onclick="event.stopPropagation(); editComponent(\'' + c.id + '\')">Edit</button>'
    html += '<button class="btn-danger" onclick="event.stopPropagation(); deleteComponent(\'' + c.id + '\')">Delete</button>'
    html += '</div>'
    html += '</div>'
  })
  list.innerHTML = html
}

async function deleteComponent(id) {
  if (!confirm('Are you sure you want to delete this component?')) return
  const { error } = await db.from('components').delete().eq('id', id)
  if (!error) loadComponents()
}

// ================================
// OPEN COMPONENT
// ================================

let currentComponentId = null

async function openComponent(id) {
  currentComponentId = id
  const { data: component } = await db
    .from('components')
    .select('*')
    .eq('id', id)
    .single()
  document.getElementById('component-detail-name').textContent = component.name
  document.getElementById('component-detail-description').textContent = component.description || ''
  document.getElementById('component-detail-dependencies').textContent = component.dependencies || ''
  showPage('page-component')
  loadComponentRisks()
}

function backToAnalysis() {
  showPage('page-detail')
  loadComponents()
}

// ================================
// IMPACT SCALE
// ================================

async function loadImpactScale() {
  const { data } = await db
    .from('impact_scales')
    .select('*')
    .eq('analysis_id', currentAnalysisId)
    .single()
  if (data) {
    document.getElementById('impact-1').value = data.score_1 || ''
    document.getElementById('impact-2').value = data.score_2 || ''
    document.getElementById('impact-3').value = data.score_3 || ''
    document.getElementById('impact-4').value = data.score_4 || ''
    document.getElementById('impact-5').value = data.score_5 || ''
    showImpactScaleDisplay(data)
  }
}

function showImpactScaleDisplay(data) {
  const display = document.getElementById('impact-scale-display')
  if (!data || (!data.score_1 && !data.score_2 && !data.score_3 && !data.score_4 && !data.score_5)) {
    display.innerHTML = ''
    return
  }
  let html = '<div class="form-box" style="margin-top:16px;">'
  html += '<h4>Current Impact Scale</h4>'
  html += '<table class="risks-table">'
  html += '<thead><tr><th style="width:80px;">Score</th><th>Description</th></tr></thead>'
  html += '<tbody>'
  html += '<tr><td style="text-align:center;"><span class="score-low">1</span></td><td>' + (data.score_1 || '—') + '</td></tr>'
  html += '<tr><td style="text-align:center;"><span class="score-low">2</span></td><td>' + (data.score_2 || '—') + '</td></tr>'
  html += '<tr><td style="text-align:center;"><span class="score-medium">3</span></td><td>' + (data.score_3 || '—') + '</td></tr>'
  html += '<tr><td style="text-align:center;"><span class="score-high">4</span></td><td>' + (data.score_4 || '—') + '</td></tr>'
  html += '<tr><td style="text-align:center;"><span class="score-high">5</span></td><td>' + (data.score_5 || '—') + '</td></tr>'
  html += '</tbody></table>'
  html += '</div>'
  display.innerHTML = html
}

async function saveImpactScale() {
  const score_1 = document.getElementById('impact-1').value
  const score_2 = document.getElementById('impact-2').value
  const score_3 = document.getElementById('impact-3').value
  const score_4 = document.getElementById('impact-4').value
  const score_5 = document.getElementById('impact-5').value
  const errorEl = document.getElementById('impact-error')
  const successEl = document.getElementById('impact-success')
  errorEl.textContent = ''
  successEl.textContent = ''
  const { data: existing } = await db
    .from('impact_scales')
    .select('id')
    .eq('analysis_id', currentAnalysisId)
    .single()
  let error
  if (existing) {
    const result = await db
      .from('impact_scales')
      .update({ score_1, score_2, score_3, score_4, score_5 })
      .eq('id', existing.id)
    error = result.error
  } else {
    const result = await db
      .from('impact_scales')
      .insert({ analysis_id: currentAnalysisId, score_1, score_2, score_3, score_4, score_5 })
    error = result.error
  }
  if (error) {
    errorEl.textContent = 'Save failed. Please try again.'
  } else {
    successEl.textContent = 'Impact scale saved!'
    showImpactScaleDisplay({ score_1, score_2, score_3, score_4, score_5 })
  }
}

// ================================
// RISKS
// ================================

let editingRiskId = null
let cachedRisks = {}

function showAddRisk() {
  document.getElementById('add-risk-form').classList.remove('hidden')
}

function hideAddRisk() {
  editingRiskId = null
  document.getElementById('risk-scenario').value = ''
  document.getElementById('risk-measures').value = ''
  document.getElementById('risk-notes').value = ''
  document.getElementById('add-risk-form').classList.add('hidden')
}

function editRisk(id) {
  const r = cachedRisks[id]
  if (!r) return
  editingRiskId = id
  document.getElementById('risk-scenario').value = r.scenario
  document.getElementById('risk-likelihood').value = r.likelihood
  document.getElementById('risk-impact').value = r.impact
  document.getElementById('risk-measures').value = r.measures || ''
  document.getElementById('risk-residual-likelihood').value = r.residual_likelihood || 1
  document.getElementById('risk-treatment').value = r.treatment
  document.getElementById('risk-notes').value = r.notes || ''
  document.getElementById('add-risk-form').classList.remove('hidden')
  window.scrollTo(0, 0)
}

async function saveRisk() {
  const scenario = document.getElementById('risk-scenario').value
  const likelihood = parseInt(document.getElementById('risk-likelihood').value)
  const impact = parseInt(document.getElementById('risk-impact').value)
  const measures = document.getElementById('risk-measures').value
  const residual_likelihood = parseInt(document.getElementById('risk-residual-likelihood').value)
  const treatment = document.getElementById('risk-treatment').value
  const notes = document.getElementById('risk-notes').value
  const errorEl = document.getElementById('risk-error')
  errorEl.textContent = ''
  if (!scenario) {
    errorEl.textContent = 'Scenario is required.'
    return
  }
  if (editingRiskId) {
    const { error } = await db
      .from('risks')
      .update({ scenario, likelihood, impact, measures, residual_likelihood, treatment, notes })
      .eq('id', editingRiskId)
    if (error) {
      errorEl.textContent = 'Save failed. Please try again.'
    } else {
      hideAddRisk()
      loadComponentRisks()
    }
  } else {
    const { error } = await db
      .from('risks')
      .insert({
        analysis_id: currentAnalysisId,
        component_id: currentComponentId,
        scenario,
        likelihood,
        impact,
        measures,
        residual_likelihood,
        treatment,
        notes
      })
    if (error) {
      errorEl.textContent = 'Save failed. Please try again.'
    } else {
      hideAddRisk()
      loadComponentRisks()
    }
  }
}

function buildRiskTableHeader(includeComponent) {
  let html = '<thead><tr>'
  if (includeComponent) html += '<th class="col-component">Component</th>'
  html += '<th class="col-scenario">Scenario</th>'
  html += '<th class="col-number">Chance</th>'
  html += '<th class="col-number">Impact</th>'
  html += '<th class="col-number">Score</th>'
  html += '<th class="col-treatment">Treatment</th>'
  html += '<th class="col-measures">Measures</th>'
  html += '<th class="col-number">Residual<br>Chance</th>'
  html += '<th class="col-number">Residual<br>Score</th>'
  html += '<th class="col-action">Action</th>'
  html += '</tr></thead>'
  return html
}

function buildRiskRow(r, includeComponent, componentName, showAction) {
  const residualScore = r.residual_likelihood ? r.residual_likelihood * r.impact : null
  let html = '<tr>'
  if (includeComponent) html += '<td class="col-component">' + (componentName || '') + '</td>'
  html += '<td class="col-scenario">' + r.scenario + '</td>'
  html += '<td class="col-number">' + r.likelihood + '</td>'
  html += '<td class="col-number">' + r.impact + '</td>'
  html += '<td class="col-number"><span class="' + scoreClass(r.score) + '">' + r.score + '</span></td>'
  html += '<td class="col-treatment">' + r.treatment + '</td>'
  html += '<td class="col-measures">' + (r.measures || '') + '</td>'
  html += '<td class="col-number">' + (r.residual_likelihood || '') + '</td>'
  html += '<td class="col-number">' + (residualScore ? '<span class="' + scoreClass(residualScore) + '">' + residualScore + '</span>' : '') + '</td>'
  if (showAction === 'component') {
    html += '<td class="col-action">'
    html += '<button onclick="editRisk(\'' + r.id + '\')">Edit</button>'
    html += '<button class="btn-danger" onclick="deleteRisk(\'' + r.id + '\')">Delete</button>'
    html += '</td>'
  } else if (showAction === 'overview') {
    html += '<td class="col-action">'
    html += '<button onclick="editRiskFromOverview(\'' + r.id + '\')">Edit</button>'
    html += '<button class="btn-danger" onclick="deleteRiskFromOverview(\'' + r.id + '\')">Delete</button>'
    html += '</td>'
  }
  html += '</tr>'
  return html
}

async function loadComponentRisks() {
  const { data: risks, error } = await db
    .from('risks')
    .select('*')
    .eq('component_id', currentComponentId)
    .order('score', { ascending: false })
  const list = document.getElementById('component-risks-list')
  if (error) {
    list.innerHTML = '<p class="error">Error loading risks.</p>'
    return
  }
  if (risks.length === 0) {
    list.innerHTML = '<div class="empty-state">No risks yet. Add your first risk.</div>'
    return
  }
  cachedRisks = {}
  risks.forEach(function(r) { cachedRisks[r.id] = r })
  let html = '<table class="risks-table">'
  html += buildRiskTableHeader(false)
  html += '<tbody>'
  risks.forEach(function(r) {
    html += buildRiskRow(r, false, null, 'component')
  })
  html += '</tbody></table>'
  list.innerHTML = html
}

async function loadRisksOverview() {
  const { data: risks, error } = await db
    .from('risks')
    .select('*, components(name)')
    .eq('analysis_id', currentAnalysisId)
    .order('score', { ascending: false })
  const list = document.getElementById('risks-overview')
  if (error) {
    list.innerHTML = '<p class="error">Error loading risks.</p>'
    return
  }
  if (risks.length === 0) {
    list.innerHTML = '<div class="empty-state">No risks yet. Add components and risks first.</div>'
    return
  }
  cachedRisks = {}
  risks.forEach(function(r) { cachedRisks[r.id] = r })
  let html = '<table class="risks-table">'
  html += buildRiskTableHeader(true)
  html += '<tbody>'
  risks.forEach(function(r) {
    html += buildRiskRow(r, true, r.components ? r.components.name : '', 'overview')
  })
  html += '</tbody></table>'
  list.innerHTML = html
}

async function deleteRisk(id) {
  if (!confirm('Are you sure you want to delete this risk?')) return
  const { error } = await db.from('risks').delete().eq('id', id)
  if (!error) loadComponentRisks()
}

async function deleteRiskFromOverview(id) {
  if (!confirm('Are you sure you want to delete this risk?')) return
  const { error } = await db.from('risks').delete().eq('id', id)
  if (!error) loadRisksOverview()
}

async function editRiskFromOverview(id) {
  const r = cachedRisks[id]
  if (!r) return
  currentComponentId = r.component_id
  const { data: component } = await db
    .from('components')
    .select('*')
    .eq('id', r.component_id)
    .single()
  document.getElementById('component-detail-name').textContent = component.name
  document.getElementById('component-detail-description').textContent = component.description || ''
  document.getElementById('component-detail-dependencies').textContent = component.dependencies || ''
  showPage('page-component')
  await loadComponentRisks()
  editRisk(id)
}

// ================================
// START APP
// ================================

init()
