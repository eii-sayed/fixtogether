import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '../../context/AuthContext';

export default function MainLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 antialiased selection:bg-primary-500 selection:text-white">
      <Navbar />
      <main className={`flex-1 ${isAuthenticated ? 'pb-20 md:pb-0' : ''}`}>
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
