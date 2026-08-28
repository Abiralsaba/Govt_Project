import { Navigate, Route, Routes } from 'react-router-dom';
import LegacyPageHandoff from './components/LegacyPageHandoff.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import ContactPage from './features/contact/ContactPage.jsx';
import DocumentsPage from './features/documents/DocumentsPage.jsx';
import EventsPage from './features/events/EventsPage.jsx';
import HistoryPage from './features/history/HistoryPage.jsx';
import MarketPage from './features/market/MarketPage.jsx';
import ProfilePage from './features/profile/ProfilePage.jsx';
import { AdminGuard, CitizenGuard } from './routes/guards.jsx';

const citizenLegacyRoutes = [
  'todo.html', 'nid.html', 'passport.html', 'tax.html', 'health.html',
  'water.html', 'land.html', 'agriculture.html', 'education.html',
  'community.html', 'shop.html'
];

const adminLegacyRoutes = [
  'reports.html', 'admin-nid.html', 'admin-passport.html',
  'admin-health.html', 'admin-water.html'
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/index.html" element={<LoginPage />} />
      <Route path="/register.html" element={<RegisterPage />} />
      <Route path="/forgot-password.html" element={<ForgotPasswordPage />} />
      <Route path="/admin-login.html" element={<Navigate to="/index.html#admin" replace />} />
      <Route path="/dashboard.html" element={<CitizenGuard><DashboardPage /></CitizenGuard>} />
      <Route path="/profile.html" element={<CitizenGuard><ProfilePage /></CitizenGuard>} />
      <Route path="/documents.html" element={<CitizenGuard><DocumentsPage /></CitizenGuard>} />
      <Route path="/history.html" element={<CitizenGuard><HistoryPage /></CitizenGuard>} />
      <Route path="/events.html" element={<CitizenGuard><EventsPage /></CitizenGuard>} />
      <Route path="/contact.html" element={<CitizenGuard><ContactPage /></CitizenGuard>} />
      <Route path="/market.html" element={<CitizenGuard><MarketPage /></CitizenGuard>} />

      {/* Public university/payment flows remain on the controlled legacy rollback path until their batch. */}
      <Route path="/admission.html" element={<LegacyPageHandoff />} />
      <Route path="/apply.html" element={<LegacyPageHandoff />} />

      {citizenLegacyRoutes.map(path => (
        <Route path={`/${path}`} element={<CitizenGuard><LegacyPageHandoff /></CitizenGuard>} key={path} />
      ))}
      {adminLegacyRoutes.map(path => (
        <Route path={`/${path}`} element={<AdminGuard><LegacyPageHandoff /></AdminGuard>} key={path} />
      ))}

      <Route path="*" element={<Navigate to="/index.html" replace />} />
    </Routes>
  );
}
