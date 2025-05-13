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
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-300"
              onClick={() => setLocation("/global-admin/churches")}
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
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl flex items-center">
                    <Building2 className="h-6 w-6 text-[#69ad4c] mr-2" />
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
                  </CardTitle>
                  {!isLoadingChurch && (
                    <CardDescription className="mt-2 flex items-center">
                      <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                      {church?.contactEmail}
                    </CardDescription>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Users</span>
                    <span className="text-xl font-semibold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-6 w-8" />
                      ) : (
                        church?.userCount || 0
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Members</span>
                    <span className="text-xl font-semibold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-6 w-8" />
                      ) : (
                        church?.totalMembers || 0
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Total Donations</span>
                    <span className="text-xl font-semibold">
                      {isLoadingChurch ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(parseFloat(church?.totalDonations || "0"))
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Created: {isLoadingChurch ? <Skeleton className="h-4 w-24 inline-block" /> : formatDate(church?.createdAt || "")}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Last Updated: {isLoadingChurch ? <Skeleton className="h-4 w-24 inline-block" /> : formatDate(church?.updatedAt || "")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <div className="text-center py-10 text-muted-foreground">
                  Detailed overview is coming soon.
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