import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  
  // Get username or email for display
  const getDisplayName = () => {
    if (!user) return "User";
    return user.username || user.email || "User";
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-[#69ad4c]">
            <AvatarFallback>{getInitials()}</AvatarFallback>
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
          
          {isAdmin ? (
            <>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                App Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Admin</DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => setLocation("/user-management")}>
                User Management
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation("/service-options")}>
                Service Options
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation("/email-settings")}>
                Email Settings
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setLocation("/help")}>
              Help
            </DropdownMenuItem>
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