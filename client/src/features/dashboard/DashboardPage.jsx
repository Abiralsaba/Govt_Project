import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import RouteLoading from '../../components/RouteLoading.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStylesheets } from '../../hooks/useStylesheets.js';
import { apiRequest } from '../../services/api.js';
import { alerts } from '../../utils/alerts.js';
import ServiceRequestModal from './ServiceRequestModal.jsx';

const navigation = [
  ['documents.html', 'folder', 'My Documents'],
  ['history.html', 'history', 'History'],
  ['todo.html', 'tasks', 'To Do'],
  ['community.html', 'users', 'Community'],
  ['market.html', 'chart-line', 'Market Info'],
  ['events.html', 'bullhorn', 'Notices'],
  ['education.html', 'graduation-cap', 'Education'],
  ['contact.html', 'envelope', 'Contact']
];

function resolveAssetUrl(value) {
  if (!value) return '';
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  return `/${value}`;
}

export default function DashboardPage() {
  useStylesheets(['/css/style.css', '/css/sidebar.css']);
  const navigate = useNavigate();
  const { clearCitizenSession } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serviceModal, setServiceModal] = useState(false);
  const [collectionModal, setCollectionModal] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const [summary, departmentRows] = await Promise.all([
        apiRequest('/api/dashboard/summary'),
        apiRequest('/api/dashboard/departments')
      ]);
      setDashboard(summary);
      setDepartments(departmentRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  function logout() {
    clearCitizenSession();
    navigate('/index.html', { replace: true });
  }

  async function openCollection(type) {
    const config = {
      active: ['Active Requests', '/api/dashboard/services/active'],
      completed: ['Completed Tasks', '/api/dashboard/services/completed'],
      notifications: ['Notifications', '/api/dashboard/notifications']
    }[type];
    setCollectionModal({ type, title: config[0], rows: [] });
    setCollectionLoading(true);
    try {
      const rows = await apiRequest(config[1]);
      setCollectionModal({ type, title: config[0], rows });
    } catch (requestError) {
      setCollectionModal({ type, title: config[0], rows: [], error: requestError.message });
    } finally {
      setCollectionLoading(false);
    }
  }

  async function readNotification(notification) {
    await alerts.success('Notification', notification.message);
    if (!notification.is_read) {
      await apiRequest(`/api/dashboard/notifications/${notification.id}/read`, { method: 'PUT' });
      setCollectionModal(current => ({
        ...current,
        rows: current.rows.map(row => row.id === notification.id ? { ...row, is_read: 1 } : row)
      }));
      loadDashboard();
    }
  }

  if (loading) return <RouteLoading label="Loading citizen dashboard…" />;

  const user = dashboard?.user || {};
  const stats = dashboard?.stats || {};

  return (
    <>
      <div className="bg-shape shape-1" /><div className="bg-shape shape-2" />
      <button className="react-sidebar-toggle" type="button" aria-label="Toggle navigation" onClick={() => setSidebarOpen(value => !value)}><i className="fas fa-bars" /></button>
      {sidebarOpen && <button className="react-sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <div className="dashboard-container">
        <aside className={`sidebar ${sidebarOpen ? 'react-sidebar-open' : ''}`}>
          <Link className="user-profile" to="/profile.html" onClick={() => setSidebarOpen(false)}>
            <div className="user-avatar">{user.photo_url ? <img src={resolveAssetUrl(user.photo_url)} alt="Citizen profile" /> : <i className="fas fa-user" />}</div>
            <h3>{user.name || 'Citizen'}</h3><p>NID: {user.nid || '—'}</p>
          </Link>
          <nav className="nav-links">
            <Link className="active" to="/dashboard.html"><i className="fas fa-home" /> Dashboard</Link>
            {navigation.map(([path, icon, label]) => <Link to={`/${path}`} key={path} onClick={() => setSidebarOpen(false)}><i className={`fas fa-${icon}`} /> {label}</Link>)}
            <button className="react-nav-button" type="button" onClick={logout}><i className="fas fa-sign-out-alt" /> Logout</button>
          </nav>
        </aside>

        <main className="main-content">
          <div className="react-dashboard-header"><div><h1>Citizen Dashboard</h1><p>Welcome to the Digital Bangladesh Portal</p></div><button className="btn-primary react-request-button" type="button" onClick={() => setServiceModal(true)}><i className="fas fa-plus" /> New Request</button></div>
          {error && <div className="react-dashboard-error" role="alert">{error}<button type="button" onClick={loadDashboard}>Retry</button></div>}

          <div className="react-dashboard-grid">
            <button className="card react-stat-card" type="button" onClick={() => openCollection('active')}><h3 className="green">Active Requests</h3><strong>{stats.activeRequests || 0}</strong><span>Pending Review</span></button>
            <button className="card react-stat-card" type="button" onClick={() => openCollection('completed')}><h3 className="blue">Completed Tasks</h3><strong>{stats.completedTasks || 0}</strong><span>Approved Applications</span></button>
            <button className="card react-stat-card" type="button" onClick={() => openCollection('notifications')}><h3 className="pink">Notifications</h3><strong>{stats.notifications || 0}</strong><span>Unread Messages</span></button>
          </div>

          <section className="react-departments"><h2>Govt Departments</h2><div className="react-dept-grid">{departments.map(department => <a className="react-dept-card" href={`/${department.link}`} key={department.link}><i className={`fas ${department.icon}`} /><h4>{department.name}</h4><p>{department.desc}</p></a>)}</div></section>
        </main>
      </div>

      {serviceModal && <ServiceRequestModal onClose={() => setServiceModal(false)} onSubmitted={loadDashboard} />}
      {collectionModal && (
        <Modal title={collectionModal.title} onClose={() => setCollectionModal(null)}>
          {collectionLoading ? <RouteLoading label={`Loading ${collectionModal.title.toLowerCase()}…`} /> : (
            <Collection type={collectionModal.type} rows={collectionModal.rows} error={collectionModal.error} onNotification={readNotification} />
          )}
        </Modal>
      )}
    </>
  );
}

function Collection({ type, rows, error, onNotification }) {
  if (error) return <div className="react-dashboard-error" role="alert">{error}</div>;
  if (!rows.length) return <p className="react-empty-state">No records found.</p>;

  if (type === 'notifications') {
    return <div className="react-collection-list">{rows.map(row => <button className={row.is_read ? 'read' : 'unread'} type="button" key={row.id} onClick={() => onNotification(row)}><i className="fas fa-bell" /><span>{row.message}<small>{new Date(row.created_at).toLocaleString()}</small></span></button>)}</div>;
  }

  return (
    <div className="react-table-wrap"><table><thead><tr><th>Service</th><th>Details / ID</th><th>Status</th><th>Date</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.service_type}</td><td>{row.details || row.unique_number || '—'}</td><td><span className={`react-status ${String(row.status).toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.created_at || row.completed_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
  );
}
