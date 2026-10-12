import { Route, Routes } from 'react-router';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/request" element={<PlaceholderPage role="customer" title="Get help" />} />
      <Route
        path="/tech/profile"
        element={<PlaceholderPage role="technician" title="Your profile" />}
      />
      <Route path="/admin" element={<PlaceholderPage role="admin" title="Admin dashboard" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
