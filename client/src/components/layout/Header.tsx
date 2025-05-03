import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MobileMenu from "./MobileMenu";
import platesyncLogo from "@/assets/platesync-logo.png";
import redeemerLogo from "@/assets/redeemer-logo-white.png";

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
      <header className="bg-black text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <a className="flex items-center">
                <img 
                  src={redeemerLogo} 
                  alt="Redeemer Presbyterian Church" 
                  className="h-20" 
                  style={{ width: 'auto', objectFit: 'contain' }}
                />
              </a>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/counts">
              <a className={`font-inter font-medium text-white hover:text-accent transition text-lg ${location === '/counts' ? 'text-accent' : ''}`}>
                Counts
              </a>
            </Link>
            <Link href="/donations">
              <a className={`font-inter font-medium text-white hover:text-accent transition text-lg ${location === '/donations' ? 'text-accent' : ''}`}>
                Donations
              </a>
            </Link>
            <Link href="/members">
              <a className={`font-inter font-medium text-white hover:text-accent transition text-lg ${location === '/members' ? 'text-accent' : ''}`}>
                Members
              </a>
            </Link>
            <Link href="/settings">
              <a className={`font-inter font-medium text-white hover:text-accent transition text-lg ${location === '/settings' ? 'text-accent' : ''}`}>
                Settings
              </a>
            </Link>
            <Link href="/account">
              <a className={`font-inter font-medium text-white hover:text-accent transition text-lg ${location === '/account' ? 'text-accent' : ''}`}>
                Account
              </a>
            </Link>
          </nav>
          
          <div className="flex items-center space-x-3">            
            <Avatar className="bg-secondary w-8 h-8 hidden md:block">
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
