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
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["ADMIN", "USHER"]),
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
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "USHER",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username*</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email*</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
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
                <FormLabel>First Name*</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
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
                <FormLabel>Last Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
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
              <FormLabel>Role*</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="USHER">Usher</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Administrators can manage all aspects of the system. Ushers can only record donations.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
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
  
  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      return await apiRequest<User[]>('/api/users');
    },
  });
  
  // Create user mutation
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: async (userData: FormValues) => {
      return await apiRequest<User>('/api/users', {
        method: "POST",
        body: userData,
      });
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
      return await apiRequest<void>(`/api/users/${userId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete user",
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
      return await apiRequest<User>(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: { role },
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
                      Add a new user to the system. They'll be able to log in using Replit authentication.
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
                        <div className="flex items-center justify-end gap-2">
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
                          
                          {/* Don't allow deleting self */}
                          {user.id !== currentUser?.id && (
                          <AlertDialog open={deleteDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                            setDeleteDialogOpen(open);
                            if (!open) setSelectedUserId(null);
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setSelectedUserId(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user
                                  account and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteUser}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete User"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          )}
                        </div>
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