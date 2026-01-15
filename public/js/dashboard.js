// Check Auth
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// Fetch Dashboard Data
async function loadDashboard() {
    try {
        // Summary
        const res = await fetch('/api/dashboard/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (document.getElementById('userName')) document.getElementById('userName').textContent = data.user.name;
        if (document.getElementById('userNid')) document.getElementById('userNid').textContent = 'NID: ' + data.user.nid;
        if (document.getElementById('statRequests')) document.getElementById('statRequests').textContent = data.stats.activeRequests;
        if (document.getElementById('statTasks')) document.getElementById('statTasks').textContent = data.stats.completedTasks;
        if (document.getElementById('statNotifs')) document.getElementById('statNotifs').textContent = data.stats.notifications;

        // Departments
        const deptGrid = document.getElementById('deptGrid');
        if (deptGrid) {
            const deptRes = await fetch('/api/dashboard/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const depts = await deptRes.json();
            deptGrid.innerHTML = depts.map(d => `
            <div class="dept-card" onclick="openDeptService('${d.name}')">
                <i class="fas ${d.icon}"></i>
                <h4>${d.name}</h4>
                <p style="font-size:0.75rem; color:#94a3b8; margin-top:5px;">${d.desc}</p>
            </div>
        `).join('');
        }

        // Todos
        loadTodos();

    } catch (error) {
        console.error(error);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

// Kanban Logic
async function loadTodos() {
    const res = await fetch('/api/dashboard/todos', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const todos = await res.json();

    ['todo', 'progress', 'done'].forEach(status => {
        const container = document.getElementById(status);
        if (container) {
            container.innerHTML = '';
            todos.filter(t => t.status === status).forEach(t => {
                const el = document.createElement('div');
                el.className = 'kanban-item';
                el.setAttribute('data-id', t.id);
                el.innerHTML = `<span>${t.title}</span> <i class="fas fa-trash delete-task" onclick="deleteTask(${t.id}, event)"></i>`;
                container.appendChild(el);
            });
        }
    });

    // Initialize Sortable
    ['todo', 'progress', 'done'].forEach(id => {
        // Check if cached instance exists to avoid duplicates or memory leaks if called repeatedly? 
        // Actually Sortable.create is robust. But let's check if element exists first.
        const el = document.getElementById(id);
        if (el) {
            new Sortable(el, {
                group: 'shared',
                animation: 150,
                onEnd: function (evt) {
                    const itemEl = evt.item;
                    const newStatus = evt.to.id;
                    const id = itemEl.getAttribute('data-id');
                    updateTaskStatus(id, newStatus);
                }
            });
        }
    });
}

async function createTask() {
    const { value: title } = await Swal.fire({
        title: 'New Task',
        input: 'text',
        inputPlaceholder: 'Enter task title...',
        background: '#0f172a',
        color: '#fff',
        showCancelButton: true
    });

    if (title) {
        await fetch('/api/dashboard/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title })
        });
        loadTodos();
    }
}

async function updateTaskStatus(id, status) {
    await fetch(`/api/dashboard/todos/${id}/move`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });
    // Update stats subtly? For now just silent
}

async function deleteTask(id, event) {
    event.stopPropagation(); // prevent drag start
    const result = await Swal.fire({
        title: 'Delete?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        background: '#0f172a',
        color: '#fff'
    });

    if (result.isConfirmed) {
        await fetch(`/api/dashboard/todos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadTodos();
    }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

function openDeptService(name) {
    Swal.fire({
        title: name + ' Services',
        text: 'Select an action specifically for ' + name,
        input: 'select',
        inputOptions: {
            'correction': 'Request Correction / Modification',
            'new': 'New Application',
            'status': 'Check Status',
            'complain': 'File Complaint'
        },
        inputPlaceholder: 'Select a service',
        showCancelButton: true,
        background: '#0f172a',
        color: '#fff'
    }).then(async (result) => {
        if (result.value) {
            const { value: details } = await Swal.fire({
                input: 'textarea',
                inputLabel: 'Describe your request',
                inputPlaceholder: 'Type your detailed request here...',
                inputAttributes: {
                    'aria-label': 'Type your request here'
                },
                showCancelButton: true,
                background: '#0f172a', color: '#fff'
            });

            if (details) {
                // Submit Request
                await fetch('/api/dashboard/services/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ serviceType: `${name} - ${result.value}`, details })
                });
                Swal.fire({ icon: 'success', title: 'Submitted', background: '#0f172a', color: '#fff' });
                // We could refresh stats here if needed, but loadDashboard calls it all. 
                // Just refreshing stats part or whole dashboard?
                // For simplicity, re-calling loadDashboard to update stats.
                loadDashboard();
            }
        }
    });
}

function openServiceModal() {
    // Generic request
    Swal.fire({
        title: 'New Request',
        text: 'Choose Department',
        // For simplicity, just reusing logic or showing a simplified list
        footer: 'Click on a department icon below to start specific requests.'
    });
}

// Init
// Ensure DOM is ready? Script is usually at bottom of body, so it's fine.
loadDashboard();
