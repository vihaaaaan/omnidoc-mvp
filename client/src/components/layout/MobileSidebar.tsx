import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { 
  Activity, 
  Calendar, 
  User2, 
  FileText, 
  Settings, 
  LogOut,
  X
} from 'lucide-react';

interface MobileSidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const MobileSidebar = ({ isOpen, closeSidebar }: MobileSidebarProps) => {
  const [location] = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    closeSidebar();
  };

  // Prevent click on sidebar content from closing the sidebar
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
      onClick={closeSidebar}
    >
      <div 
        className="fixed inset-y-0 left-0 w-60 bg-white overflow-y-auto"
        onClick={handleContentClick}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="flex-grow">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h1 className="text-lg font-bold text-primary-700">OmniDoc</h1>
              <button onClick={closeSidebar}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <ul className="space-y-1">
                <li>
                  <Link 
                    href="/dashboard" 
                    className={`flex items-center ${
                      location === '/dashboard' 
                        ? 'bg-primary-50 rounded-xl font-bold text-sm text-primary-700'
                        : 'bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700'
                    } py-3 px-4`}
                    onClick={closeSidebar}
                  >
                    <Activity className="mr-3 h-5 w-5" />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link 
                    href="#" 
                    className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                    onClick={closeSidebar}
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    Appointments
                  </Link>
                </li>
                <li>
                  <Link 
                    href="#" 
                    className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                    onClick={closeSidebar}
                  >
                    <User2 className="mr-3 h-5 w-5" />
                    Patients
                  </Link>
                </li>
                <li>
                  <Link 
                    href="#" 
                    className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                    onClick={closeSidebar}
                  >
                    <FileText className="mr-3 h-5 w-5" />
                    Reports
                  </Link>
                </li>
                <li>
                  <Link 
                    href="#" 
                    className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                    onClick={closeSidebar}
                  >
                    <Settings className="mr-3 h-5 w-5" />
                    Settings
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSidebar;
