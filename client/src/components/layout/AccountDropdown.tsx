import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Settings, 
  Users, 
  UserPlus, 
  LogOut,
  CreditCard
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

// Same key as in useAuth
const LOCAL_STORAGE_USER_KEY = "platesync_user_profile";

const AccountDropdown = () => {
  const [_, setLocation] = useLocation();
  const { user, isAdmin, isAccountOwner } = useAuth();
  const [localUserData, setLocalUserData] = useState<any>(null);
  
  // Set up interval to check for profile updates in localStorage
  useEffect(() => {
    // Initial load from localStorage
    const loadUserData = () => {
      try {
        const userData = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (userData) {
          setLocalUserData(JSON.parse(userData));
        }
      } catch (error) {
        console.error("Error loading user data from localStorage:", error);
      }
    };
    
    // Load initial data
    loadUserData();
    
    // Check for updates every second
    const intervalId = setInterval(loadUserData, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Use the most up-to-date user data
  const effectiveUser = localUserData || user;
  
  // Get initials from first and last name
  const getInitials = () => {
    if (!effectiveUser) return "U";
    
    // Use first letter of first name and first letter of last name
    if (effectiveUser.firstName && effectiveUser.lastName) {
      return `${effectiveUser.firstName.charAt(0)}${effectiveUser.lastName.charAt(0)}`;
    }
    
    // If only first name is available
    if (effectiveUser.firstName) {
      return effectiveUser.firstName.charAt(0);
    }
    
    // If only last name is available
    if (effectiveUser.lastName) {
      return effectiveUser.lastName.charAt(0);
    }
    
    // Fall back to email or username
    if (effectiveUser.email) {
      return effectiveUser.email.charAt(0).toUpperCase();
    }
    
    if (effectiveUser.username) {
      return effectiveUser.username.charAt(0).toUpperCase();
    }
    
    return "U";
  };
  
  // Get full name or fall back to username/email
  const getDisplayName = () => {
    if (!effectiveUser) return "User";
    
    // Display First Name Last Name if available
    if (effectiveUser.firstName && effectiveUser.lastName) {
      return `${effectiveUser.firstName} ${effectiveUser.lastName}`;
    }
    
    // Fall back to username or email if no name is available
    return effectiveUser.username || effectiveUser.email || "User";
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-[2.76rem] w-[2.76rem] bg-[#69ad4c]">
            {effectiveUser?.profileImageUrl ? (
              <AvatarImage src={effectiveUser.profileImageUrl} alt={getDisplayName()} />
            ) : null}
            <AvatarFallback className="text-white bg-[#69ad4c]">{getInitials()}</AvatarFallback>
          </Avatar>
          <span className="text-[1.1rem]">{getDisplayName()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="bg-white w-56" align="end">
        <DropdownMenuLabel className="text-[1.1rem] font-semibold">
          {isAccountOwner ? "Account Owner" : isAdmin ? "Administrator" : "Standard User"}
        </DropdownMenuLabel>
        
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          {isAccountOwner && (
            <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/subscription")}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Subscription</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/help")}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2 border-t border-gray-300" />
          
          {isAdmin && (
            <>
              <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/user-management")}>
                <Users className="mr-2 h-4 w-4" />
                <span>Users</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/members")}>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Members</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2 border-t border-gray-300" />
            </>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuItem 
          className="text-red-600 text-[1.1rem] py-2"
          onClick={() => {
            // Clear all local data immediately to fix the stuck state
            localStorage.clear();
            
            // Use simple window location navigation for GET logout
            window.location.href = '/api/logout';
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountDropdown;