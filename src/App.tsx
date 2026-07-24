import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Landing from './pages/Landing';
import LegalPage from './pages/LegalPage';
import PwaInstallBanner from './components/PwaInstallBanner';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Studio = lazy(() => import('./pages/Studio'));
const Feed = lazy(() => import('./pages/Feed'));
const Projects = lazy(() => import('./pages/Projects'));
const SoundTok = lazy(() => import('./pages/SoundTok'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Chats = lazy(() => import('./pages/Chats'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AI = lazy(() => import('./pages/AI'));
const RapBattle = lazy(() => import('./pages/RapBattleNew'));
const MIDI = lazy(() => import('./pages/MIDI'));
const PresetsMarketplace = lazy(() => import('./pages/PresetsMarketplace'));
const Pricing = lazy(() => import('./pages/Pricing'));

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-400 text-sm">
      Загрузка…
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public SEO / marketing — crawlable without login */}
        <Route path="/" element={<Landing variant="home" />} />
        <Route path="/online-studiya-zvukozapisi" element={<Landing variant="studio" />} />
        <Route path="/zapisat-trek-online" element={<Landing variant="record" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Legal — public */}
        <Route path="/offer" element={<LegalPage docId="offer" />} />
        <Route path="/terms" element={<LegalPage docId="offer" />} />
        <Route path="/privacy" element={<LegalPage docId="privacy" />} />
        <Route path="/contacts" element={<LegalPage docId="contacts" />} />
        <Route path="/refunds" element={<LegalPage docId="refunds" />} />
        <Route path="/delivery" element={<LegalPage docId="delivery" />} />
        <Route path="/service-delivery" element={<LegalPage docId="delivery" />} />

        {/* Authenticated app shell */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Lazy><Dashboard /></Lazy>} />
          <Route path="studio" element={<Lazy><Studio /></Lazy>} />
          <Route path="feed" element={<Lazy><Feed /></Lazy>} />
          <Route path="projects" element={<Lazy><Projects /></Lazy>} />
          <Route path="soundtok" element={<Lazy><SoundTok /></Lazy>} />
          <Route path="profile" element={<Lazy><Profile /></Lazy>} />
          <Route path="profile/:username" element={<Lazy><PublicProfile /></Lazy>} />
          <Route path="chats" element={<Lazy><Chats /></Lazy>} />
          <Route path="chats/:chatId" element={<Lazy><ChatPage /></Lazy>} />
          <Route path="pricing" element={<Lazy><Pricing /></Lazy>} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <Lazy><AdminPanel /></Lazy>
              </AdminRoute>
            }
          />
          <Route path="ai" element={<Lazy><AI /></Lazy>} />
          <Route path="rap-battle" element={<Lazy><RapBattle /></Lazy>} />
          <Route path="midi" element={<Lazy><MIDI /></Lazy>} />
          <Route path="presets" element={<Lazy><PresetsMarketplace /></Lazy>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaInstallBanner />
    </BrowserRouter>
  );
}

export default App;
