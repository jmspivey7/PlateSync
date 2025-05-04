import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import AccountDropdown from "@/components/layout/AccountDropdown";
import { useAuth } from "@/hooks/useAuth";

// Import default logo
import redeemerLogo from "../../assets/redeemer-logo.png";

interface SharedNavigationProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const SharedNavigation = ({ title, subtitle, icon, action }: SharedNavigationProps) => {
  const [_, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, isAdmin } = useAuth();
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <>
      {/* Header with Church Logo */}
      <div className="flex justify-between items-center py-4 mb-6">
        {user?.churchLogoUrl ? (
          // Display custom church logo if available
          <div 
            className="cursor-pointer flex items-center"
            onClick={() => setLocation("/dashboard")}
          >
            <img 
              src={user.churchLogoUrl} 
              alt={user.churchName || "Church Logo"} 
              className="h-[4.6rem] sm:h-[6.9rem] object-contain" 
            />
          </div>
        ) : user?.churchName ? (
          // Show church name if no logo but name is available
          <div 
            className="cursor-pointer flex items-center"
            onClick={() => setLocation("/dashboard")}
          >
            <div className="flex items-center">
              <Church className="h-8 w-8 mr-2 text-[#69ad4c]" />
              <span className="text-xl font-bold">{user.churchName}</span>
            </div>
          </div>
        ) : (
          // Fallback to default logo
          <img 
            src={redeemerLogo} 
            alt="Redeemer NOLA Presbyterian Church" 
            className="h-[4.6rem] sm:h-[6.9rem] object-contain cursor-pointer" /* Increased by 15% from original h-16 (4rem) and sm:h-24 (6rem) */
            onClick={() => setLocation("/dashboard")}
          />
        )}
        
        {isMobile ? (
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        ) : (
          <div className="flex items-center space-x-4">
            <AccountDropdown />
          </div>
        )}
      </div>
      
      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <div className="bg-white rounded-md shadow-lg p-4 mb-6">
          <div className="flex flex-col space-y-2">
            <Button variant="link" className="text-gray-500" onClick={() => {
              setLocation("/dashboard");
              setMobileMenuOpen(false);
            }}>Dashboard</Button>
            
            <Button variant="ghost" onClick={() => {
              setLocation("/counts");
              setMobileMenuOpen(false);
            }}>Counts</Button>
            
            <div className="border-t border-gray-200 my-2 pt-2">
              <p className="text-sm text-gray-500 px-2 mb-2">Account</p>
              
              <Button variant="ghost" onClick={() => {
                setLocation("/profile");
                setMobileMenuOpen(false);
              }}>Profile</Button>
              
              {isAdmin ? (
                <>
                  <Button variant="ghost" onClick={() => {
                    setLocation("/user-management");
                    setMobileMenuOpen(false);
                  }}>Users</Button>
                  
                  <Button variant="ghost" onClick={() => {
                    setLocation("/reports");
                    setMobileMenuOpen(false);
                  }}>Reports</Button>
                  
                  <Button variant="ghost" onClick={() => {
                    setLocation("/settings");
                    setMobileMenuOpen(false);
                  }}>Settings</Button>
                  
                  <Button variant="ghost" onClick={() => {
                    setLocation("/members");
                    setMobileMenuOpen(false);
                  }}>Members</Button>
                  
                  <Button variant="ghost" onClick={() => {
                    setLocation("/service-options");
                    setMobileMenuOpen(false);
                  }}>Service Options</Button>
                  
                  <Button variant="ghost" onClick={() => {
                    setLocation("/email-settings");
                    setMobileMenuOpen(false);
                  }}>Email Settings</Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => {
                  setLocation("/help");
                  setMobileMenuOpen(false);
                }}>Help</Button>
              )}
              
              <Button 
                variant="ghost" 
                className="text-red-600 mt-2"
                onClick={() => {
                  window.location.href = "/api/logout";
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Page Title (if provided) */}
      {title && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {icon && <div className="mr-2">{icon}</div>}
              <h2 className="text-2xl font-bold font-inter text-[#2D3748]">{title}</h2>
            </div>
            {action && <div>{action}</div>}
          </div>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
    </>
  );
};

export default SharedNavigation;