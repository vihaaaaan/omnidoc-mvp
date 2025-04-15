import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileSidebar from './MobileSidebar';
import { useAuth } from '@/hooks/auth-provider';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { authState } = useAuth();

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close mobile sidebar
  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  // If auth is still loading, show loading indicator
  if (authState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-2 text-lg text-gray-700">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Mobile Header */}
      <MobileHeader toggleSidebar={toggleMobileSidebar} />

      {/* Mobile Sidebar - only visible when toggle is true */}
      <MobileSidebar isOpen={isMobileSidebarOpen} closeSidebar={closeMobileSidebar} />

      {/* Main Content */}
      <main className="md:ml-60 pt-4 px-4 md:px-8 max-w-full min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
