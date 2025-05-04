import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

// Import logos
import redeemerLogo from "../../assets/redeemer-logo.png";

interface SharedNavigationProps {
  title?: string;
  subtitle?: string;
}

const SharedNavigation = ({ title, subtitle }: SharedNavigationProps) => {
  const [_, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <>
      {/* Header with Church Logo */}
      <div className="flex justify-between items-center py-4 mb-6">
        <img 
          src={redeemerLogo} 
          alt="Redeemer NOLA Presbyterian Church" 
          className="h-16 sm:h-24 object-contain cursor-pointer"
          onClick={() => setLocation("/dashboard")}
        />
        
        {isMobile ? (
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="ghost" onClick={() => setLocation("/counts")}>Historical Counts</Button>
            <Button variant="ghost" onClick={() => setLocation("/donations")}>Donations</Button>
            <Button variant="ghost" onClick={() => setLocation("/members")}>Members</Button>
            <Button variant="ghost" onClick={() => setLocation("/settings")}>Settings</Button>
            <Button variant="ghost" onClick={() => setLocation("/account")}>Account</Button>
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
            }}>Historical Counts</Button>
            <Button variant="ghost" onClick={() => {
              setLocation("/donations");
              setMobileMenuOpen(false);
            }}>Donations</Button>
            <Button variant="ghost" onClick={() => {
              setLocation("/members");
              setMobileMenuOpen(false);
            }}>Members</Button>
            <Button variant="ghost" onClick={() => {
              setLocation("/settings");
              setMobileMenuOpen(false);
            }}>Settings</Button>
            <Button variant="ghost" onClick={() => {
              setLocation("/account");
              setMobileMenuOpen(false);
            }}>Account</Button>
            <Button variant="ghost" onClick={() => {
              window.location.href = "/api/logout";
            }}>Logout</Button>
          </div>
        </div>
      )}
      
      {/* Page Title (if provided) */}
      {title && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-inter text-[#2D3748]">{title}</h2>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
    </>
  );
};

export default SharedNavigation;