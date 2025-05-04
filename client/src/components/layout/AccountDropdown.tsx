import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Settings, 
  User as UserIcon, 
  LogOut, 
  UserCircle, 
  Users, 
  FileBarChart, 
  Mail
} from "lucide-react";

const AccountDropdown = () => {
  const { user, isAdmin } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user) return "U";
    
    // If role is admin, show "A", otherwise "U" for usher
    if (isAdmin) return "A";
    return "U";
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarImage src={user?.profileImageUrl || ""} />
            <AvatarFallback className="bg-white text-gray-800 font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block font-medium">
            {user?.firstName || user?.username} {user?.lastName || ""}
          </span>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        {isAdmin ? (
          // Admin menu items
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Admin Controls</DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>App Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setLocation("/user-management")} className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>User Management</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setLocation("/service-options")} className="cursor-pointer">
              <FileBarChart className="mr-2 h-4 w-4" />
              <span>Service Options</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setLocation("/email-settings")} className="cursor-pointer">
              <Mail className="mr-2 h-4 w-4" />
              <span>Email Settings</span>
            </DropdownMenuItem>
          </>
        ) : (
          // Usher menu items - limited options
          <>
            <DropdownMenuItem onClick={() => setLocation("/help")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Help</span>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => { window.location.href = "/api/logout"; }}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountDropdown;