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
import { ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const AccountDropdown = () => {
  const [_, setLocation] = useLocation();
  const { user, isAdmin } = useAuth();
  
  // Get initials or use default fallback
  const getInitials = () => {
    if (!user) return "U";
    
    // If admin, show "A", otherwise "U" for usher
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
          <Avatar className="h-8 w-8 bg-[#69ad4c]">
            {user?.profileImageUrl ? (
              <AvatarImage src={user.profileImageUrl} alt={getDisplayName()} />
            ) : (
              <AvatarFallback>{getInitials()}</AvatarFallback>
            )}
          </Avatar>
          <span>{getDisplayName()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="bg-white w-56" align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setLocation("/profile")}>
            Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setLocation("/help")}>
            Help
          </DropdownMenuItem>
          
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Admin</DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                App Settings
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation("/user-management")}>
                User Management
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation("/service-options")}>
                Service Options
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-red-600"
          onClick={() => {
            window.location.href = "/api/logout";
          }}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountDropdown;