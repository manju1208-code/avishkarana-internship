<-- day 8-->
/* ═══════════════════════════════════════════
   TASKNEST — script.js
═══════════════════════════════════════════ */

// ── STATE ──
let tasks = JSON.parse(localStorage.getItem('tasknest_tasks') || '[]');
let editingId = null;
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';

const SUBJECT_ICONS = {
  'General': '📌', 'Math': '🔢', 'Science': '🔬',
  'English': '📖', 'History': '🏛️', 'Computer Science': '💻',
  'Art': '🎨', 'Other': '📂'
};

const STATUS_LABELS = { todo: '📋 To Do', inprogress: '⚡ In Progress', done: '✅ Done' };

// ── PERSIST ──
function save() {
  localStorage.setItem('tasknest_tasks', JSON.stringify(tasks));
}

// ── GENERATE ID ──
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── OVERVIEW ──
function updateOverview() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const pending   = tasks.filter(t => t.status !== 'done').length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById('totalCount').textContent     = total;
  document.getElementById('completedCount').textContent = completed;
  document.getElementById('pendingCount').textContent   = pending;
  document.getElementById('progressPercent').textContent = pct + '%';
  document.getElementById('progressBar').style.width    = pct + '%';

  // Subject breakdown
  const subjectMap = {};
  tasks.forEach(t => {
    subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1;
  });
  const grid = document.getElementById('subjectGrid');
  grid.innerHTML = '';
  if (!Object.keys(subjectMap).length) {
    grid.innerHTML = '<p class="empty-msg">No tasks yet.</p>';
    return;
  }
  Object.entries(subjectMap).sort((a, b) => b[1] - a[1]).forEach(([subj, count]) => {
    const chip = document.createElement('div');
    chip.className = 'subject-chip';
    chip.innerHTML = `<span class="chip-name">${SUBJECT_ICONS[subj] || '📂'} ${subj}</span>
                      <span class="chip-count">${count}</span>`;
    grid.appendChild(chip);
  });
}

// ── RENDER TASKS ──
function getFilteredSorted() {
  let list = [...tasks];

  // search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q)
    );
  }

  // filter
  if (currentFilter !== 'all') list = list.filter(t => t.status === currentFilter);

  // sort
  const PRIORITY_ORDER = { High: 0, Mid: 1, Low: 2 };
  if (currentSort === 'newest')   list.sort((a, b) => b.createdAt - a.createdAt);
  if (currentSort === 'oldest')   list.sort((a, b) => a.createdAt - b.createdAt);
  if (currentSort === 'priority') list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  if (currentSort === 'duedate')  list.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return list;
}

function renderTasks() {
  const list = getFilteredSorted();
  const container = document.getElementById('taskList');
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><span>🌿</span><p>No tasks found. Add one above!</p></div>`;
    return;
  }

  list.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.status === 'done' ? ' done-card' : '');
    card.dataset.id = task.id;

    const checked = task.status === 'done';
    const dueFmt  = task.dueDate ? new Date(task.dueDate + 'T00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '';
    const nextStatus = { todo: 'inprogress', inprogress: 'done', done: 'todo' };

    card.innerHTML = `
      <div class="task-check ${checked ? 'checked' : ''}" data-action="toggle" data-id="${task.id}"></div>
      <div class="task-body">
        <span class="task-name ${checked ? 'strikethrough' : ''}">${escHtml(task.name)}</span>
        <div class="task-meta">
          <span class="meta-pill">${SUBJECT_ICONS[task.subject] || '📂'} ${task.subject}</span>
          <span class="meta-pill priority-${task.priority.toLowerCase()}">${task.priority}</span>
          ${dueFmt ? `<span class="meta-pill">📅 ${dueFmt}</span>` : ''}
          <span class="status-badge" data-action="cycle" data-id="${task.id}" title="Click to advance status">
            ${STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="act-btn" data-action="edit"   data-id="${task.id}" title="Edit">✏️</button>
        <button class="act-btn delete" data-action="delete" data-id="${task.id}" title="Delete">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── ADD TASK ──
function addTask() {
  const name    = document.getElementById('taskInput').value.trim();
  const subject = document.getElementById('subjectInput').value;
  const dueDate = document.getElementById('dueDateInput').value;
  const priority = document.querySelector('input[name="priority"]:checked')?.value || 'Low';

  if (!name) {
    document.getElementById('taskInput').focus();
    document.getElementById('taskInput').style.borderColor = 'var(--red)';
    setTimeout(() => document.getElementById('taskInput').style.borderColor = '', 1000);
    return;
  }

  tasks.unshift({ id: uid(), name, subject, dueDate, priority, status: 'todo', createdAt: Date.now() });
  save();
  render();

  // reset
  document.getElementById('taskInput').value = '';
  document.getElementById('dueDateInput').value = '';
  document.querySelector('input[name="priority"][value="Low"]').checked = true;
}

// ── TASK ACTIONS (delegation) ──
document.getElementById('taskList').addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;

  if (action === 'toggle') {
    const t = tasks.find(t => t.id === id);
    if (t) t.status = t.status === 'done' ? 'todo' : 'done';
    save(); render();
  }
  if (action === 'cycle') {
    const t = tasks.find(t => t.id === id);
    const next = { todo: 'inprogress', inprogress: 'done', done: 'todo' };
    if (t) t.status = next[t.status];
    save(); render();
  }
  if (action === 'delete') {
    if (confirm('Delete this task?')) {
      tasks = tasks.filter(t => t.id !== id);
      save(); render();
    }
  }
  if (action === 'edit') openEdit(id);
});

// ── EDIT MODAL ──
function openEdit(id) {
  editingId = id;
  const t = tasks.find(t => t.id === id);
  if (!t) return;

  document.getElementById('editTaskInput').value  = t.name;
  document.getElementById('editSubjectInput').value = t.subject;
  document.getElementById('editDueDateInput').value = t.dueDate || '';
  const radio = document.querySelector(`input[name="editPriority"][value="${t.priority}"]`);
  if (radio) radio.checked = true;

  document.getElementById('editModal').classList.add('open');
}

function closeEdit() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

document.getElementById('cancelEditBtn').addEventListener('click', closeEdit);
document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeEdit();
});

document.getElementById('saveEditBtn').addEventListener('click', () => {
  const t = tasks.find(t => t.id === editingId);
  if (!t) return;

  const name = document.getElementById('editTaskInput').value.trim();
  if (!name) return;

  t.name     = name;
  t.subject  = document.getElementById('editSubjectInput').value;
  t.dueDate  = document.getElementById('editDueDateInput').value;
  t.priority = document.querySelector('input[name="editPriority"]:checked')?.value || t.priority;

  save(); closeEdit(); render();
});

// ── FILTERS & SORT ──
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

document.getElementById('sortSelect').addEventListener('change', e => {
  currentSort = e.target.value;
  renderTasks();
});

// ── SEARCH ──
document.getElementById('searchToggle').addEventListener('click', () => {
  const bar = document.getElementById('searchBar');
  bar.classList.toggle('open');
  if (bar.classList.contains('open')) document.getElementById('searchInput').focus();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderTasks();
});

// ── MOBILE MENU ──
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mobileDrawer').classList.toggle('open');
});

// sync mobile nav buttons
document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-view="${btn.dataset.view}"]`).forEach(b => b.classList.add('active'));
    // close drawer on mobile
    document.getElementById('mobileDrawer').classList.remove('open');
  });
});

// ── ADD BUTTON ──
document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// ── RENDER ALL ──
function render() {
  updateOverview();
  renderTasks();
}

render();
