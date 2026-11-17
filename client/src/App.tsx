import { Route, Routes } from 'react-router';
import { RequireRole } from './auth/RequireRole';
import { AppLayout } from './components/AppLayout';
import ComingSoonPage from './pages/ComingSoonPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminTechniciansPage from './pages/admin/AdminTechniciansPage';
import TechnicianProfilePage from './pages/technician/TechnicianProfilePage';
import MyJobsPage from './pages/technician/MyJobsPage';
import JobDetailsPage from './pages/technician/JobDetailsPage';
import GetHelpPage from './pages/customer/GetHelpPage';
import ResultPage from './pages/customer/ResultPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import BookingDetailsPage from './pages/customer/BookingDetailsPage';
import TechnicianPublicPage from './pages/customer/TechnicianPublicPage';
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
          <Route path="/request" element={<GetHelpPage />} />
          <Route path="/request/:id" element={<ResultPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailsPage />} />
          <Route path="/technicians/:id" element={<TechnicianPublicPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="technician" />}>
        <Route element={<AppLayout />}>
          <Route path="/tech/jobs" element={<MyJobsPage />} />
          <Route path="/tech/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/tech/profile" element={<TechnicianProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
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
