import { useState } from 'react';
import { Menu, User } from 'lucide-react';
import omnidocLogo from '@/assets/omnidoc.png';

interface MobileHeaderProps {
  toggleSidebar: () => void;
}

const MobileHeader = ({ toggleSidebar }: MobileHeaderProps) => {
  return (
    <div className="md:hidden bg-white w-full flex justify-between items-center px-4 py-3 border-b">
      <div className="flex items-center gap-2">
        <button onClick={toggleSidebar} className="p-2">
          <Menu className="h-6 w-6" />
        </button>
        <img src={omnidocLogo} alt="OmniDoc Logo" className="h-7" />
      </div>
      <button>
        <User className="h-6 w-6" />
      </button>
    </div>
  );
};

export default MobileHeader;
