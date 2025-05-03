import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const [location] = useLocation();
  
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
          className="text-white hover:text-[#48BB78] transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="container mx-auto px-4 py-2">
        <nav className="flex flex-col space-y-3 pb-3">
          <Link href="/">
            <a 
              className={`font-inter font-medium text-white hover:text-[#48BB78] transition py-4 text-lg ${location === '/' ? 'text-[#48BB78]' : ''}`}
              onClick={handleLinkClick}
            >
              Dashboard
            </a>
          </Link>
          <Link href="/donations">
            <a 
              className={`font-inter font-medium text-white hover:text-[#48BB78] transition py-4 text-lg ${location === '/donations' ? 'text-[#48BB78]' : ''}`}
              onClick={handleLinkClick}
            >
              Donations
            </a>
          </Link>
          <Link href="/members">
            <a 
              className={`font-inter font-medium text-white hover:text-[#48BB78] transition py-4 text-lg ${location === '/members' ? 'text-[#48BB78]' : ''}`}
              onClick={handleLinkClick}
            >
              Members
            </a>
          </Link>
          <Link href="/batches">
            <a 
              className={`font-inter font-medium text-white hover:text-[#48BB78] transition py-4 text-lg ${location === '/batches' ? 'text-[#48BB78]' : ''}`}
              onClick={handleLinkClick}
            >
              Batches
            </a>
          </Link>
          <Link href="/settings">
            <a 
              className={`font-inter font-medium text-white hover:text-[#48BB78] transition py-4 text-lg ${location === '/settings' ? 'text-[#48BB78]' : ''}`}
              onClick={handleLinkClick}
            >
              Settings
            </a>
          </Link>
          <a 
            href="/api/logout" 
            className="font-inter font-medium text-white hover:text-[#48BB78] transition py-4 text-lg border-t border-gray-700 mt-4 pt-4"
          >
            Log Out
          </a>
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
