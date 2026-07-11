import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import BookingPage from './pages/public/BookingPage';
import TrackPage from './pages/public/TrackPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import FarePage from './pages/public/FarePage';
import AdminDashboard from './pages/admin/DashboardPage';
import MemberDashboard from './pages/member/DashboardPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/booking', element: <BookingPage /> },
  { path: '/fare', element: <FarePage /> },
  { path: '/track/:code', element: <TrackPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/admin/dashboard', element: <AdminDashboard /> },
  { path: '/member/dashboard', element: <MemberDashboard /> },
]);
