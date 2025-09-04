import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MobileMenu from "./MobileMenu";

const Header = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  
  const getInitials = () => {
    if (!user) return "U";
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    
    return "U";
  };
  
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };
  
  return (
    <>
      <header className="bg-[#2D3748] text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-[#d35f5f]" />
            <h1 className="text-xl font-bold font-inter tracking-tight">PlateSYNQ</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className={`font-inter font-medium text-white hover:text-[#d35f5f] transition ${location === '/' ? 'text-[#d35f5f]' : ''}`}>
                Dashboard
              </a>
            </Link>
            <Link href="/donations">
              <a className={`font-inter font-medium text-white hover:text-[#d35f5f] transition ${location === '/donations' ? 'text-[#d35f5f]' : ''}`}>
                Donations
              </a>
            </Link>
            <Link href="/members">
              <a className={`font-inter font-medium text-white hover:text-[#d35f5f] transition ${location === '/members' ? 'text-[#d35f5f]' : ''}`}>
                Members
              </a>
            </Link>
            <Link href="/counts">
              <a className={`font-inter font-medium text-white hover:text-[#d35f5f] transition ${location === '/counts' ? 'text-[#d35f5f]' : ''}`}>
                Counts
              </a>
            </Link>
            <Link href="/settings">
              <a className={`font-inter font-medium text-white hover:text-[#d35f5f] transition ${location === '/settings' ? 'text-[#d35f5f]' : ''}`}>
                Settings
              </a>
            </Link>
          </nav>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:block">
              <span className="text-sm text-gray-300">{user?.churchName || "Church Admin"}</span>
            </div>
            
            <Avatar className="bg-gray-700 w-8 h-8">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white"
              onClick={toggleMobileMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </header>
      
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
    </>
  );
};

export default Header;
