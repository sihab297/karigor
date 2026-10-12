import { Route, Routes } from 'react-router';
import { RequireRole } from './auth/RequireRole';
import { AppLayout } from './components/AppLayout';
import ComingSoonPage from './pages/ComingSoonPage';
import AdminTechniciansPage from './pages/admin/AdminTechniciansPage';
import TechnicianProfilePage from './pages/technician/TechnicianProfilePage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireRole role="customer" />}>
        <Route element={<AppLayout />}>
          <Route
            path="/request"
            element={
              <ComingSoonPage
                title="Get help"
                description="Tell us what's wrong in Bangla or English, or add a photo."
              />
            }
          />
          <Route
            path="/bookings"
            element={
              <ComingSoonPage
                title="My bookings"
                description="Your bookings and their status will show up here."
              />
            }
          />
        </Route>
      </Route>

      <Route element={<RequireRole role="technician" />}>
        <Route element={<AppLayout />}>
          <Route
            path="/tech/jobs"
            element={
              <ComingSoonPage
                title="My jobs"
                description="New job requests, upcoming jobs and finished jobs."
              />
            }
          />
          <Route path="/tech/profile" element={<TechnicianProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route element={<AppLayout />}>
          <Route
            path="/admin"
            element={
              <ComingSoonPage
                title="Dashboard"
                description="Numbers about users, technicians and bookings."
              />
            }
          />
          <Route path="/admin/technicians" element={<AdminTechniciansPage />} />
          <Route
            path="/admin/catalog"
            element={
              <ComingSoonPage
                title="Services and prices"
                description="Edit skills, the price list and safety tips."
              />
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ComingSoonPage
                title="Bookings and users"
                description="See all bookings and block or unblock users."
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
