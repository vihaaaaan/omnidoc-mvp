import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/auth-provider';
import { 
  Activity, 
  Calendar, 
  User2, 
  FileText, 
  Settings, 
  LogOut 
} from 'lucide-react';
import omnidocLogo from '@/assets/omnidoc.png';

const Sidebar = () => {
  const [location] = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className="fixed inset-y-0 left-0 bg-white shadow-md max-h-screen w-60 hidden md:block">
      <div className="flex flex-col justify-between h-full">
        <div className="flex-grow">
          <div className="px-4 py-6 text-center border-b">
            <h1 className="text-xl font-bold leading-none">
              <span className="flex items-center justify-center">
                <img src={omnidocLogo} alt="OmniDoc Logo" className="h-9" />
              </span>
            </h1>
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
                >
                  <Activity className="mr-3 h-5 w-5" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Appointments
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                >
                  <User2 className="mr-3 h-5 w-5" />
                  Patients
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
                >
                  <FileText className="mr-3 h-5 w-5" />
                  Reports
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="flex bg-white hover:bg-gray-100 rounded-xl font-medium text-sm text-gray-700 py-3 px-4"
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
    </aside>
  );
};

export default Sidebar;
