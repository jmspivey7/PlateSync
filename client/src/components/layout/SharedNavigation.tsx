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
      <div className="flex justify-between items-center py-6 mb-6 border-b border-gray-100 pb-6">
        {/* Show church logo if available, otherwise show church name with icon, or default app name */}
        <div 
          className="cursor-pointer flex items-center"
          onClick={() => setLocation("/dashboard")}
        >
          {user?.churchLogoUrl ? (
            <div className="flex items-center">
              <div className="h-24 w-auto overflow-hidden">
                <img 
                  src={user.churchLogoUrl} 
                  alt={`${user.churchName || 'Church'} logo`} 
                  className="h-full w-auto max-h-24 object-contain"
                  onError={(e) => {
                    console.error("Error loading logo:", e);
                    // Fallback to church name if image fails to load
                    e.currentTarget.style.display = 'none';
                    // Get parent container
                    const container = e.currentTarget.closest('.flex.items-center');
                    if (container && user?.churchName) {
                      // Create church name element
                      const nameElement = document.createElement('div');
                      nameElement.className = "flex items-center";
                      nameElement.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#69ad4c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 mr-2 text-[#69ad4c]"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        <span class="text-xl font-bold">${user.churchName}</span>
                      `;
                      // Replace the current container content
                      container.innerHTML = '';
                      container.appendChild(nameElement);
                    }
                  }}
                />
              </div>
            </div>
          ) : user?.churchName ? (
            <div className="flex items-center">
              <Church className="h-8 w-8 mr-2 text-[#69ad4c]" />
              <span className="text-xl font-bold">{user.churchName}</span>
            </div>
          ) : (
            <div className="flex items-center">
              <Church className="h-8 w-8 mr-2 text-[#69ad4c]" />
              <span className="text-xl font-bold">PlateSync</span>
            </div>
          )}
        </div>
        
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