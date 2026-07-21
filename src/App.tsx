import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Dashboard from './components/Dashboard';
import Studio from './pages/Studio';
import Feed from './pages/Feed';
import Projects from './pages/Projects';
import SoundTok from './pages/SoundTok';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Chats from './pages/Chats';
import ChatPage from './pages/ChatPage';
import AdminPanel from './pages/AdminPanel';
import AI from './pages/AI';
import RapBattle from './pages/RapBattleNew';
import MIDI from './pages/MIDI';
import Landing from './pages/Landing';
import PresetsMarketplace from './pages/PresetsMarketplace';
import Pricing from './pages/Pricing';
import LegalPage from './pages/LegalPage';

function App() {
  return (
    <BrowserRouter>
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="studio" element={<Studio />} />
          <Route path="feed" element={<Feed />} />
          <Route path="projects" element={<Projects />} />
          <Route path="soundtok" element={<SoundTok />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:username" element={<PublicProfile />} />
          <Route path="chats" element={<Chats />} />
          <Route path="chats/:chatId" element={<ChatPage />} />
          <Route path="pricing" element={<Pricing />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route path="ai" element={<AI />} />
          <Route path="rap-battle" element={<RapBattle />} />
          <Route path="midi" element={<MIDI />} />
          <Route path="presets" element={<PresetsMarketplace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
