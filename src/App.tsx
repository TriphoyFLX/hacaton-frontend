import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import AuthCallback from './components/AuthCallback';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SoundTokGate from './components/SoundTokGate';
import PwaInstallBanner from './components/PwaInstallBanner';
import PwaUninstallFeedbackModal from './components/PwaUninstallFeedbackModal';

const Landing = lazy(() => import('./pages/Landing'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Studio = lazy(() => import('./pages/Studio'));
const Feed = lazy(() => import('./pages/Feed'));
const Projects = lazy(() => import('./pages/Projects'));
const SoundTok = lazy(() => import('./pages/SoundTok'));
const SoundPage = lazy(() => import('./pages/SoundPage'));
const SoundRecordPage = lazy(() => import('./pages/SoundRecordPage'));
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
        <Route path="/" element={<Lazy><Landing variant="home" /></Lazy>} />
        <Route path="/online-studiya-zvukozapisi" element={<Lazy><Landing variant="studio" /></Lazy>} />
        <Route path="/zapisat-trek-online" element={<Lazy><Landing variant="record" /></Lazy>} />
        <Route path="/login" element={<Lazy><Login /></Lazy>} />
        <Route path="/register" element={<Lazy><Register /></Lazy>} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/offer" element={<Lazy><LegalPage docId="offer" /></Lazy>} />
        <Route path="/terms" element={<Lazy><LegalPage docId="offer" /></Lazy>} />
        <Route path="/privacy" element={<Lazy><LegalPage docId="privacy" /></Lazy>} />
        <Route path="/contacts" element={<Lazy><LegalPage docId="contacts" /></Lazy>} />
        <Route path="/refunds" element={<Lazy><LegalPage docId="refunds" /></Lazy>} />
        <Route path="/delivery" element={<Lazy><LegalPage docId="delivery" /></Lazy>} />
        <Route path="/service-delivery" element={<Lazy><LegalPage docId="delivery" /></Lazy>} />

        <Route path="/soundtok" element={<SoundTokGate />}>
          <Route index element={<Lazy><SoundTok /></Lazy>} />
        </Route>

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
          <Route path="soundtok/sound/:id" element={<Lazy><SoundPage /></Lazy>} />
          <Route path="soundtok/sound/:id/record" element={<Lazy><SoundRecordPage /></Lazy>} />
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
      <PwaUninstallFeedbackModal />
    </BrowserRouter>
  );
}

export default App;
