import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";

const UserManagement = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      return await apiRequest('/api/users');
    },
  });
  
  // Update user role mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      return await apiRequest(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });
  
  // Handle role change
  const handleRoleChange = (userId: string, role: string) => {
    mutate({ userId, role });
  };
  
  // Filter users based on search query
  const filteredUsers = users?.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower))
    );
  }) || [];
  
  // If not admin, redirect or show error
  if (!isAdmin) {
    return (
      <PageLayout title="Access Denied" subtitle="You do not have permission to access this page">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">You need administrator privileges to view this page.</p>
            <Button onClick={() => window.location.href = "/dashboard"}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="User Management" subtitle="Manage users and their roles in the system">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                View and manage user accounts and permissions
              </CardDescription>
            </div>
            
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl || ""} />
                            <AvatarFallback className="bg-gray-100 text-gray-800">
                              {user.role === "ADMIN" ? "A" : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>{user.username}</TableCell>
                      
                      <TableCell>{user.email || "—"}</TableCell>
                      
                      <TableCell>
                        <Badge 
                          className={
                            user.role === "ADMIN" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {user.role || "USHER"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <Select 
                          defaultValue={user.role || "USHER"}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="USHER">Usher</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default UserManagement;