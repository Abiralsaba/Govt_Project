/**
 * Reports & Analytics JavaScript
 * Admin Dashboard with Approve/Reject functionality
 */

// Use admin token instead of regular token
const adminToken = localStorage.getItem('adminToken');
const adminName = localStorage.getItem('adminName') || 'Admin';

// Redirect to admin login if not authenticated
if (!adminToken) {
    window.location.href = 'admin-login.html';
}

// Current tab
let currentTab = 'overview';

// Data caches
let allServiceRequests = [];
let allLandMutations = [];
let allCommunityGroups = [];
let allCommunityPosts = [];

// =====================
// UTILITY FUNCTIONS
// =====================

// API helper with admin token
async function fetchAdminAPI(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`/api/admin/${endpoint}`, options);
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminName');
            window.location.href = 'admin-login.html';
            return null;
        }
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    } catch (err) {
        console.error('Admin API Error:', err);
        return null;
    }
}

// API helper for reports endpoints
async function fetchReportsAPI(endpoint) {
    try {
        const res = await fetch(`/api/reports/${endpoint}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    } catch (err) {
        console.error('Reports API Error:', err);
        return null;
    }
}

// Format number
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat().format(num);
}

// Format currency
function formatCurrency(num) {
    if (num === null || num === undefined) return '৳0';
    return '৳' + new Intl.NumberFormat().format(Math.round(num));
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
}

// Get status badge HTML
function getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    return `<span class="status-badge ${s}">${status || 'Pending'}</span>`;
}

// Get tier badge class
function getTierBadge(tier) {
    const tierLower = (tier || '').toLowerCase().replace(' ', '-');
    return `<span class="badge ${tierLower}">${tier}</span>`;
}

// Get rank badge
function getRankBadge(rank) {
    let cls = 'default';
    if (rank === 1) cls = 'gold';
    else if (rank === 2) cls = 'silver';
    else if (rank === 3) cls = 'bronze';
    return `<span class="rank-badge ${cls}">${rank}</span>`;
}

// Logout
function adminLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    window.location.href = 'admin-login.html';
}

// =====================
// MODAL FUNCTIONS
// =====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on backdrop click
document.querySelectorAll('.admin-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.admin-modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// =====================
// TAB NAVIGATION
// =====================

function showTab(tab) {
    currentTab = tab;

    // Hide all sections
    ['overview', 'users', 'services', 'land', 'community', 'audit'].forEach(t => {
        const el = document.getElementById(t + '-section');
        if (el) el.style.display = 'none';
    });

    // Update nav
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    event.target.closest('a')?.classList.add('active');

    // Show selected section
    const section = document.getElementById(tab + '-section');
    if (section) section.style.display = 'block';

    // Load data for tab
    loadTabData(tab);
}

async function loadTabData(tab) {
    switch (tab) {
        case 'overview': loadOverview(); break;
        case 'users': loadUsers(); break;
        case 'services': loadServices(); break;
        case 'land': loadLand(); break;
        case 'community': loadCommunity(); break;
        case 'audit': loadAudit(); break;
    }
}

// =====================
// OVERVIEW TAB - CLICKABLE STATS
// =====================

async function loadOverview() {
    const summary = await fetchReportsAPI('summary');
    if (summary) {
        document.getElementById('summaryStats').innerHTML = `
            <div class="stat-card clickable" onclick="showUsersModal()">
                <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                <div class="stat-value">${formatNumber(summary.total_users)}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card clickable" onclick="showServiceRequestsModal()">
                <div class="stat-icon green"><i class="fas fa-tasks"></i></div>
                <div class="stat-value">${formatNumber(summary.total_service_requests)}</div>
                <div class="stat-label">Service Requests</div>
            </div>
            <div class="stat-card clickable" onclick="showLandMutationsModal()">
                <div class="stat-icon purple"><i class="fas fa-map"></i></div>
                <div class="stat-value">${formatNumber(summary.total_land_mutations)}</div>
                <div class="stat-label">Land Mutations</div>
            </div>
            <div class="stat-card clickable" onclick="showCommunityGroupsModal()">
                <div class="stat-icon orange"><i class="fas fa-users-cog"></i></div>
                <div class="stat-value">${formatNumber(summary.total_community_groups)}</div>
                <div class="stat-label">Community Groups</div>
            </div>
            <div class="stat-card clickable" onclick="showCommunityPostsModal()">
                <div class="stat-icon pink"><i class="fas fa-comment"></i></div>
                <div class="stat-value">${formatNumber(summary.total_posts)}</div>
                <div class="stat-label">Community Posts</div>
            </div>
            <div class="stat-card clickable" onclick="showNewUsersModal()">
                <div class="stat-icon cyan"><i class="fas fa-user-plus"></i></div>
                <div class="stat-value">${formatNumber(summary.recent_activity?.new_users_7d || 0)}</div>
                <div class="stat-label">New Users (7 days)</div>
            </div>
        `;
    }

    // Load pivot table
    const pivot = await fetchReportsAPI('service-pivot');
    if (pivot && pivot.data) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Service Type</th>
                    <th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>May</th><th>Jun</th>
                    <th>Jul</th><th>Aug</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dec</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>`;

        pivot.data.forEach(row => {
            const isTotal = row.service_type?.includes('TOTAL');
            html += `<tr class="${isTotal ? 'total-row' : ''}">
                <td>${row.service_type || 'Unknown'}</td>
                <td>${row.Jan || 0}</td><td>${row.Feb || 0}</td><td>${row.Mar || 0}</td>
                <td>${row.Apr || 0}</td><td>${row.May || 0}</td><td>${row.Jun || 0}</td>
                <td>${row.Jul || 0}</td><td>${row.Aug || 0}</td><td>${row.Sep || 0}</td>
                <td>${row.Oct || 0}</td><td>${row.Nov || 0}</td><td>${row.Dec || 0}</td>
                <td><strong>${row.Total || 0}</strong></td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('servicePivotTable').innerHTML = html;
    }

    // Load division performance
    const divisions = await fetchReportsAPI('division-performance');
    if (divisions && divisions.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Division</th>
                    <th>Districts</th>
                    <th>Upazilas</th>
                    <th>Mutations</th>
                    <th>Pending</th>
                    <th>Total Value</th>
                    <th>Avg Value</th>
                    <th>% of Total</th>
                    <th>Value Rank</th>
                </tr>
            </thead>
            <tbody>`;

        divisions.forEach(row => {
            html += `<tr>
                <td><strong>${row.division_name}</strong></td>
                <td>${row.district_count}</td>
                <td>${row.upazila_count}</td>
                <td>${row.total_mutations}</td>
                <td>${row.pending_mutations}</td>
                <td>${formatCurrency(row.total_land_value)}</td>
                <td>${formatCurrency(row.avg_land_value)}</td>
                <td>${row.pct_of_total_mutations || 0}%</td>
                <td>${getRankBadge(row.value_rank)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('divisionPerformance').innerHTML = html;
    }
}

// =====================
// USERS MODAL
// =====================

async function showUsersModal() {
    openModal('usersModal');
    const users = await fetchAdminAPI('users');
    if (users) {
        document.getElementById('usersCount').textContent = users.length;
        let html = `<div class="table-responsive"><table class="modal-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>NID</th>
                    <th>Mobile</th>
                    <th>Gender</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>`;

        users.forEach(user => {
            html += `<tr>
                <td>${user.id}</td>
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td>${user.nid || '-'}</td>
                <td>${user.mobile || '-'}</td>
                <td>${user.gender || '-'}</td>
                <td>${formatDate(user.created_at)}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        document.getElementById('usersModalBody').innerHTML = html;
    }
}

async function showNewUsersModal() {
    openModal('newUsersModal');
    const users = await fetchAdminAPI('new-users');
    if (users) {
        document.getElementById('newUsersCount').textContent = users.length;
        let html = `<div class="table-responsive"><table class="modal-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>`;

        users.forEach(user => {
            html += `<tr>
                <td>${user.id}</td>
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td>${user.mobile || '-'}</td>
                <td>${formatDate(user.created_at)}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        document.getElementById('newUsersModalBody').innerHTML = html;
    }
}

// =====================
// SERVICE REQUESTS MODAL
// =====================

async function showServiceRequestsModal() {
    openModal('serviceRequestsModal');
    allServiceRequests = await fetchAdminAPI('service-requests') || [];
    document.getElementById('serviceRequestsCount').textContent = allServiceRequests.length;
    renderServiceRequests(allServiceRequests);
}

function filterServiceRequests(status) {
    // Update filter buttons
    document.querySelectorAll('#serviceRequestsModal .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === status ||
            (status === 'all' && btn.textContent === 'All'));
    });

    const filtered = status === 'all'
        ? allServiceRequests
        : allServiceRequests.filter(r => r.status === status);
    renderServiceRequests(filtered);
}

function renderServiceRequests(requests) {
    let html = `<div class="table-responsive"><table class="modal-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>User</th>
                <th>Service Type</th>
                <th>Details</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    requests.forEach(req => {
        const isPending = req.status === 'pending';
        html += `<tr>
            <td>${req.id}</td>
            <td><strong>${req.user_name || 'N/A'}</strong><div style="font-size:0.8rem;color:#64748b;">${req.user_email || ''}</div></td>
            <td>${req.service_type}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${req.details || '-'}</td>
            <td>${getStatusBadge(req.status)}</td>
            <td>${formatDate(req.created_at)}</td>
            <td class="action-cell">
                ${isPending ? `
                    <button class="action-btn approve" onclick="approveServiceRequest(${req.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject" onclick="rejectServiceRequest(${req.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : '-'}
            </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    document.getElementById('serviceRequestsModalBody').innerHTML = html;
}

async function approveServiceRequest(id) {
    const result = await fetchAdminAPI(`service-requests/${id}/approve`, 'PUT');
    if (result?.success) {
        Swal.fire({ icon: 'success', title: 'Approved!', timer: 1500, showConfirmButton: false });
        showServiceRequestsModal();
        loadOverview();
    }
}

async function rejectServiceRequest(id) {
    const { value: reason } = await Swal.fire({
        title: 'Reject Request',
        input: 'textarea',
        inputLabel: 'Reason for rejection (optional)',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
        const result = await fetchAdminAPI(`service-requests/${id}/reject`, 'PUT', { reason });
        if (result?.success) {
            Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
            showServiceRequestsModal();
            loadOverview();
        }
    }
}

// =====================
// LAND MUTATIONS MODAL
// =====================

async function showLandMutationsModal() {
    openModal('landMutationsModal');
    allLandMutations = await fetchAdminAPI('land-mutations') || [];
    document.getElementById('landMutationsCount').textContent = allLandMutations.length;
    renderLandMutations(allLandMutations);
}

function filterLandMutations(status) {
    document.querySelectorAll('#landMutationsModal .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === status ||
            (status === 'all' && btn.textContent === 'All'));
    });

    const filtered = status === 'all'
        ? allLandMutations
        : allLandMutations.filter(m => m.status === status);
    renderLandMutations(filtered);
}

function renderLandMutations(mutations) {
    let html = `<div class="table-responsive"><table class="modal-table">
        <thead>
            <tr>
                <th>Tracking #</th>
                <th>Applicant</th>
                <th>Buyer</th>
                <th>Location</th>
                <th>Khatian/Dag</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    mutations.forEach(m => {
        const isPending = m.status === 'Pending';
        html += `<tr>
            <td><code>${m.tracking_number}</code></td>
            <td><strong>${m.applicant_name || 'N/A'}</strong></td>
            <td>${m.buyer_name || '-'}</td>
            <td>${m.division_name || ''} > ${m.district_name || ''}</td>
            <td>${m.khatian_no} / ${m.dag_no}</td>
            <td>${formatCurrency(m.land_price)}</td>
            <td>${getStatusBadge(m.status)}</td>
            <td class="action-cell">
                ${isPending ? `
                    <button class="action-btn approve" onclick="approveLandMutation(${m.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject" onclick="rejectLandMutation(${m.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : '-'}
            </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    document.getElementById('landMutationsModalBody').innerHTML = html;
}

async function approveLandMutation(id) {
    const confirm = await Swal.fire({
        title: 'Approve Mutation?',
        text: 'This will transfer land ownership from seller to buyer.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        confirmButtonColor: '#10b981'
    });

    if (confirm.isConfirmed) {
        const result = await fetchAdminAPI(`land-mutations/${id}/approve`, 'PUT');
        if (result?.success) {
            Swal.fire({ icon: 'success', title: 'Approved!', text: 'Land ownership transferred.', timer: 2000, showConfirmButton: false });
            showLandMutationsModal();
            loadOverview();
        }
    }
}

async function rejectLandMutation(id) {
    const { value: reason } = await Swal.fire({
        title: 'Reject Mutation',
        input: 'textarea',
        inputLabel: 'Reason for rejection (optional)',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
        const result = await fetchAdminAPI(`land-mutations/${id}/reject`, 'PUT', { reason });
        if (result?.success) {
            Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
            showLandMutationsModal();
            loadOverview();
        }
    }
}

// =====================
// COMMUNITY GROUPS MODAL
// =====================

async function showCommunityGroupsModal() {
    openModal('communityGroupsModal');
    allCommunityGroups = await fetchAdminAPI('community-groups') || [];
    document.getElementById('communityGroupsCount').textContent = allCommunityGroups.length;
    renderCommunityGroups(allCommunityGroups);
}

function filterCommunityGroups(status) {
    document.querySelectorAll('#communityGroupsModal .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === status ||
            (status === 'all' && btn.textContent === 'All'));
    });

    const filtered = status === 'all'
        ? allCommunityGroups
        : allCommunityGroups.filter(g => g.status === status);
    renderCommunityGroups(filtered);
}

function renderCommunityGroups(groups) {
    let html = `<div class="table-responsive"><table class="modal-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Creator</th>
                <th>Members</th>
                <th>Posts</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    groups.forEach(g => {
        const isPending = g.status === 'pending';
        html += `<tr>
            <td>${g.id}</td>
            <td><strong>${g.name}</strong></td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.description || '-'}</td>
            <td>${g.creator_name || 'N/A'}</td>
            <td>${g.member_count || 0}</td>
            <td>${g.post_count || 0}</td>
            <td>${getStatusBadge(g.status)}</td>
            <td class="action-cell">
                ${isPending ? `
                    <button class="action-btn approve" onclick="approveCommunityGroup(${g.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject" onclick="rejectCommunityGroup(${g.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : '-'}
            </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    document.getElementById('communityGroupsModalBody').innerHTML = html;
}

async function approveCommunityGroup(id) {
    const result = await fetchAdminAPI(`community-groups/${id}/approve`, 'PUT');
    if (result?.success) {
        Swal.fire({ icon: 'success', title: 'Approved!', timer: 1500, showConfirmButton: false });
        showCommunityGroupsModal();
        loadOverview();
    }
}

async function rejectCommunityGroup(id) {
    const { value: reason } = await Swal.fire({
        title: 'Reject Group',
        input: 'textarea',
        inputLabel: 'Reason for rejection (optional)',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
        const result = await fetchAdminAPI(`community-groups/${id}/reject`, 'PUT', { reason });
        if (result?.success) {
            Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
            showCommunityGroupsModal();
            loadOverview();
        }
    }
}

// =====================
// COMMUNITY POSTS MODAL
// =====================

async function showCommunityPostsModal() {
    openModal('communityPostsModal');
    allCommunityPosts = await fetchAdminAPI('community-posts') || [];
    document.getElementById('communityPostsCount').textContent = allCommunityPosts.length;
    renderCommunityPosts(allCommunityPosts);
}

function filterCommunityPosts(status) {
    document.querySelectorAll('#communityPostsModal .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === status ||
            (status === 'all' && btn.textContent === 'All'));
    });

    const filtered = status === 'all'
        ? allCommunityPosts
        : allCommunityPosts.filter(p => p.status === status);
    renderCommunityPosts(filtered);
}

function renderCommunityPosts(posts) {
    let html = `<div class="table-responsive"><table class="modal-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Content</th>
                <th>Author</th>
                <th>Group</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    posts.forEach(p => {
        const isPending = p.status === 'pending';
        const contentPreview = (p.content || '').substring(0, 80) + ((p.content || '').length > 80 ? '...' : '');
        html += `<tr>
            <td>${p.id}</td>
            <td style="max-width:250px;">${contentPreview}</td>
            <td>${p.author_name || 'N/A'}</td>
            <td>${p.group_name || '-'}</td>
            <td>${p.like_count || 0}</td>
            <td>${p.comment_count || 0}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td class="action-cell">
                ${isPending ? `
                    <button class="action-btn approve" onclick="approveCommunityPost(${p.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject" onclick="rejectCommunityPost(${p.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : '-'}
            </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    document.getElementById('communityPostsModalBody').innerHTML = html;
}

async function approveCommunityPost(id) {
    const result = await fetchAdminAPI(`community-posts/${id}/approve`, 'PUT');
    if (result?.success) {
        Swal.fire({ icon: 'success', title: 'Approved!', timer: 1500, showConfirmButton: false });
        showCommunityPostsModal();
        loadOverview();
    }
}

async function rejectCommunityPost(id) {
    const { value: reason } = await Swal.fire({
        title: 'Reject Post',
        input: 'textarea',
        inputLabel: 'Reason for rejection (optional)',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
        const result = await fetchAdminAPI(`community-posts/${id}/reject`, 'PUT', { reason });
        if (result?.success) {
            Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
            showCommunityPostsModal();
            loadOverview();
        }
    }
}

// =====================
// OTHER TABS (User Analytics, Services, Land, Community, Audit)
// =====================

async function loadUsers() {
    const engagement = await fetchReportsAPI('user-engagement-scores');
    if (engagement && engagement.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Logins</th>
                    <th>Posts</th>
                    <th>Comments</th>
                    <th>Groups</th>
                    <th>Score</th>
                    <th>Quartile</th>
                    <th>Percentile</th>
                    <th>Tier</th>
                </tr>
            </thead>
            <tbody>`;

        engagement.forEach(row => {
            html += `<tr>
                <td>${getRankBadge(row.rank_position)}</td>
                <td>
                    <strong>${row.name}</strong>
                    <div style="font-size: 0.8rem; color: #64748b;">${row.email}</div>
                </td>
                <td>${row.login_count}</td>
                <td>${row.post_count}</td>
                <td>${row.comment_count}</td>
                <td>${row.group_count}</td>
                <td><strong>${row.engagement_score}</strong></td>
                <td>Q${row.quartile}</td>
                <td>${row.percentile}%</td>
                <td>${getTierBadge(row.user_tier)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('userEngagementTable').innerHTML = html;
    }

    const activity = await fetchReportsAPI('user-activity');
    if (activity && activity.distribution) {
        let html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">`;

        activity.distribution.forEach(item => {
            html += `
                <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px;">
                    ${getTierBadge(item.user_tier)}
                    <div style="font-size: 1.5rem; font-weight: 700; color: white; margin-top: 0.5rem;">${item.count}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">users</div>
                </div>
            `;
        });

        html += '</div>';
        document.getElementById('userTierDistribution').innerHTML = html;
    }
}

async function loadServices() {
    const running = await fetchReportsAPI('running-totals?days=30');
    if (running && running.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Service Type</th>
                    <th>Daily Count</th>
                    <th>Running Total</th>
                    <th>Daily Rank</th>
                    <th>% of Daily</th>
                </tr>
            </thead>
            <tbody>`;

        running.slice(0, 30).forEach(row => {
            html += `<tr>
                <td>${formatDate(row.request_date)}</td>
                <td>${row.service_type}</td>
                <td>${row.daily_count}</td>
                <td><strong>${row.running_total}</strong></td>
                <td>${getRankBadge(row.daily_rank)}</td>
                <td>${row.pct_of_daily}%</td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('runningTotalsTable').innerHTML = html;
    }

    const dashboard = await fetchReportsAPI('service-dashboard?days=14');
    if (dashboard && dashboard.data) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                    <th>Approval Rate</th>
                </tr>
            </thead>
            <tbody>`;

        dashboard.data.slice(0, 20).forEach(row => {
            html += `<tr>
                <td>${formatDate(row.request_date)}</td>
                <td>${row.service_type}</td>
                <td>${row.total_requests}</td>
                <td>${row.pending_count}</td>
                <td style="color: #34d399;">${row.approved_count}</td>
                <td style="color: #f87171;">${row.rejected_count}</td>
                <td>${row.approval_rate}%</td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('serviceDashboardTable').innerHTML = html;
    }
}

async function loadLand() {
    const rollup = await fetchReportsAPI('land-rollup');
    if (rollup && rollup.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Division</th>
                    <th>District</th>
                    <th>Total Mutations</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Rejected</th>
                    <th>Total Value</th>
                    <th>Avg Value</th>
                </tr>
            </thead>
            <tbody>`;

        rollup.forEach(row => {
            const isTotal = row.division?.includes('TOTAL') || row.district?.includes('Total');
            html += `<tr class="${isTotal ? 'total-row' : ''}">
                <td><strong>${row.division}</strong></td>
                <td>${row.district}</td>
                <td>${row.total_mutations}</td>
                <td style="color: #34d399;">${row.approved}</td>
                <td style="color: #fbbf24;">${row.pending}</td>
                <td style="color: #f87171;">${row.rejected}</td>
                <td>${formatCurrency(row.total_value)}</td>
                <td>${formatCurrency(row.avg_value)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('landRollupTable').innerHTML = html;
    }

    const landLoc = await fetchReportsAPI('land-by-location');
    if (landLoc && landLoc.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Division</th>
                    <th>District</th>
                    <th>Upazila</th>
                    <th>Mutations</th>
                    <th>Approved</th>
                    <th>Total Value</th>
                </tr>
            </thead>
            <tbody>`;

        landLoc.slice(0, 30).forEach(row => {
            if (row.total_mutations > 0) {
                html += `<tr>
                    <td>${row.division || '-'}</td>
                    <td>${row.district || '-'}</td>
                    <td>${row.upazila || '-'}</td>
                    <td>${row.total_mutations}</td>
                    <td>${row.approved_mutations}</td>
                    <td>${formatCurrency(row.total_transaction_value)}</td>
                </tr>`;
            }
        });

        html += '</tbody></table>';
        document.getElementById('landByLocationTable').innerHTML = html;
    }
}

async function loadCommunity() {
    const analytics = await fetchReportsAPI('community-analytics');
    if (analytics && analytics.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Group</th>
                    <th>Created By</th>
                    <th>Members</th>
                    <th>Posts</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    <th>Score</th>
                    <th>Size</th>
                </tr>
            </thead>
            <tbody>`;

        analytics.forEach(row => {
            html += `<tr>
                <td><strong>${row.group_name}</strong></td>
                <td>${row.created_by_name}</td>
                <td>${row.member_count}</td>
                <td>${row.total_posts}</td>
                <td style="color: #f472b6;">${row.total_likes}</td>
                <td style="color: #60a5fa;">${row.total_comments}</td>
                <td><strong>${row.engagement_score}</strong></td>
                <td><span class="badge regular">${row.group_size_category}</span></td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('communityAnalyticsTable').innerHTML = html;
    }

    const performers = await fetchReportsAPI('top-group-performers');
    if (performers && performers.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Group</th>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Posts</th>
                    <th>Comments</th>
                    <th>Likes</th>
                    <th>Total Activity</th>
                </tr>
            </thead>
            <tbody>`;

        performers.forEach(row => {
            html += `<tr>
                <td>${row.group_name}</td>
                <td>${getRankBadge(row.rank_in_group)}</td>
                <td><strong>${row.user_name}</strong></td>
                <td>${row.post_count}</td>
                <td>${row.comment_count}</td>
                <td>${row.like_count}</td>
                <td><strong>${row.total_activity}</strong></td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('topPerformersTable').innerHTML = html;
    }
}

async function loadAudit() {
    const audit = await fetchReportsAPI('audit-log?limit=50');
    if (audit && audit.length) {
        let html = `<table class="report-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Table</th>
                    <th>Record ID</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Changes</th>
                </tr>
            </thead>
            <tbody>`;

        audit.forEach(row => {
            const actionColor = row.action === 'INSERT' ? '#34d399' :
                row.action === 'UPDATE' ? '#fbbf24' : '#f87171';

            let changes = '';
            if (row.changed_fields) {
                changes = row.changed_fields;
            } else if (row.new_values) {
                try {
                    const vals = typeof row.new_values === 'string' ?
                        JSON.parse(row.new_values) : row.new_values;
                    changes = Object.keys(vals).slice(0, 3).join(', ');
                } catch (e) { }
            }

            html += `<tr>
                <td>${new Date(row.action_timestamp).toLocaleString()}</td>
                <td><code>${row.table_name}</code></td>
                <td>${row.record_id}</td>
                <td style="color: ${actionColor};"><strong>${row.action}</strong></td>
                <td>${row.user_name || '-'}</td>
                <td style="color: #94a3b8; font-size: 0.85rem;">${changes || '-'}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('auditLogTable').innerHTML = html;
    } else {
        document.getElementById('auditLogTable').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <p>No audit entries yet. Changes to tables with triggers will appear here.</p>
            </div>
        `;
    }
}

// =====================
// INITIALIZATION
// =====================

document.addEventListener('DOMContentLoaded', () => {
    loadOverview();
});
