import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  User, 
  HelpCircle, 
  Building2, 
  Users, 
  FileText, 
  LogOut,
  Settings,
  Mail
} from "lucide-react";

interface GlobalAdminAccountDropdownProps {
  adminName?: string;
  adminEmail?: string;
}

const GlobalAdminAccountDropdown = ({ 
  adminName = "John Spivey", 
  adminEmail = "jspivey@spiveyco.com" 
}: GlobalAdminAccountDropdownProps) => {
  const [_, setLocation] = useLocation();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // Load profile data from local storage
    const loadProfileImage = () => {
      const savedProfileData = localStorage.getItem("globalAdminProfile");
      if (savedProfileData) {
        try {
          const parsedData = JSON.parse(savedProfileData);
          if (parsedData.profileImageUrl) {
            setProfileImageUrl(parsedData.profileImageUrl);
          }
        } catch (error) {
          console.error("Error parsing profile data:", error);
        }
      }
    };
    
    // Load on mount
    loadProfileImage();
    
    // Check for updates every second
    const intervalId = setInterval(loadProfileImage, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem("globalAdminToken");
    setLocation("/global-admin/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-9 w-9 bg-[#d35f5f]">
            {profileImageUrl ? (
              <AvatarImage src={profileImageUrl} alt={adminName} />
            ) : (
              <AvatarFallback className="text-white">GA</AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium leading-none">{adminName}</span>
            <span className="text-xs text-muted-foreground">Global Administrator</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="bg-white w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{adminName}</p>
            <p className="text-xs text-muted-foreground">{adminEmail}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setLocation("/global-admin/profile")}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setLocation("/global-admin/churches")}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span>Churches</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setLocation("/global-admin/users")}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Users</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setLocation("/global-admin/reports")}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setLocation("/global-admin/settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-red-600 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GlobalAdminAccountDropdown;