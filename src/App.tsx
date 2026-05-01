import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Layout from './components/Layout';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="studio" element={<Studio />} />
          <Route path="feed" element={<Feed />} />
          <Route path="projects" element={<Projects />} />
          <Route path="soundtok" element={<SoundTok />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:username" element={<PublicProfile />} />
          <Route path="chats" element={<Chats />} />
          <Route path="chats/:chatId" element={<ChatPage />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
