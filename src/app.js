
// ===== DATA STORE =====
let currentUser = null;
let selectedMood = 3;
let selectedIntensity = 'light';
let chartInstances = {};

function getUsers() { return JSON.parse(localStorage.getItem('detox_users') || '{}'); }
function saveUsers(u) { localStorage.setItem('detox_users', JSON.stringify(u)); }
function getLogs() { return JSON.parse(localStorage.getItem('detox_logs_' + currentUser) || '[]'); }
function saveLogs(l) { localStorage.setItem('detox_logs_' + currentUser, JSON.stringify(l)); }

// ===== AUTH =====
function showSignup() { document.getElementById('loginForm').classList.add('hidden'); document.getElementById('signupForm').classList.remove('hidden'); }
function showLogin() { document.getElementById('signupForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); }

function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  if (!email || !pass) return showToast('Please fill all fields', 'error');
  const users = getUsers();
  if (email === 'demo@detox.com' && pass === 'demo123') {
    if (!users[email]) users[email] = { name: 'Demo User', pass: 'demo123' };
    saveUsers(users);
  }
  if (!users[email] || users[email].pass !== pass) return showToast('Invalid credentials', 'error');
  currentUser = email;
  document.getElementById('userGreeting').textContent = 'Hi, ' + users[email].name;
  document.getElementById('profileName').textContent = users[email].name;
  document.getElementById('profileEmail').textContent = email;
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  seedDemoData();
  loadDashboard();
  showToast('Welcome back!', 'success');
}

function signup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPassword').value;
  if (!name || !email || !pass) return showToast('Please fill all fields', 'error');
  const users = getUsers();
  if (users[email]) return showToast('Account already exists', 'error');
  users[email] = { name, pass };
  saveUsers(users);
  showToast('Account created! Please sign in.', 'success');
  showLogin();
}

function logout() {
  currentUser = null;
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
}

// ===== TABS =====
function switchTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-menu li').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (el) el.classList.add('active');
  const titles = { dashboard:'Dashboard', log:'Log Usage', analysis:'Analysis', detoxplan:'Detox Plan', profile:'Profile' };
  document.getElementById('pageTitle').textContent = titles[tab] || '';
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'analysis') loadAnalysis();
  if (tab === 'profile') loadProfile();
  if (tab === 'log') { document.getElementById('logDate').value = new Date().toISOString().split('T')[0]; }
}

// ===== SEED DEMO DATA =====
function seedDemoData() {
  const logs = getLogs();
  if (logs.length > 0) return;
  const cats = ['Social Media','Entertainment','Work/Productivity','Gaming','Education','Communication'];
  const apps = ['Instagram','YouTube','VS Code','Fortnite','Coursera','WhatsApp','Twitter','Netflix','Slack','TikTok'];
  const demo = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      demo.push({
        date: d.toISOString().split('T')[0],
        hours: +(1 + Math.random() * 4).toFixed(1),
        category: cats[Math.floor(Math.random() * cats.length)],
        app: apps[Math.floor(Math.random() * apps.length)],
        mood: 1 + Math.floor(Math.random() * 5),
        productivity: 1 + Math.floor(Math.random() * 10),
        health: ['Eye Strain','Headache','Poor Sleep','None'][Math.floor(Math.random()*4)].split(','),
        notes: ''
      });
    }
  }
  saveLogs(demo);
}

// ===== DASHBOARD =====
function loadDashboard() {
  const logs = getLogs();
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === today);
  const totalToday = todayLogs.reduce((s, l) => s + l.hours, 0);
  document.getElementById('statTotalHours').textContent = totalToday.toFixed(1);
  document.getElementById('statSessions').textContent = logs.length;
  const uniqueDays = [...new Set(logs.map(l => l.date))].sort();
  let streak = 0;
  for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate()-i); if(uniqueDays.includes(d.toISOString().split('T')[0])) streak++; else break; }
  document.getElementById('statStreak').textContent = streak;
  const avgHours = logs.length ? logs.reduce((s,l)=>s+l.hours,0)/uniqueDays.length : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - avgHours * 8)));
  document.getElementById('statScore').textContent = score;

  // Weekly chart
  const last7 = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); last7.push(d.toISOString().split('T')[0]); }
  const weeklyData = last7.map(day => logs.filter(l=>l.date===day).reduce((s,l)=>s+l.hours,0));
  const weekLabels = last7.map(d => { const dt=new Date(d); return dt.toLocaleDateString('en',{weekday:'short'}); });
  destroyChart('weeklyChart');
  chartInstances['weeklyChart'] = new Chart(document.getElementById('weeklyChart'), {
    type:'line', data:{ labels:weekLabels, datasets:[{ label:'Hours', data:weeklyData, borderColor:'#667eea', backgroundColor:'rgba(102,126,234,.2)', fill:true, tension:.4, pointBackgroundColor:'#764ba2' }] },
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,ticks:{color:'#888'},grid:{color:'#2a2a4a'}}, x:{ticks:{color:'#888'},grid:{display:false}} } }
  });

  // Category chart
  const catMap = {};
  logs.forEach(l => { catMap[l.category] = (catMap[l.category]||0) + l.hours; });
  const catColors = ['#667eea','#f5576c','#43e97b','#4facfe','#f093fb','#ffd93d','#ff6b6b','#38f9d7'];
  destroyChart('categoryChart');
  chartInstances['categoryChart'] = new Chart(document.getElementById('categoryChart'), {
    type:'doughnut', data:{ labels:Object.keys(catMap), datasets:[{ data:Object.values(catMap).map(v=>+v.toFixed(1)), backgroundColor:catColors }] },
    options:{ responsive:true, plugins:{ legend:{ position:'bottom', labels:{color:'#aaa',padding:10,font:{size:11}} } } }
  });

  // Mood chart
  const moodMap = {1:[], 2:[], 3:[], 4:[], 5:[]};
  logs.forEach(l => { if(moodMap[l.mood]) moodMap[l.mood].push(l.hours); });
  const moodLabels = ['😫','😟','😐','🙂','😄'];
  const moodAvg = [1,2,3,4,5].map(m => moodMap[m].length ? +(moodMap[m].reduce((a,b)=>a+b,0)/moodMap[m].length).toFixed(1) : 0);
  destroyChart('moodChart');
  chartInstances['moodChart'] = new Chart(document.getElementById('moodChart'), {
    type:'bar', data:{ labels:moodLabels, datasets:[{ label:'Avg Hours', data:moodAvg, backgroundColor:['#f5576c','#f093fb','#ffd93d','#4facfe','#43e97b'], borderRadius:8 }] },
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,ticks:{color:'#888'},grid:{color:'#2a2a4a'}}, x:{ticks:{color:'#888',font:{size:16}},grid:{display:false}} } }
  });

  // Recent logs
  const recent = logs.slice(-8).reverse();
  document.getElementById('recentLogs').innerHTML = recent.map(l =>
    `<div class="log-entry"><span>${l.date}</span><span class="log-cat">${l.category}</span><span class="log-hours">${l.hours}h</span></div>`
  ).join('') || '<p style="color:#666;text-align:center;padding:20px">No logs yet</p>';
}

function destroyChart(id) { if(chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

// ===== LOG USAGE =====
function selectMood(el) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedMood = parseInt(el.dataset.mood);
}

document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('logProductivity');
  if(slider) slider.addEventListener('input', () => { document.getElementById('prodValue').textContent = slider.value; });
});

function saveLog() {
  const date = document.getElementById('logDate').value;
  const hours = parseFloat(document.getElementById('logHours').value);
  const category = document.getElementById('logCategory').value;
  const app = document.getElementById('logApp').value.trim();
  if (!date || isNaN(hours) || !category) return showToast('Please fill required fields', 'error');
  const health = [...document.querySelectorAll('.checkbox-group input:checked')].map(c => c.value);
  const notes = document.getElementById('logNotes').value;
  const productivity = parseInt(document.getElementById('logProductivity').value);
  const logs = getLogs();
  logs.push({ date, hours, category, app, mood: selectedMood, productivity, health, notes });
  saveLogs(logs);
  showToast('Log saved successfully!', 'success');
  document.getElementById('logHours').value = '';
  document.getElementById('logCategory').value = '';
  document.getElementById('logApp').value = '';
  document.getElementById('logNotes').value = '';
  document.querySelectorAll('.checkbox-group input').forEach(c => c.checked = false);
}

// ===== ANALYSIS =====
function loadAnalysis() {
  const logs = getLogs();
  // Time drains
  const catMap = {};
  logs.forEach(l => { catMap[l.category] = (catMap[l.category]||0) + l.hours; });
  const sorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  const maxH = sorted.length ? sorted[0][1] : 1;
  document.getElementById('timeDrains').innerHTML = sorted.slice(0,5).map(([cat, hrs]) =>
    `<div class="drain-item"><span>${cat}</span><div class="drain-bar"><div class="drain-bar-fill" style="width:${(hrs/maxH*100).toFixed(0)}%"></div></div><span>${hrs.toFixed(1)}h</span></div>`
  ).join('') || '<p style="color:#666">No data yet</p>';

  // Health chart
  const healthMap = {};
  logs.forEach(l => { if(l.health) l.health.forEach(h => { if(h && h!=='None') healthMap[h] = (healthMap[h]||0)+1; }); });
  destroyChart('healthChart');
  const hColors = ['#f5576c','#f093fb','#ffd93d','#4facfe','#667eea'];
  chartInstances['healthChart'] = new Chart(document.getElementById('healthChart'), {
    type:'polarArea', data:{ labels:Object.keys(healthMap), datasets:[{ data:Object.values(healthMap), backgroundColor:hColors }] },
    options:{ responsive:true, plugins:{ legend:{ position:'bottom', labels:{color:'#aaa',font:{size:11}} } }, scales:{ r:{ticks:{display:false},grid:{color:'#2a2a4a'}} } }
  });

  // Insights
  const avgHours = logs.length ? (logs.reduce((s,l)=>s+l.hours,0)/logs.length).toFixed(1) : 0;
  const avgMood = logs.length ? (logs.reduce((s,l)=>s+l.mood,0)/logs.length).toFixed(1) : 0;
  const topCat = sorted.length ? sorted[0][0] : 'N/A';
  const insights = [
    `📊 Your average screen time per session is <strong>${avgHours} hours</strong>.`,
    `📱 Your biggest time drain is <strong>${topCat}</strong>. Consider setting app timers.`,
    `😊 Your average mood after screen time is <strong>${avgMood}/5</strong>. ${avgMood < 3 ? 'High screen time may be affecting your wellbeing.' : 'Keep maintaining a healthy balance!'}`,
    avgHours > 3 ? '⚠️ You average over 3 hours per session. Try the Pomodoro technique for breaks.' : '✅ Good job keeping sessions under 3 hours!',
    Object.keys(healthMap).length > 2 ? '🏥 Multiple health symptoms detected. Consider consulting an eye care specialist.' : '💪 Minimal health impacts reported. Keep it up!'
  ];
  document.getElementById('insights').innerHTML = insights.map(i => `<div class="insight-item">${i}</div>`).join('');

  // Productivity chart
  const last7 = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); last7.push(d.toISOString().split('T')[0]); }
  const prodData = last7.map(day => { const dl = logs.filter(l=>l.date===day); return dl.length ? +(dl.reduce((s,l)=>s+l.productivity,0)/dl.length).toFixed(1) : 0; });
  destroyChart('productivityChart');
  chartInstances['productivityChart'] = new Chart(document.getElementById('productivityChart'), {
    type:'line', data:{ labels:last7.map(d=>{const dt=new Date(d);return dt.toLocaleDateString('en',{weekday:'short'})}), datasets:[{ label:'Productivity', data:prodData, borderColor:'#43e97b', backgroundColor:'rgba(67,233,123,.15)', fill:true, tension:.4, pointBackgroundColor:'#38f9d7' }] },
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,max:10,ticks:{color:'#888'},grid:{color:'#2a2a4a'}}, x:{ticks:{color:'#888'},grid:{display:false}} } }
  });
}

// ===== DETOX PLAN =====
function selectIntensity(level, el) {
  selectedIntensity = level;
  document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function generatePlan() {
  const plans = {
    light: {
      title: '🌿 Light Detox Plan (20% Reduction)',
      days: [
        { day:'Mon', content:'Limit social media to 30 min. Take a 10-min walk during lunch.' },
        { day:'Tue', content:'No phones during meals. Try reading a physical book for 20 min.' },
        { day:'Wed', content:'Turn off non-essential notifications. Do a 15-min meditation.' },
        { day:'Thu', content:'Set a 1-hour "phone-free" block in the evening.' },
        { day:'Fri', content:'Replace 30 min of scrolling with a hobby activity.' },
        { day:'Sat', content:'Morning without screens until 9 AM. Go for a nature walk.' },
        { day:'Sun', content:'Digital sabbath morning — screens off until noon.' },
      ],
      tips: ['Use grayscale mode to reduce phone appeal','Set app timers for social media','Keep phone out of bedroom at night']
    },
    moderate: {
      title: '⚖️ Moderate Detox Plan (40% Reduction)',
      days: [
        { day:'Mon', content:'Max 2 hours recreational screen time. Morning exercise instead of scrolling.' },
        { day:'Tue', content:'No social media until after lunch. Journal for 15 min.' },
        { day:'Wed', content:'Screen-free evening from 7 PM. Board games or cooking.' },
        { day:'Thu', content:'Delete one time-wasting app. Replace with outdoor activity.' },
        { day:'Fri', content:'Use website blockers during work hours. Evening yoga/stretching.' },
        { day:'Sat', content:'Half-day digital detox (morning). Visit a friend or go outdoors.' },
        { day:'Sun', content:'Full digital detox until 4 PM. Creative activities only.' },
      ],
      tips: ['Use a physical alarm clock instead of phone','Batch check emails 3x per day only','Create a charging station outside your bedroom']
    },
    intensive: {
      title: '🔥 Intensive Detox Plan (60% Reduction)',
      days: [
        { day:'Mon', content:'Max 1 hour total recreational screens. Morning run or gym.' },
        { day:'Tue', content:'Social media only 15 min. Learn a new offline skill.' },
        { day:'Wed', content:'No screens after 6 PM. Cook a new recipe from a cookbook.' },
        { day:'Thu', content:'Work-only screen use. All entertainment is offline.' },
        { day:'Fri', content:'Leave phone at home for errands. Connect face-to-face.' },
        { day:'Sat', content:'Full digital detox day. Nature hike, art, or sports.' },
        { day:'Sun', content:'Screens only for essential communication. Read, craft, or garden.' },
      ],
      tips: ['Get a physical watch to avoid checking phone for time','Use paper planner instead of phone calendar','Tell friends about your detox for accountability']
    },
    minimalist: {
      title: '🧘 Digital Minimalist Plan (Essentials Only)',
      days: [
        { day:'Mon', content:'Screens only for work/essential calls. All leisure is offline.' },
        { day:'Tue', content:'Remove all social media apps. Use only for direct messages if needed.' },
        { day:'Wed', content:'No screens outside work hours. Start a physical journal practice.' },
        { day:'Thu', content:'Use a basic phone if possible. Focus on deep work and creativity.' },
        { day:'Fri', content:'Digital tools only when they serve a clear purpose. Minimize browsing.' },
        { day:'Sat', content:'Complete tech-free day. Reconnect with nature and people.' },
        { day:'Sun', content:'Reflect on the week. Plan next week with paper and pen.' },
      ],
      tips: ['Consider a "dumb phone" for weekends','Replace streaming with library books','Practice 20-20-20 rule: every 20 min, look 20 ft away for 20 sec']
    }
  };
  const plan = plans[selectedIntensity];
  const el = document.getElementById('detoxPlanResult');
  el.classList.remove('hidden');
  el.innerHTML = `
    <h3>${plan.title}</h3>
    <div class="plan-schedule">${plan.days.map(d => `<div class="plan-day"><div class="day-label">${d.day}</div><div class="day-content">${d.content}</div></div>`).join('')}</div>
    <div class="plan-tips"><h4><i class="fas fa-lightbulb"></i> Pro Tips</h4>${plan.tips.map(t => `<div class="tip-item"><i class="fas fa-check-circle"></i>${t}</div>`).join('')}</div>
  `;
  showToast('Detox plan generated!', 'success');
}

// ===== PROFILE =====
function loadProfile() {
  const logs = getLogs();
  document.getElementById('pTotalLogs').textContent = logs.length;
  const totalH = logs.reduce((s,l)=>s+l.hours,0);
  document.getElementById('pTotalHours').textContent = totalH.toFixed(1);
  const avgMood = logs.length ? (logs.reduce((s,l)=>s+l.mood,0)/logs.length).toFixed(1) : '-';
  document.getElementById('pAvgMood').textContent = avgMood + '/5';
}

function exportCSV() {
  const logs = getLogs();
  if (!logs.length) return showToast('No data to export', 'error');
  let csv = 'Date,Hours,Category,App,Mood,Productivity,Health,Notes\n';
  logs.forEach(l => {
    csv += `${l.date},${l.hours},${l.category},${l.app},${l.mood},${l.productivity},"${(l.health||[]).join('; ')}","${l.notes||''}"\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'detox_data.csv'; a.click();
  showToast('CSV exported!', 'success');
}

function clearData() {
  if (!confirm('Are you sure you want to clear all your data?')) return;
  localStorage.removeItem('detox_logs_' + currentUser);
  loadDashboard();
  showToast('All data cleared', 'success');
}

// ===== TOAST =====
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => { t.classList.remove('show'); }, 3000);
}
