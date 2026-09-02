const state = {
    jobs: [],
    user: null,
    theme: localStorage.getItem('jobflow-theme') || 'dark'
};

const statusOrder = ['Applied', 'Interviewing', 'Offer', 'Rejected'];
const chartColors = {
    Applied: '#4da3ff',
    Interviewing: '#fbbf24',
    Offer: '#34d399',
    Rejected: '#f87171'
};

const form = document.getElementById('jobForm');
const jobList = document.getElementById('jobList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const focusAddJob = document.getElementById('focusAddJob');
const exportBtn = document.getElementById('exportBtn');
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const welcomeName = document.getElementById('welcomeName');
const userBadge = document.getElementById('userBadge');
const statusChart = document.getElementById('statusChart');
const chartTotal = document.getElementById('chartTotal');
const recentApplicationsList = document.getElementById('recentApplicationsList');
const upcomingList = document.getElementById('upcomingList');
const resumeList = document.getElementById('resumeList');
const calendarList = document.getElementById('calendarList');
const analyticsList = document.getElementById('analyticsList');

const formatStatus = (status) => status.toLowerCase();

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('jobflow-user'));
    } catch {
        return null;
    }
}

function setStoredUser(user) {
    if (user) {
        localStorage.setItem('jobflow-user', JSON.stringify(user));
    } else {
        localStorage.removeItem('jobflow-user');
    }
}

function applyTheme() {
    document.body.classList.toggle('light-mode', state.theme === 'light');
    localStorage.setItem('jobflow-theme', state.theme);
    themeToggle.textContent = state.theme === 'light' ? 'Dark' : 'Light';
}

function ensureAuth() {
    const storedUser = getStoredUser();
    if (!storedUser) {
        state.user = {
            email: 'guest@jobflow.local',
            displayName: 'Guest User'
        };
        setStoredUser(state.user);
    } else {
        state.user = storedUser;
    }

    authModal.classList.add('hidden');
    authModal.classList.remove('visible');
    welcomeName.textContent = `${state.user.displayName}'s dashboard`;
    userBadge.textContent = state.user.email;
    return true;
}

async function fetchJobs() {
    try {
        const response = await fetch('/api/jobs');
        const jobs = await response.json();
        state.jobs = Array.isArray(jobs) ? jobs : [];
        render();
    } catch (error) {
        console.error('Failed to load jobs:', error);
        state.jobs = [];
        render();
    }
}

async function readPdfFile(file) {
    if (!file) {
        return {};
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Please upload a PDF resume only.');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            resumeName: file.name,
            resumeData: String(reader.result)
        });
        reader.onerror = () => reject(new Error('Unable to read the selected PDF.'));
        reader.readAsDataURL(file);
    });
}

async function createJob(payload) {
    const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Unable to save job');
    }

    const newJob = await response.json();
    state.jobs = [newJob, ...state.jobs];
    form.reset();
    const resumeInput = document.getElementById('resumeUpload');
    if (resumeInput) {
        resumeInput.value = '';
    }
    render();
}

async function deleteJob(id) {
    const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error('Unable to delete job');
    }

    state.jobs = state.jobs.filter(job => job.id !== id);
    render();
}

async function updateJob(id, nextData) {
    const response = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextData)
    });

    if (!response.ok) {
        throw new Error('Unable to update job');
    }

    const updated = await response.json();
    state.jobs = state.jobs.map(job => (job.id === id ? updated : job));
    render();
}

function getFilteredJobs() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const statusValue = statusFilter.value;

    return state.jobs.filter(job => {
        const matchesSearch = !searchTerm ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.role.toLowerCase().includes(searchTerm);

        const matchesStatus = statusValue === 'all' || job.status === statusValue;
        return matchesSearch && matchesStatus;
    });
}

function renderChart() {
    const total = state.jobs.length;
    chartTotal.textContent = `${total} total`;

    statusChart.innerHTML = statusOrder.map(status => {
        const count = state.jobs.filter(job => job.status === status).length;
        const height = total ? Math.max(18, (count / total) * 100) : 18;
        return `
            <div class="chart-segment">
                <div class="chart-bar" style="height:${height}%; background:${chartColors[status]};"></div>
                <div class="chart-label">${count}</div>
                <div class="chart-label">${status}</div>
            </div>
        `;
    }).join('');
}

function renderStats() {
    const total = state.jobs.length;
    const interviewing = state.jobs.filter(job => job.status === 'Interviewing').length;
    const offers = state.jobs.filter(job => job.status === 'Offer').length;
    const rejected = state.jobs.filter(job => job.status === 'Rejected').length;

    document.getElementById('totalApplications').textContent = total;
    document.getElementById('interviewingCount').textContent = interviewing;
    document.getElementById('offerCount').textContent = offers;
    document.getElementById('rejectedCount').textContent = rejected;

    const monthLabel = total > 0 ? `+${Math.max(2, Math.round(total / 2))} this month` : '+0 this month';
    document.getElementById('totalTrend').textContent = monthLabel;

    const health = offers > 0 || interviewing >= 2 ? 'Strong' : 'Building';
    document.getElementById('pipelineHealth').textContent = health;

    const responseHours = Math.max(2, Math.round((total || 1) * 1.7));
    document.getElementById('avgResponse').textContent = `${responseHours} days`;
}

function renderJobs() {
    const filteredJobs = getFilteredJobs();

    if (!filteredJobs.length) {
        jobList.innerHTML = `
            <div class="empty-state">
                <h3>No matches found</h3>
                <p>Try a different search or add a new job to your pipeline.</p>
            </div>
        `;
        return;
    }

    jobList.innerHTML = filteredJobs.map(job => `
        <article class="job-card" data-id="${job.id}">
            <div class="job-main">
                <div class="role-header">
                    <h3>${job.role}</h3>
                    <span class="status-pill ${formatStatus(job.status)}">${job.status}</span>
                </div>

                <p class="company-row">
                    <strong>${job.company}</strong>
                    <span>•</span>
                    <span>${job.location || 'Remote'}</span>
                    <span>•</span>
                    <span class="priority-pill ${job.priority.toLowerCase()}">${job.priority}</span>
                </p>

                <div class="job-meta">
                    <span>Source: ${job.source || 'Unknown'}</span>
                    <span>Salary: ${job.salary || 'Negotiable'}</span>
                    <span>Applied: ${job.appliedDate || 'N/A'}</span>
                </div>

                <p class="job-notes">${job.notes || 'No notes yet — add a reminder or prep task.'}</p>
            </div>

            <div class="job-actions">
                <button class="action-btn" type="button" data-action="advance" data-id="${job.id}">Advance</button>
                <button class="action-btn" type="button" data-action="edit" data-id="${job.id}">Edit</button>
                <button class="action-btn delete-btn" type="button" data-action="delete" data-id="${job.id}">Delete</button>
            </div>
        </article>
    `).join('');
}

function buildResumeUsage() {
    const resumeMap = new Map();

    state.jobs.forEach(job => {
        const label = job.resumeName || (job.source && /linkedin|wellfound|referral|company/i.test(job.source)
            ? 'Tailored resume'
            : 'Primary resume');

        if (!resumeMap.has(label)) {
            resumeMap.set(label, { label, count: 0 });
        }

        resumeMap.get(label).count += 1;
    });

    return Array.from(resumeMap.values()).slice(0, 3);
}

function buildUpcomingEvents() {
    return state.jobs
        .map(job => {
            const baseDate = new Date(job.appliedDate || new Date());
            const eventDate = new Date(baseDate);
            const status = job.status || 'Applied';

            if (status === 'Interviewing') {
                eventDate.setDate(baseDate.getDate() + 7);
                return {
                    title: `${job.company} interview`,
                    date: eventDate,
                    type: 'Interview',
                    role: job.role
                };
            }

            if (status === 'Offer') {
                eventDate.setDate(baseDate.getDate() + 10);
                return {
                    title: `${job.company} offer follow-up`,
                    date: eventDate,
                    type: 'Follow-up',
                    role: job.role
                };
            }

            if (status === 'Rejected') {
                eventDate.setDate(baseDate.getDate() + 3);
                return {
                    title: `${job.company} application review`,
                    date: eventDate,
                    type: 'Follow-up',
                    role: job.role
                };
            }

            eventDate.setDate(baseDate.getDate() + 5);
            return {
                title: `${job.company} follow-up`,
                date: eventDate,
                type: 'Follow-up',
                role: job.role
            };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
}

function renderDashboardExtras() {
    const recentJobs = [...state.jobs]
        .sort((a, b) => new Date(b.appliedDate || '2000-01-01') - new Date(a.appliedDate || '2000-01-01'))
        .slice(0, 4);

    recentApplicationsList.innerHTML = recentJobs.length
        ? recentJobs.map(job => `
            <li class="list-item">
                <div>
                    <strong>${job.company}</strong>
                    <span>${job.role}</span>
                </div>
                <small>${job.appliedDate || 'N/A'}</small>
            </li>
        `).join('')
        : '<li class="list-item empty-inline">No recent applications yet.</li>';

    const upcomingEvents = buildUpcomingEvents();
    upcomingList.innerHTML = upcomingEvents.length
        ? upcomingEvents.map(event => `
            <li class="list-item">
                <div>
                    <strong>${event.title}</strong>
                    <span>${event.role}</span>
                </div>
                <small>${event.date.toLocaleDateString()}</small>
            </li>
        `).join('')
        : '<li class="list-item empty-inline">No upcoming events scheduled.</li>';

    const resumes = buildResumeUsage();
    resumeList.innerHTML = resumes.length
        ? resumes.map(item => `
            <li class="list-item">
                <div>
                    <strong>${item.label}</strong>
                    <span>${item.count} applications</span>
                </div>
            </li>
        `).join('')
        : '<li class="list-item empty-inline">No resume data yet.</li>';

    calendarList.innerHTML = upcomingEvents.length
        ? upcomingEvents.map(event => `
            <div class="timeline-item">
                <div class="timeline-dot ${event.type.toLowerCase().replace('-', '')}"></div>
                <div class="timeline-content">
                    <strong>${event.title}</strong>
                    <span>${event.role}</span>
                    <small>${event.date.toLocaleDateString()}</small>
                </div>
            </div>
        `).join('')
        : '<div class="timeline-item empty-inline">No calendar events yet.</div>';

    const total = state.jobs.length || 1;
    const applied = state.jobs.filter(job => job.status === 'Applied').length;
    const interviewing = state.jobs.filter(job => job.status === 'Interviewing').length;
    const offers = state.jobs.filter(job => job.status === 'Offer').length;
    const rejected = state.jobs.filter(job => job.status === 'Rejected').length;
    const interviewRate = Math.round((interviewing / total) * 100);
    const offerRate = Math.round((offers / total) * 100);

    analyticsList.innerHTML = `
        <div class="analytics-section">
            <span>Applications by status</span>
            <div class="analytics-metric-row">
                <div><strong>${applied}</strong><small>Applied</small></div>
                <div><strong>${interviewing}</strong><small>Interviewing</small></div>
                <div><strong>${offers}</strong><small>Offers</small></div>
                <div><strong>${rejected}</strong><small>Rejected</small></div>
            </div>
        </div>
        <div class="analytics-section">
            <span>Applications over time</span>
            <div class="analytics-meter">
                <div class="meter-fill" style="width:${Math.min(100, total * 18)}%"></div>
            </div>
            <strong>${total} tracked applications</strong>
        </div>
        <div class="analytics-section">
            <span>Interview rate</span>
            <strong>${interviewRate}%</strong>
        </div>
        <div class="analytics-section">
            <span>Offer rate</span>
            <strong>${offerRate}%</strong>
        </div>
    `;
}

function render() {
    renderStats();
    renderChart();
    renderDashboardExtras();
    renderJobs();
}

function openEditModal(jobId) {
    const job = state.jobs.find(item => item.id === jobId);
    if (!job) return;

    editForm.id.value = job.id;
    editForm.company.value = job.company || '';
    editForm.role.value = job.role || '';
    editForm.status.value = job.status || 'Applied';
    editForm.priority.value = job.priority || 'Medium';
    editForm.location.value = job.location || '';
    editForm.salary.value = job.salary || '';
    editForm.notes.value = job.notes || '';

    editModal.classList.remove('hidden');
    editModal.classList.add('visible');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('visible');
}

function exportJobs() {
    const dataStr = JSON.stringify(state.jobs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jobflow-export.json';
    link.click();
    URL.revokeObjectURL(url);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const resumeFile = form.querySelector('input[name="resumeFile"]').files[0];
    const basePayload = Object.fromEntries(formData.entries());

    try {
        const resumeData = await readPdfFile(resumeFile);
        await createJob({ ...basePayload, ...resumeData });
    } catch (error) {
        alert(error.message);
    }
});

editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(editForm);
    const payload = Object.fromEntries(formData.entries());
    const { id, ...nextData } = payload;

    try {
        await updateJob(id, nextData);
        closeModal('editModal');
    } catch (error) {
        alert(error.message);
    }
});

jobList.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const jobId = target.dataset.id;
    const action = target.dataset.action;
    const job = state.jobs.find(item => item.id === jobId);

    if (!job) return;

    if (action === 'delete') {
        try {
            await deleteJob(jobId);
        } catch (error) {
            alert(error.message);
        }
        return;
    }

    if (action === 'edit') {
        openEditModal(jobId);
        return;
    }

    if (action === 'advance') {
        const statusOrder = ['Applied', 'Interviewing', 'Offer', 'Rejected'];
        const currentIndex = statusOrder.indexOf(job.status);
        const nextStatus = statusOrder[Math.min(currentIndex + 1, statusOrder.length - 1)];

        try {
            await updateJob(jobId, { status: nextStatus });
        } catch (error) {
            alert(error.message);
        }
    }
});

searchInput.addEventListener('input', render);
statusFilter.addEventListener('change', render);
focusAddJob.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.querySelector('input[name="company"]').focus();
});

exportBtn.addEventListener('click', exportJobs);
themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
});

logoutBtn.addEventListener('click', () => {
    setStoredUser(null);
    state.user = null;
    authModal.classList.remove('hidden');
    authModal.classList.add('visible');
    welcomeName.textContent = "Your dashboard";
    userBadge.textContent = 'Not signed in';
});

authForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(authForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email || !password) {
        alert('Please enter your email and password.');
        return;
    }

    const user = {
        email,
        displayName: email.split('@')[0].replace(/[._-]/g, ' ')
    };

    setStoredUser(user);
    state.user = user;
    ensureAuth();
    authForm.reset();
});

document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
        closeModal(button.dataset.close);
    });
});

applyTheme();
ensureAuth();
fetchJobs();
