import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminAccountDropdown from "@/components/global-admin/GlobalAdminAccountDropdown";

export default function GlobalAdminDashboard() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the global admin portal",
        variant: "destructive",
      });
      setLocation("/global-admin/login");
    }
  }, [toast, setLocation]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo-with-text.png" 
              alt="PlateSync Logo" 
              className="h-10 object-contain" 
            />
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <h1 className="text-xl font-semibold text-[#69ad4c]">Global Administration</h1>
          </div>
          <GlobalAdminAccountDropdown 
            adminName="John Spivey" 
            adminEmail="jspivey@spiveyco.com" 
          />
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* This area is intentionally left empty for future dashboard content */}
      </main>
    </div>
  );
}