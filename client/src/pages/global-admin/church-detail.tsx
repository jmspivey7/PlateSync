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
      return;
    }
    
    // If we have a token but are getting a 404, try refreshing the token
    const refreshToken = () => {
      // Simple refresh by checking localStorage again
      const currentToken = localStorage.getItem("globalAdminToken");
      if (currentToken) {
        // Force a data refetch
        refetchChurch?.();
      }
    };
    
    refreshToken();
  }, [toast, setLocation, refetchChurch]);
  
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
  } = useQuery<User[], Error>({
    queryKey: ["church-users", id],
    queryFn: fetchChurchUsers,
    enabled: !!church, // Only fetch users if church details are loaded
  });
  
  // Mutation to update church status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const token = localStorage.getItem("globalAdminToken");
      if (!token) throw new Error("Authentication required");
      
      const response = await fetch(`/api/global-admin/churches/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Church status has been updated successfully",
      });
      
      // Refetch church details to show updated status
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
  
  const handleBackToChurches = () => {
    setLocation("/global-admin/churches");
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
              <Button variant="outline" size="sm" onClick={handleBackToChurches}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Churches
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
          <div className="flex-1">
            <img 
              src="/logo-with-text.png" 
              alt="PlateSync Logo" 
              className="h-10 object-contain" 
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold text-[#69ad4c]">Global Administration</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <GlobalAdminAccountDropdown 
              adminName="John Spivey" 
              adminEmail="jspivey@spiveyco.com" 
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Building2 className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">
              {isLoadingChurch ? (
                <Skeleton className="h-8 w-64" />
              ) : (
                church?.name
              )}
              {church?.status && (
                <Badge 
                  className={`ml-3 ${
                    church.status === "ACTIVE" 
                      ? "bg-green-500" 
                      : church.status === "SUSPENDED" 
                      ? "bg-amber-500" 
                      : "bg-red-500"
                  }`}
                >
                  {church.status}
                </Badge>
              )}
            </h2>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="border-gray-300"
            onClick={() => setLocation("/global-admin/churches")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Churches
          </Button>
        </div>
        

        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Church Overview</CardTitle>
                <CardDescription>
                  A summary of the church's activity and key metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span className="text-base">
                    {isLoadingChurch ? <Skeleton className="h-5 w-48 inline-block" /> : church?.contactEmail}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex flex-col px-6 py-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Users</span>
                    <span className="text-2xl font-semibold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        church?.userCount || 0
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col px-6 py-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Members</span>
                    <span className="text-2xl font-semibold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        church?.totalMembers || 0
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col px-6 py-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Donations</span>
                    <span className="text-2xl font-semibold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(parseFloat(church?.totalDonations || "0"))
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 mb-6 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    <div>
                      <span className="text-muted-foreground">Created:</span><br />
                      <span className="font-medium">{isLoadingChurch ? <Skeleton className="h-5 w-32 inline-block" /> : formatDate(church?.createdAt || "")}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span><br />
                      <span className="font-medium">{isLoadingChurch ? <Skeleton className="h-5 w-32 inline-block" /> : formatDate(church?.updatedAt || "")}</span>
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
                      <Button variant="outline" className="border-amber-500 text-amber-500">Suspend Church</Button>
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
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/10"
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
                        Are you sure you want to delete {church?.name}? This action cannot be undone and all data will be permanently removed.
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
                <CardTitle>Church Users</CardTitle>
                <CardDescription>
                  Manage user accounts for this church
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="hidden md:table-cell">Created</TableHead>
                          <TableHead className="hidden md:table-cell">Last Login</TableHead>
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
                              {user.isActive ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
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