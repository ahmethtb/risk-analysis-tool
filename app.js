// ================================
// PAGINA NAVIGATIE
// ================================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'))
  document.getElementById(pageId).classList.remove('hidden')
}

// ================================
// AUTHENTICATIE
// ================================

async function register() {
  const email = document.getElementById('register-email').value
  const password = document.getElementById('register-password').value
  const errorEl = document.getElementById('register-error')
  const successEl = document.getElementById('register-success')

  errorEl.textContent = ''
  successEl.textContent = ''

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    errorEl.textContent = error.message
  } else {
    successEl.textContent = 'Account aangemaakt! Controleer je e-mail om te bevestigen.'
  }
}

async function login() {
  const email = document.getElementById('login-email').value
  const password = document.getElementById('login-password').value
  const errorEl = document.getElementById('login-error')

  errorEl.textContent = ''

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    errorEl.textContent = 'Inloggen mislukt. Controleer je e-mailadres en wachtwoord.'
  } else {
    loadDashboard()
  }
}

async function logout() {
  await supabase.auth.signOut()
  showPage('page-login')
}

// ================================
// OPSTARTEN: controleer of al ingelogd
// ================================

async function init() {
  const { data: { session } } = await supabase.auth.getSession()
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

  const { data: analyses, error } = await supabase
    .from('risk_analyses')
    .select('*')
    .order('updated_at', { ascending: false })

  const list = document.getElementById('analyses-list')

  if (error) {
    list.innerHTML = '<p class="error">Fout bij laden van analyses.</p>'
    return
  }

  if (analyses.length === 0) {
    list.innerHTML = '<p>Nog geen analyses. Maak je eerste analyse aan.</p>'
    return
  }

  list.innerHTML = analyses.map(a => `
    <div class="analysis-card">
      <div>
        <h3>${a.name}</h3>
        <p>${a.description || ''}</p>
        <p><strong>Hoofdproces:</strong> ${a.main_process || ''}</p>
        <p style="font-size:11px; color:#999;">Laatst gewijzigd: ${new Date(a.updated_at).toLocaleDateString('nl-NL')}</p>
      </div>
      <div class="actions">
        <button onclick="openAnalysis('${a.id}')">Openen</button>
        <button onclick="deleteAnalysis('${a.id}')" style="background-color:#e53e3e;">Verwijderen</button>
      </div>
    </div>
  `).join('')
}

// ================================
// ANALYSE AANMAKEN
// ================================

async function createAnalysis() {
  const name = document.getElementById('new-name').value
  const description = document.getElementById('new-description').value
  const main_process = document.getElementById('new-process').value
  const errorEl = document.getElementById('new-analysis-error')

  errorEl.textContent = ''

  if (!name) {
    errorEl.textContent = 'Naam is verplicht.'
    return
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('risk_analyses')
    .insert({ user_id: user.id, name, description, main_process })

  if (error) {
    errorEl.textContent = 'Opslaan mislukt. Probeer opnieuw.'
  } else {
    document.getElementById('new-name').value = ''
    document.getElementById('new-description').value = ''
    document.getElementById('new-process').value = ''
    loadDashboard()
  }
}

// ================================
// ANALYSE VERWIJDEREN
// ================================

async function deleteAnalysis(id) {
  if (!confirm('Weet je zeker dat je deze analyse wilt verwijderen?')) return

  const { error } = await supabase
    .from('risk_analyses')
    .delete()
    .eq('id', id)

  if (!error) loadDashboard()
}

// ================================
// ANALYSE OPENEN
// ================================

let currentAnalysisId = null

async function openAnalysis(id) {
  currentAnalysisId = id

  const { data: analysis } = await supabase
    .from('risk_analyses')
    .select('*')
    .eq('id', id)
    .single()

  document.getElementById('detail-name').textContent = analysis.name
  document.getElementById('detail-description').textContent = analysis.description || ''
  document.getElementById('detail-process').textContent = analysis.main_process || ''

  showPage('page-detail')
  loadRisks()
}

// ================================
// RISICO FORMULIER TONEN/VERBERGEN
// ================================

function showAddRisk() {
  document.getElementById('add-risk-form').classList.remove('hidden')
}

function hideAddRisk() {
  document.getElementById('add-risk-form').classList.add('hidden')
}

// ================================
// RISICO'S LADEN
// ================================

async function loadRisks() {
  const { data: risks, error } = await supabase
    .from('risks')
    .select('*')
    .eq('analysis_id', currentAnalysisId)
    .order('score', { ascending: false })

  const list = document.getElementById('risks-list')

  if (error) {
    list.innerHTML = '<p class="error">Fout bij laden van risicos.</p>'
    return
  }

  if (risks.length === 0) {
    list.innerHTML = '<p>Nog geen risicos toegevoegd.</p>'
    return
  }

  list.innerHTML = `
    <table class="risks-table">
      <thead>
        <tr>
          <th>Component</th>
          <th>Scenario</th>
          <th>Kans</th>
          <th>Impact</th>
          <th>Score</th>
          <th>Behandeling</th>
          <th>Maatregelen</th>
          <th>Notities</th>
          <th>Actie</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map(r => `
          <tr>
            <td>${r.component}</td>
            <td>${r.scenario}</td>
            <td>${r.likelihood}</td>
            <td>${r.impact}</td>
            <td class="${scoreClass(r.score)}">${r.score}</td>
            <td>${r.treatment}</td>
            <td>${r.measures || ''}</td>
            <td>${r.notes || ''}</td>
            <td><button onclick="deleteRisk('${r.id}')" style="background-color:#e53e3e;">Verwijderen</button></td>
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

// ================================
// RISICO OPSLAAN
// ================================

async function saveRisk() {
  const component = document.getElementById('risk-component').value
  const scenario = document.getElementById('risk-scenario').value
  const likelihood = parseInt(document.getElementById('risk-likelihood').value)
  const impact = parseInt(document.getElementById('risk-impact').value)
  const treatment = document.getElementById('risk-treatment').value
  const measures = document.getElementById('risk-measures').value
  const notes = document.getElementById('risk-notes').value
  const errorEl = document.getElementById('risk-error')

  errorEl.textContent = ''

  if (!component || !scenario) {
    errorEl.textContent = 'Component en scenario zijn verplicht.'
    return
  }

  const { error } = await supabase
    .from('risks')
    .insert({
      analysis_id: currentAnalysisId,
      component,
      scenario,
      likelihood,
      impact,
      treatment,
      measures,
      notes
    })

  if (error) {
    errorEl.textContent = 'Opslaan mislukt. Probeer opnieuw.'
  } else {
    document.getElementById('risk-component').value = ''
    document.getElementById('risk-scenario').value = ''
    document.getElementById('risk-measures').value = ''
    document.getElementById('risk-notes').value = ''
    hideAddRisk()
    loadRisks()
  }
}

// ================================
// RISICO VERWIJDEREN
// ================================

async function deleteRisk(id) {
  if (!confirm('Weet je zeker dat je dit risico wilt verwijderen?')) return

  const { error } = await supabase
    .from('risks')
    .delete()
    .eq('id', id)

  if (!error) loadRisks()
}

// ================================
// APP STARTEN
// ================================

init()
