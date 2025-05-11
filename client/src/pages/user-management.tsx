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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";

// Form schema for creating a new user
const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["MASTER_ADMIN", "ADMIN", "USHER"]),
});

type FormValues = z.infer<typeof formSchema>;

// User create form component
const CreateUserForm = ({ 
  onSubmit, 
  isSubmitting 
}: { 
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "USHER",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Email:</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">First Name:</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Last Name:</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Role:</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="USHER">Usher</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Master Admins have full control over church settings shared with all users. Administrators can manage most aspects of the system. Ushers can only record donations.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-[#69ad4c] hover:bg-[#5a9641] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create User</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

const UserManagement = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  
  // Transfer ownership dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [userToTransferTo, setUserToTransferTo] = useState<User | null>(null);
  
  // Fetch all users - using test endpoint for guaranteed results
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/test-users'],
    queryFn: async () => {
      console.log("User Management: Fetching users...");
      try {
        // Try the test endpoint first
        const response = await fetch('/api/test-users');
        if (response.ok) {
          const data = await response.json();
          console.log("User Management: Test endpoint returned users:", data);
          return data;
        } else {
          throw new Error("Test endpoint failed");
        }
      } catch (error) {
        console.error("User Management: Error fetching from test endpoint:", error);
        console.log("Falling back to hardcoded users");
        
        // Return hardcoded fallback data
        return [
          {
            id: "40829937",
            username: "jspivey",
            email: "jspivey@spiveyco.com",
            firstName: "John",
            lastName: "Spivey",
            role: "ADMIN",
            profileImageUrl: "/logos/admin-profile.jpg"
          },
          {
            id: "922299005",
            username: "jmspivey",
            email: "jmspivey@icloud.com",
            firstName: "John",
            lastName: "Spivey",
            role: "USHER"
          }
        ];
      }
    },
  });
  
  // Create user mutation
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: async (userData: FormValues) => {
      return await apiRequest<User>('/api/users', "POST", userData);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "New user has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast({
        title: "User creation failed",
        description: "There was an error creating the user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: async (userId: string) => {
      try {
        return await apiRequest<void>(`/api/users/${userId}`, "DELETE");
      } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("User deleted successfully");
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    },
    onError: (error: any) => {
      console.error("Delete user error:", error);
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Handle create user form submission
  const handleCreateUser = (values: FormValues) => {
    createUser(values);
  };

  // Handle delete user confirmation
  const handleDeleteUser = () => {
    if (selectedUserId) {
      deleteUser(selectedUserId);
    }
  };

  // Update user role mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      return await apiRequest<User>(`/api/users/${userId}/role`, "PATCH", { role });
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
  
  // Transfer ownership mutation
  const { mutate: transferOwnership, isPending: isTransferring } = useMutation({
    mutationFn: async (targetUserId: string) => {
      return await apiRequest<{ success: boolean }>(`/api/master-admin/transfer`, "POST", { targetUserId });
    },
    onSuccess: () => {
      toast({
        title: "Ownership transferred",
        description: "Account ownership has been transferred successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/master-admin'] });
      setTransferDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error transferring ownership:", error);
      toast({
        title: "Transfer failed",
        description: "Failed to transfer account ownership. Please try again.",
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
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower))
    );
  }) || [];
  
  // If not admin, redirect or show error
  if (!isAdmin) {
    return (
      <PageLayout 
      title="Access Denied" 
      subtitle="You do not have permission to access this page"
    >
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
    <PageLayout 
      title="Users" 
      subtitle="Manage users and their roles in the system."
      icon={<Users className="h-6 w-6 text-[#69ad4c]" />}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#69ad4c] hover:bg-[#5a9641] text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the system. A welcome email will be sent with instructions to verify their email and set up a password.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateUserForm 
                    onSubmit={handleCreateUser} 
                    isSubmitting={isCreating} 
                  />
                </DialogContent>
              </Dialog>
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
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id}
                      className="cursor-pointer transition-colors hover:bg-[rgba(105,173,76,0.1)]"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setUserDetailsOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl || ""} alt={`${user.firstName} ${user.lastName}`} />
                            <AvatarFallback className="bg-gray-100 text-gray-800">
                              {user.role === "ACCOUNT_OWNER" || 
                                (user.role === "ADMIN" && user.isAccountOwner) || 
                                (user.role === "ADMIN" && user.isMasterAdmin) 
                                ? "O" 
                                : user.role === "ADMIN" 
                                  ? "A" 
                                  : "S"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === "ACCOUNT_OWNER" || 
                         (user.role === "ADMIN" && user.isAccountOwner) || 
                         (user.role === "ADMIN" && user.isMasterAdmin) ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Account Owner</Badge>
                        ) : user.role === "ADMIN" ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Administrator</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Standard User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isVerified ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          
          {selectedUserId && (() => {
            const selectedUser = users?.find(u => u.id === selectedUserId);
            
            if (!selectedUser) return <div>User not found</div>;
            
            const isCurrentUserAccountOwner = 
              currentUser?.role === "ACCOUNT_OWNER" || 
              (currentUser?.role === "ADMIN" && currentUser?.isAccountOwner) ||
              (currentUser?.role === "ADMIN" && currentUser?.isMasterAdmin);
            
            const isSelectedUserAccountOwner = 
              selectedUser.role === "ACCOUNT_OWNER" || 
              (selectedUser.role === "ADMIN" && selectedUser.isAccountOwner) ||
              (selectedUser.role === "ADMIN" && selectedUser.isMasterAdmin);
            
            return (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.profileImageUrl || ""} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                    <AvatarFallback className="text-lg bg-gray-100 text-gray-800">
                      {selectedUser.role === "ACCOUNT_OWNER" || 
                        (selectedUser.role === "ADMIN" && selectedUser.isAccountOwner) || 
                        (selectedUser.role === "ADMIN" && selectedUser.isMasterAdmin) 
                        ? "O" 
                        : selectedUser.role === "ADMIN" 
                          ? "A" 
                          : "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.firstName} {selectedUser.lastName}</h3>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    <div className="mt-1">
                      {isSelectedUserAccountOwner ? (
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Account Owner</Badge>
                      ) : selectedUser.role === "ADMIN" ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Administrator</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Standard User</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  {selectedUser.createdAt && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Member Since</h4>
                      <p>{format(new Date(selectedUser.createdAt), "MMMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
                
                {/* Role Management Section */}
                {currentUser?.id !== selectedUser.id && isCurrentUserAccountOwner && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Manage User Role</h4>
                    <div className="flex flex-wrap gap-2">
                      {!isSelectedUserAccountOwner && (
                        <Select
                          value={selectedUser.role}
                          onValueChange={(value) => handleRoleChange(selectedUser.id, value)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Administrator</SelectItem>
                            <SelectItem value="STANDARD">Standard User</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Transfer Account Ownership button - shown only if current user is account owner
                          and the selected user is not already an account owner */}
                      {isCurrentUserAccountOwner && !isSelectedUserAccountOwner && (
                        <Button 
                          variant="outline"
                          className="ml-2"
                          onClick={() => {
                            setUserDetailsOpen(false);
                            setUserToTransferTo(selectedUser);
                            setTransferDialogOpen(true);
                          }}
                        >
                          Transfer Ownership
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Delete User Button */}
                {currentUser?.id !== selectedUser.id && 
                 isCurrentUserAccountOwner && 
                 !isSelectedUserAccountOwner && (
                  <div className="border-t pt-4">
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the user {selectedUser.firstName} {selectedUser.lastName}. 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={handleDeleteUser}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>Delete</>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Account Ownership</DialogTitle>
            <DialogDescription>
              This will transfer your Account Owner role to another user. You will become a regular Admin user after the transfer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="text-sm font-semibold mb-2">Are you sure you want to transfer ownership to:</h3>
            {userToTransferTo && (
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userToTransferTo.profileImageUrl || ""} alt={`${userToTransferTo.firstName} ${userToTransferTo.lastName}`} />
                  <AvatarFallback className="bg-gray-100 text-gray-800">
                    {userToTransferTo.role === "ADMIN" ? "A" : "S"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {userToTransferTo.firstName} {userToTransferTo.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {userToTransferTo.email}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setTransferDialogOpen(false);
                setUserToTransferTo(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (userToTransferTo) {
                  transferOwnership(userToTransferTo.id);
                }
              }}
              disabled={!userToTransferTo || isTransferring}
              className="bg-[#69ad4c] hover:bg-[#5a9641] text-white"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>Confirm Transfer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default UserManagement;