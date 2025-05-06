import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Menu, 
  X, 
  Church, 
  User, 
  HelpCircle, 
  Settings, 
  Users, 
  LogOut,
  FileBarChart,
  ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { user, isAdmin, isMasterAdmin } = useAuth();
  
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
      
      {/* Mobile Menu - Full Screen Overlay EXACTLY MATCHING DROPDOWN */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Header with user profile and close button */}
          <div className="pt-16 p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center">
              <Avatar className="h-16 w-16 bg-[#69ad4c] mr-4">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt={user?.firstName || "User"} />
                ) : (
                  <AvatarFallback>{isMasterAdmin ? "M" : isAdmin ? "A" : "U"}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="text-xl font-medium">{user?.firstName} {user?.lastName}</div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </div>
            
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex-1 flex flex-col p-0">
            {/* Administrator Label */}
            <div className="py-2 px-6 font-semibold text-xl text-center">
              {isMasterAdmin ? (
                <div className="flex items-center justify-center">
                  <span className="mr-2">Master Admin</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#69ad4c] text-white">M</span>
                </div>
              ) : isAdmin ? "Administrator" : "Usher"}
            </div>
            
            <div className="flex flex-col items-center justify-start">
              {/* Profile */}
              <Button 
                variant="ghost" 
                className="flex items-center py-5 px-6 rounded-none justify-center text-lg w-full"
                onClick={() => {
                  setLocation("/profile");
                  setMobileMenuOpen(false);
                }}
              >
                <User className="mr-4 h-5 w-5" />
                <span>Profile</span>
              </Button>
              
              {/* Help */}
              <Button 
                variant="ghost" 
                className="flex items-center py-5 px-6 rounded-none justify-center text-lg w-full"
                onClick={() => {
                  setLocation("/help");
                  setMobileMenuOpen(false);
                }}
              >
                <HelpCircle className="mr-4 h-5 w-5" />
                <span>Help</span>
              </Button>
              
              {/* Separator */}
              <div className="border-t border-gray-200 my-2 w-3/4"></div>
              
              {isAdmin && (
                <>
                  {/* Users */}
                  <Button 
                    variant="ghost" 
                    className="flex items-center py-5 px-6 rounded-none justify-center text-lg w-full"
                    onClick={() => {
                      setLocation("/user-management");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Users className="mr-4 h-5 w-5" />
                    <span>Users</span>
                  </Button>
                  
                  {/* Reports */}
                  <Button 
                    variant="ghost" 
                    className="flex items-center py-5 px-6 rounded-none justify-center text-lg w-full"
                    onClick={() => {
                      setLocation("/reports");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <FileBarChart className="mr-4 h-5 w-5" />
                    <span>Reports</span>
                  </Button>
                  
                  {/* Settings */}
                  <Button 
                    variant="ghost" 
                    className="flex items-center py-5 px-6 rounded-none justify-center text-lg w-full"
                    onClick={() => {
                      setLocation("/settings");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Settings className="mr-4 h-5 w-5" />
                    <span>Settings</span>
                  </Button>
                  
                  {/* Separator */}
                  <div className="border-t border-gray-200 my-2 w-3/4"></div>
                </>
              )}
              
              {/* Logout */}
              <Button 
                variant="ghost" 
                className="flex items-center py-5 px-6 rounded-none justify-center text-lg w-full text-red-600"
                onClick={() => {
                  window.location.href = "/api/logout";
                }}
              >
                <LogOut className="mr-4 h-5 w-5" />
                <span>Logout</span>
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