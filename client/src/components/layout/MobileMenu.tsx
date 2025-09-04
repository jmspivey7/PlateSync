import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const [location] = useLocation();
  const { isAdmin, isMasterAdmin } = useAuth();
  
  const handleLinkClick = () => {
    onClose();
  };
  
  return (
    <div className={cn(
      "bg-[#2D3748] text-white fixed z-50 inset-0 transform",
      isOpen ? "translate-x-0" : "translate-x-full",
      "transition-transform duration-200 ease-in-out md:hidden"
    )}>
      <div className="flex justify-end p-4">
        <button 
          onClick={onClose}
          className="text-white hover:text-[#d35f5f] transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="container mx-auto px-4 py-2">
        {isMasterAdmin && (
          <div className="mb-4 px-2 py-2 bg-[#d35f5f]/20 rounded-md">
            <div className="flex items-center">
              <span className="bg-[#d35f5f] text-white p-1 rounded-md text-xs font-bold mr-2">M</span>
              <span className="text-[#d35f5f] font-medium">Master Admin</span>
            </div>
          </div>
        )}
        
        <nav className="flex flex-col space-y-3 pb-3">
          <Link href="/">
            <a 
              className={`font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg ${location === '/' ? 'text-[#d35f5f]' : ''}`}
              onClick={handleLinkClick}
            >
              Dashboard
            </a>
          </Link>
          <Link href="/donations">
            <a 
              className={`font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg ${location === '/donations' ? 'text-[#d35f5f]' : ''}`}
              onClick={handleLinkClick}
            >
              Donations
            </a>
          </Link>
          <Link href="/members">
            <a 
              className={`font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg ${location === '/members' ? 'text-[#d35f5f]' : ''}`}
              onClick={handleLinkClick}
            >
              Members
            </a>
          </Link>
          <Link href="/counts">
            <a 
              className={`font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg ${location === '/counts' ? 'text-[#d35f5f]' : ''}`}
              onClick={handleLinkClick}
            >
              Counts
            </a>
          </Link>
          {isAdmin && (
            <Link href="/user-management">
              <a 
                className={`font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg ${location === '/user-management' ? 'text-[#d35f5f]' : ''}`}
                onClick={handleLinkClick}
              >
                User Management
              </a>
            </Link>
          )}
          <Link href="/settings">
            <a 
              className={`font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg ${location === '/settings' ? 'text-[#d35f5f]' : ''}`}
              onClick={handleLinkClick}
            >
              Settings
              {isMasterAdmin && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#d35f5f] text-white">
                  M
                </span>
              )}
            </a>
          </Link>
          <a 
            href="/api/logout" 
            className="font-inter font-medium text-white hover:text-[#d35f5f] transition py-4 text-lg border-t border-gray-700 mt-4 pt-4"
          >
            Log Out
          </a>
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
