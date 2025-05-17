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
  Mail,
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
    
    // Force a data refetch after authentication check
    refetchChurch();
  }, [toast, setLocation, refetchChurch]);
  
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
    onSuccess: (data) => {
      toast({
        title: "Status updated",
        description: "Church status has been updated successfully",
      });
      
      // If the church was deleted, redirect back to the churches list
      if (data.status === "DELETED") {
        // Add a small delay to ensure the toast is visible
        setTimeout(() => {
          setLocation("/global-admin/churches");
        }, 1000);
      } else {
        // Otherwise just refetch the church details
        refetchChurch();
      }
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
  
  const formatDate = (dateString: string, includeTime: boolean = false) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      return includeTime 
        ? date.toLocaleDateString() + " " + date.toLocaleTimeString() 
        : date.toLocaleDateString();
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
        
        {/* Vertically Stacked Cards */}
        <div className="space-y-6">
          {/* Church Overview Card */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Church Overview</CardTitle>
                <CardDescription>
                  A summary of the church's activity and key metrics
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {isLoadingChurch ? (
                  <Skeleton className="h-10 w-32" />
                ) : church?.status === "ACTIVE" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-amber-400 hover:bg-amber-500 text-black">Suspend Church</Button>
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
                          className="bg-amber-400 hover:bg-amber-500 text-black"
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
                    <Button className="bg-red-600 hover:bg-red-700 text-white">Delete Church</Button>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
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
              
              <div className="flex flex-col space-y-4 mb-2">
                <h3 className="text-base font-semibold">Subscription Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-amber-500" />
                    <div>
                      <span className="text-muted-foreground">Trial Start Date:</span><br />
                      <span className="font-medium">{isLoadingChurch ? <Skeleton className="h-5 w-32 inline-block" /> : "05/01/2025"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-green-500" />
                    <div>
                      <span className="text-muted-foreground">Subscription Start Date:</span><br />
                      <span className="font-medium">{isLoadingChurch ? <Skeleton className="h-5 w-32 inline-block" /> : "05/15/2025"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-500" />
                    <div>
                      <span className="text-muted-foreground">Last Payment Date:</span><br />
                      <span className="font-medium">{isLoadingChurch ? <Skeleton className="h-5 w-32 inline-block" /> : "05/15/2025"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    <div>
                      <span className="text-muted-foreground">Last Payment Made:</span><br />
                      <span className="font-medium">{isLoadingChurch ? <Skeleton className="h-5 w-32 inline-block" /> : "$25.00"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

          </Card>
          
          {/* Church Users Card */}
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
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="font-bold">
                        <TableHead className="font-bold">User Name</TableHead>
                        <TableHead className="font-bold">Email</TableHead>
                        <TableHead className="font-bold">Role</TableHead>
                        <TableHead className="font-bold text-right">Created</TableHead>
                        <TableHead className="font-bold text-right">Last Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">
                              {user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-1 text-blue-600" />
                              <span>{user.isAccountOwner ? "Account Owner" : "Standard User"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatDate(user.createdAt, false)}</TableCell>
                          <TableCell className="text-right">{user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "Never"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No users found for this church</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}