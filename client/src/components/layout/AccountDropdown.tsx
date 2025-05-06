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
  LogOut
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const AccountDropdown = () => {
  const [_, setLocation] = useLocation();
  const { user, isAdmin, isMasterAdmin } = useAuth();
  
  // Get initials or use default fallback
  const getInitials = () => {
    if (!user) return "U";
    
    // If master admin, show "M", if admin show "A", otherwise "U" for usher
    if (isMasterAdmin) return "M";
    return isAdmin ? "A" : "U";
  };
  
  // Get full name or fall back to username/email
  const getDisplayName = () => {
    if (!user) return "User";
    
    // Display First Name Last Name if available
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    // Fall back to username or email if no name is available
    return user.username || user.email || "User";
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-[2.76rem] w-[2.76rem] bg-[#69ad4c]">
            {user?.profileImageUrl ? (
              <AvatarImage src={user.profileImageUrl} alt={getDisplayName()} />
            ) : (
              <AvatarFallback>{getInitials()}</AvatarFallback>
            )}
          </Avatar>
          <span className="text-[1.1rem]">{getDisplayName()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="bg-white w-56" align="end">
        <DropdownMenuLabel className="text-[1.1rem] font-semibold">
          {isMasterAdmin ? "Master Admin" : isAdmin ? "Administrator" : "Usher"}
        </DropdownMenuLabel>
        
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-[1.1rem] py-2" onClick={() => setLocation("/profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
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