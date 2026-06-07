// ================================
// SUPABASE CONNECTION
// ================================

const SUPABASE_URL = 'https://jhlcymefogldlulkplrk.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Rh0P0NBYcOD1mRBpoC3cdQ_BwkrSCKY'
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

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
    list.innerHTML = '<div class="empty-state">No analyses yet. Create your first analysis.</div>'
    return
  }

  list.innerHTML = analyses.map(a => `
    <div class="analysis-card">
      <div>
        <h3>${a.name}</h3>
        <p>${a.description || ''}</p>
        <p><strong>Main Process:</strong> ${a.main_process || ''}</p>
        <p style="font-size:11px; color:#a0aec0; margin-top:6px;">Last updated: ${new Date(a.updated_at).toLocaleDateString('en-GB')}</p>
      </div>
      <div class="actions">
        <button onclick="openAnalysis('${a.id}')">Open</button>
        <button class="btn-danger" onclick="deleteAnalysis('${a.id}')">Delete</button>
      </div>
    </div>
  `).join('')
}

// ================================
// CREATE ANALYSIS
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

// ================================
// DELETE ANALYSIS
// ================================

async function deleteAnalysis(id) {
  if (!confirm('Are you sure you want to delete this analysis?')) return

  const { error } = await db
    .from('risk_analyses')
    .delete()
    .eq('id', id)

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

  list.innerHTML = components.map(c => `
    <div class="component-card" onclick="openComponent('${c.id}')">
      <div>
        <h4>${c.name}</h4>
        <p>${c.description || ''}</p>
        <p><strong>Dependencies:</strong> ${c.dependencies || ''}</p>
      </div>
      <div class="actions">
        <button onclick="event.stopPropagation(); openComponent('${c.id}')">Open</button>
        <button class="btn-danger" onclick="event.stopPropagation(); deleteComponent('${c.id}')">Delete</button>
      </div>
    </div>
  `).join('')
}

async function deleteComponent(id) {
  if (!confirm('Are you sure you want to delete this component?')) return

  const { error } = await db
    .from('components')
    .delete()
    .eq('id', id)

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
// RISKS
// ================================

function showAddRisk() {
  document.getElementById('add-risk-form').classList.remove('hidden')
}

function hideAddRisk() {
  document.getElementById('add-risk-form').classList.add('hidden')
}

async function saveRisk() {
  const scenario = document.getElementById('risk-scenario').value
  const likelihood = parseInt(document.getElementById('risk-likelihood').value)
  const impact = parseInt(document.getElementById('risk-impact').value)
  const measures = document.getElementById('risk-measures').value
  const residual_likelihood = parseInt(document.getElementById('risk-residual-likelihood').value)
  const residual_impact = parseInt(document.getElementById('risk-residual-impact').value)
  const treatment = document.getElementById('risk-treatment').value
  const notes = document.getElementById('risk-notes').value
  const errorEl = document.getElementById('risk-error')

  errorEl.textContent = ''

  if (!scenario) {
    errorEl.textContent = 'Scenario is required.'
    return
  }

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
      residual_impact,
      treatment,
      notes
    })

  if (error) {
    errorEl.textContent = 'Save failed. Please try again.'
  } else {
    document.getElementById('risk-scenario').value = ''
    document.getElementById('risk-measures').value = ''
    document.getElementById('risk-notes').value = ''
    hideAddRisk()
    loadComponentRisks()
  }
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

  list.innerHTML = `
    <table class="risks-table">
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Likelihood</th>
          <th>Impact</th>
          <th>Score</th>
          <th>Measures</th>
          <th>Res. Likelihood</th>
          <th>Res. Impact</th>
          <th>Res. Score</th>
          <th>Treatment</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map(r => `
          <tr>
            <td>${r.scenario}</td>
            <td>${r.likelihood}</td>
            <td>${r.impact}</td>
            <td><span class="${scoreClass(r.score)}">${r.score}</span></td>
            <td>${r.measures || ''}</td>
            <td>${r.residual_likelihood || ''}</td>
            <td>${r.residual_impact || ''}</td>
            <td>${r.residual_score ? `<span class="${scoreClass(r.residual_score)}">${r.residual_score}</span>` : ''}</td>
            <td>${r.treatment}</td>
            <td><button class="btn-danger" onclick="deleteRisk('${r.id}')">Delete</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
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

  list.innerHTML = `
    <table class="risks-table">
      <thead>
        <tr>
          <th>Component</th>
          <th>Scenario</th>
          <th>Likelihood</th>
          <th>Impact</th>
          <th>Score</th>
          <th>Measures</th>
          <th>Res. Likelihood</th>
          <th>Res. Impact</th>
          <th>Res. Score</th>
          <th>Treatment</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map(r => `
          <tr>
            <td>${r.components?.name || ''}</td>
            <td>${r.scenario}</td>
            <td>${r.likelihood}</td>
            <td>${r.impact}</td>
            <td><span class="${scoreClass(r.score)}">${r.score}</span></td>
            <td>${r.measures || ''}</td>
            <td>${r.residual_likelihood || ''}</td>
            <td>${r.residual_impact || ''}</td>
            <td>${r.residual_score ? `<span class="${scoreClass(r.residual_score)}">${r.residual_score}</span>` : ''}</td>
            <td>${r.treatment}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function scoreClass(score) {
  if (score <= 4) return 'score-low'
  if (score <= 12) return 'score-medium'
  return 'score-high'
}

async function deleteRisk(id) {
  if (!confirm('Are you sure you want to delete this risk?')) return

  const { error } = await db
    .from('risks')
    .delete()
    .eq('id', id)

  if (!error) loadComponentRisks()
}

// ================================
// START APP
// ================================

init()
