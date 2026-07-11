import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => { fetchMe(); }, []);
  return <RouterProvider router={router} />;
}
