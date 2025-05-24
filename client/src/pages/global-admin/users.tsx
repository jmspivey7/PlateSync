import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Search, 
  Trash2,
  UserPlus, 
  Users as UsersIcon,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GlobalAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
}

// Sample data (in a real application, this would come from the API)
const sampleUsers: GlobalAdminUser[] = [
  {
    id: "40829937",
    name: "John Spivey",
    email: "jspivey@spiveyco.com",
    role: "Global Admin",
    status: "active",
    lastLogin: "2025-05-12 09:45 AM"
  }
];

export default function GlobalAdminUsers() {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<GlobalAdminUser[]>(sampleUsers);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showUserDetailDialog, setShowUserDetailDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GlobalAdminUser | null>(null);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "global_admin"
  });
  
  // Check for authentication
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      setLocation("/global-admin/login");
    }
  }, [setLocation]);
  
  const handleAddUser = () => {
    // In a real app, this would make an API call to create the user
    const newUserEntry: GlobalAdminUser = {
      id: Math.random().toString(36).substring(2, 9),
      name: `${newUser.firstName} ${newUser.lastName}`,
      email: newUser.email,
      role: newUser.role === "global_admin" ? "Global Admin" : "Support Admin",
      status: "active",
      lastLogin: "Never"
    };
    
    setUsers([...users, newUserEntry]);
    setShowAddUserDialog(false);
    setNewUser({
      firstName: "",
      lastName: "",
      email: "",
      role: "global_admin"
    });
  };

  const handleRowClick = (user: GlobalAdminUser) => {
    setSelectedUser(user);
    setShowUserDetailDialog(true);
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "inactive" : "active" }
        : user
    ));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
    setShowUserDetailDialog(false);
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <GlobalAdminHeader />
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <UsersIcon className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">System Users</h2>
          </div>
          <Button 
            variant="outline" 
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Global Administrator Accounts</CardTitle>
              <Button 
                className="bg-[#69ad4c] hover:bg-[#5a9740] text-white"
                onClick={() => setShowAddUserDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Role</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        No users found matching your search criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleRowClick(user)}
                      >
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          {user.status === "active" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.lastLogin}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Add New Global Admin Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Administrator</DialogTitle>
            <DialogDescription>
              Create a new global admin or support admin account with system-wide access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global_admin">Global Administrator</SelectItem>
                  <SelectItem value="support_admin">Support Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {newUser.role === 'global_admin' 
                  ? 'Global Administrators have full access to all system features and churches.' 
                  : 'Support Administrators can assist users but cannot make system-wide changes.'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>Cancel</Button>
            <Button 
              className="bg-[#69ad4c] hover:bg-[#5a9740]"
              onClick={handleAddUser}
              disabled={!newUser.firstName || !newUser.lastName || !newUser.email}
            >
              Add Administrator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetailDialog} onOpenChange={setShowUserDetailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">User Details</DialogTitle>
            <DialogDescription>
              View and manage administrator account details and permissions.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="grid gap-6 py-4">
              {/* User Info */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                    <div className="text-sm font-medium">{selectedUser.name}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                    <div className="text-sm">{selectedUser.email}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Role</Label>
                    <div className="text-sm">{selectedUser.role}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <div className="flex items-center">
                      {selectedUser.status === "active" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Last Login</Label>
                  <div className="text-sm">{selectedUser.lastLogin}</div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="border-t pt-4">
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleToggleUserStatus(selectedUser.id)}
                    variant={selectedUser.status === "active" ? "destructive" : "default"}
                    className={selectedUser.status === "active" ? "" : "bg-[#69ad4c] hover:bg-[#5a9740] text-white"}
                  >
                    {selectedUser.status === "active" ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Deactivate User
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate User
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}