import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminAccountDropdown from "@/components/global-admin/GlobalAdminAccountDropdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AtSign,
  Building2,
  Calendar,
  Clock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

// Type definitions
interface Church {
  id: string;
  name: string;
  contactEmail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  totalMembers: number;
  totalDonations: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  isAccountOwner: boolean;
}

export default function ChurchDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the global admin portal",
        variant: "destructive",
      });
      setLocation("/global-admin/login");
    }
  }, [toast, setLocation]);
  
  // Function to fetch church details
  const fetchChurchDetails = async (): Promise<Church> => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const response = await fetch(`/api/global-admin/churches/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch church details");
    }
    
    return response.json();
  };
  
  // Function to fetch church users
  const fetchChurchUsers = async (): Promise<User[]> => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const response = await fetch(`/api/global-admin/churches/${id}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch church users");
    }
    
    return response.json();
  };
  
  // Query to fetch church details
  const {
    data: church,
    isLoading: isLoadingChurch,
    isError: isChurchError,
    error: churchError,
    refetch: refetchChurch,
  } = useQuery<Church, Error>({
    queryKey: ["church", id],
    queryFn: fetchChurchDetails,
  });
  
  // Query to fetch church users
  const {
    data: users,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<User[], Error>({
    queryKey: ["church-users", id],
    queryFn: fetchChurchUsers,
  });
  
  // Mutation to update church status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const token = localStorage.getItem("globalAdminToken");
      if (!token) {
        throw new Error("Authentication required");
      }
      
      const response = await fetch(`/api/global-admin/churches/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to update church status to ${newStatus}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Church status has been updated successfully",
        variant: "default",
      });
      refetchChurch();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update church status",
        variant: "destructive",
      });
    },
  });
  
  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };
  
  const handleBackToDashboard = () => {
    setLocation("/global-admin/dashboard");
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "SUSPENDED":
        return "warning";
      case "DELETED":
        return "destructive";
      default:
        return "secondary";
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // If there's an error, display it
  if (isChurchError) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-destructive">Error</CardTitle>
              <Button variant="outline" size="sm" onClick={handleBackToDashboard}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>{churchError?.message || "Failed to load church details"}</p>
            <Button onClick={() => refetchChurch()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo-with-text.png" 
              alt="PlateSync Logo" 
              className="h-10 object-contain" 
            />
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <h1 className="text-xl font-semibold text-[#69ad4c]">Global Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-300"
              onClick={() => setLocation("/global-admin/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Churches
            </Button>
            <GlobalAdminAccountDropdown 
              adminName="John Spivey" 
              adminEmail="jspivey@spiveyco.com" 
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {isLoadingChurch ? (
                      <Skeleton className="h-8 w-48" />
                    ) : (
                      church?.name
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                    {isLoadingChurch ? (
                      <Skeleton className="h-4 w-32" />
                    ) : (
                      church?.contactEmail
                    )}
                  </CardDescription>
                </div>
                <div className="mt-4 sm:mt-0">
                  {isLoadingChurch ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <Badge variant={getStatusBadgeVariant(church?.status || "") as any} className="text-sm py-1 px-3">
                      {church?.status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="bg-white rounded-md p-1 border">
            <TabsList className="grid grid-cols-3 md:grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Users</CardTitle>
                  <CardDescription>Total registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-2xl font-bold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        church?.userCount || 0
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Members</CardTitle>
                  <CardDescription>Total church members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-2xl font-bold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        church?.totalMembers || 0
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Total Donations</CardTitle>
                  <CardDescription>Lifetime donation amount</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        `$${church?.totalDonations || "0.00"}`
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Church Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">ID:</span>
                      <span className="text-muted-foreground">
                        {isLoadingChurch ? (
                          <Skeleton className="h-4 w-32" />
                        ) : (
                          church?.id
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Status:</span>
                      <span>
                        {isLoadingChurch ? (
                          <Skeleton className="h-4 w-20" />
                        ) : (
                          <Badge variant={getStatusBadgeVariant(church?.status || "") as any}>
                            {church?.status}
                          </Badge>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Created:</span>
                      <span className="text-muted-foreground">
                        {isLoadingChurch ? (
                          <Skeleton className="h-4 w-32" />
                        ) : (
                          formatDate(church?.createdAt || "")
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Last Updated:</span>
                      <span className="text-muted-foreground">
                        {isLoadingChurch ? (
                          <Skeleton className="h-4 w-32" />
                        ) : (
                          formatDate(church?.updatedAt || "")
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Contact:</span>
                      <span className="text-muted-foreground">
                        {isLoadingChurch ? (
                          <Skeleton className="h-4 w-32" />
                        ) : (
                          church?.contactEmail
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end space-x-2">
                {isLoadingChurch ? (
                  <Skeleton className="h-10 w-32" />
                ) : church?.status === "ACTIVE" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="warning">Suspend Church</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Suspend Church</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to suspend {church?.name}? This will prevent all users from accessing the church account until you reactivate it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={() => handleStatusChange("SUSPENDED")}
                        >
                          Suspend
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : church?.status === "SUSPENDED" ? (
                  <Button
                    variant="success"
                    onClick={() => handleStatusChange("ACTIVE")}
                  >
                    Reactivate Church
                  </Button>
                ) : null}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Church</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Church</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {church?.name}? This action is irreversible and will permanently remove all church data, users, members, and donations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleStatusChange("DELETED")}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Church Users</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => refetchUsers()}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isUsersError ? (
                  <div className="text-center py-6">
                    <p className="text-destructive mb-2">{usersError?.message || "Failed to load users"}</p>
                    <Button onClick={() => refetchUsers()} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Try Again
                    </Button>
                  </div>
                ) : isLoadingUsers ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 py-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : "No name provided"}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {user.role?.toLowerCase().replace("_", " ")}
                              </Badge>
                              {user.isAccountOwner && (
                                <Badge variant="secondary" className="ml-2">
                                  Account Owner
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? "success" : "destructive"}>
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No users found for this church.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Church Settings</CardTitle>
                <CardDescription>
                  Configure settings for this church
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  This feature is coming soon.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Church Reports</CardTitle>
                <CardDescription>
                  View reports and analytics for this church
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  This feature is coming soon.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}