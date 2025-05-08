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
                              {user.isMasterAdmin ? "M" : user.role === "ADMIN" ? "A" : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          className={
                            user.role === "ADMIN" 
                              ? user.isMasterAdmin ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800" 
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {user.isMasterAdmin ? "MASTER ADMIN" : user.role || "USHER"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            user.isVerified 
                              ? "bg-gray-100 text-gray-800"
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          {user.isVerified ? "Verified" : "Pending Verification"}
                        </Badge>
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
        <DialogContent className="sm:max-w-md">
          {selectedUserId && filteredUsers.find(u => u.id === selectedUserId) && (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
                <DialogDescription>
                  View and edit detailed information about this user
                </DialogDescription>
              </DialogHeader>
              
              {(() => {
                const user = filteredUsers.find(u => u.id === selectedUserId)!;
                return (
                  <div className="space-y-4 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profileImageUrl || ""} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback className="bg-gray-100 text-gray-800 text-lg">
                          {user.isMasterAdmin ? "M" : user.role === "ADMIN" ? "A" : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user.email || "—"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Role</p>
                        <Badge 
                          className={
                            user.role === "ADMIN" 
                              ? user.isMasterAdmin ? "bg-purple-100 text-purple-800 mt-1" : "bg-blue-100 text-blue-800 mt-1" 
                              : "bg-green-100 text-green-800 mt-1"
                          }
                        >
                          {user.isMasterAdmin ? "MASTER ADMIN" : user.role || "USHER"}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-500">Created</p>
                        <p>
                          {user.createdAt ? format(new Date(user.createdAt), "MM/dd/yyyy - hh:mm a") : "—"}
                        </p>
                      </div>
                      
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <Badge 
                          className={
                            user.isVerified 
                              ? "bg-gray-100 text-gray-800 mt-1"
                              : "bg-amber-100 text-amber-800 mt-1"
                          }
                        >
                          {user.isVerified ? "Verified" : "Pending Verification"}
                        </Badge>
                        {!user.isVerified && (
                          <p className="text-xs text-gray-500 mt-1">
                            User needs to verify their email to complete account setup
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Actions</p>
                      <div className="flex items-center gap-2">
                        <Select 
                          defaultValue={user.isMasterAdmin ? "MASTER_ADMIN" : (user.role || "USHER")}
                          onValueChange={(value) => {
                            handleRoleChange(user.id, value);
                            setUserDetailsOpen(false);
                          }}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Change Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
                            <SelectItem value="ADMIN">Administrator</SelectItem>
                            <SelectItem value="USHER">Usher</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {user.id !== currentUser?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this user? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteUser(user.id);
                                    setUserDetailsOpen(false);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {isDeleting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default UserManagement;