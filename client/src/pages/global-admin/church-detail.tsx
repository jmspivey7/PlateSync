import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  
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
      const statusText = data.status === "ACTIVE" ? "activated" : 
                        data.status === "SUSPENDED" ? "suspended" : "deleted";
      
      toast({
        title: `Church ${statusText}`,
        description: `${church?.name} has been ${statusText} successfully`,
      });
      
      // Invalidate both queries to ensure the churches list is refreshed
      queryClient.invalidateQueries({ queryKey: ["churches"] });
      
      // If the church was deleted or suspended, redirect back to the churches list
      if (data.status === "DELETED" || data.status === "SUSPENDED") {
        // Add a small delay to ensure the toast is visible
        setTimeout(() => {
          setLocation("/global-admin/churches");
        }, 1500);
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

  // Mutation for purging church data (both church and users)
  const purgeChurchMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("globalAdminToken");
      if (!token) throw new Error("Authentication required");
      
      const response = await fetch(`/api/global-admin/churches/${id}/purge`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purge church data");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Church data purged",
        description: `${church?.name} and all its users have been permanently deleted for testing purposes`,
      });
      
      // Invalidate queries to ensure the churches list is refreshed
      queryClient.invalidateQueries({ queryKey: ["churches"] });
      
      // Redirect back to the churches list
      setTimeout(() => {
        setLocation("/global-admin/churches");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Purge failed",
        description: error.message || "Failed to purge church data",
        variant: "destructive",
      });
    },
  });
  
  // Function to handle purging church data
  const purgeChurchData = () => {
    purgeChurchMutation.mutate();
  };
  
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
              alt="PlateSYNQ Logo" 
              className="h-10 object-contain" 
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold text-[#d35f5f]">Global Administration</h1>
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
            <Building2 className="h-7 w-7 text-[#d35f5f] mr-3" />
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
                      ? "bg-red-500" 
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
                ) : (
                  <>
                    {/* Purge Data Button - Only visible for DELETED churches */}
                    {church?.status === "DELETED" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="bg-purple-600 text-white hover:bg-purple-700"
                          >
                            Purge Data
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <p>This action will permanently delete <strong>ALL</strong> data associated with this church:</p>
                              <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>All user accounts</li>
                                <li>All members</li>
                                <li>All donations</li>
                                <li>All batches</li>
                                <li>All service options</li>
                                <li>Planning Center integrations</li>
                                <li>Subscription data</li>
                              </ul>
                              <p className="mt-3 font-bold text-destructive">This action cannot be undone and is intended for testing purposes only.</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => purgeChurchData()}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Purge All Data
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    {/* Status Change Buttons */}
                    {church?.status === "ACTIVE" ? (
                      <>
                        {/* Suspend Church Button */}
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
                        
                        {/* Delete Church Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="bg-red-500 hover:bg-red-600 text-white">Delete Church</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Church</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {church?.name}? This will mark the church as deleted and remove it from active churches.
                                <p className="mt-2 font-medium">Note: The data will still exist in the database. To completely remove all data, use the Purge Data function after deletion.</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => handleStatusChange("DELETED")}
                              >
                                Delete Church
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : church?.status === "SUSPENDED" ? (
                      <>
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleStatusChange("ACTIVE")}
                        >
                          Reactivate Church
                        </Button>
                        
                        {/* Delete Church Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="bg-red-500 hover:bg-red-600 text-white">Delete Church</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Church</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {church?.name}? This will mark the church as deleted and remove it from active churches.
                                <p className="mt-2 font-medium">Note: The data will still exist in the database. To completely remove all data, use the Purge Data function after deletion.</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => handleStatusChange("DELETED")}
                              >
                                Delete Church
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="text-base font-medium mb-2">Church Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col px-6 py-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Contact Email</span>
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      {isLoadingChurch ? (
                        <Skeleton className="h-6 w-full" />
                      ) : (
                        <a href={`mailto:${church?.contactEmail}`} className="text-blue-600 hover:underline">
                          {church?.contactEmail}
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col px-6 py-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Created On</span>
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {isLoadingChurch ? (
                        <Skeleton className="h-6 w-36" />
                      ) : (
                        formatDate(church?.createdOn || church?.createdAt || "", false)
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col px-6 py-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Last Finalized Count</span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      {isLoadingChurch ? (
                        <Skeleton className="h-6 w-36" />
                      ) : (
                        formatDate(church?.lastUpdated || church?.updatedAt || "", true)
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-base font-medium mb-2">Key Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </CardContent>
          </Card>
          
          {/* Church Users Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-[#d35f5f]" />
                    Church Users
                  </CardTitle>
                  <CardDescription>All users associated with this church</CardDescription>
                </div>
                <div className="flex items-center">
                  <div className="px-3 py-1 bg-gray-100 rounded-md text-sm font-medium flex items-center">
                    <span>{isLoadingUsers ? "..." : users?.filter(user => !user.email || !user.email.startsWith('INACTIVE_')).length || 0} Users</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : isUsersError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700">Failed to load users. Please try again.</p>
                </div>
              ) : users && users.filter(user => !user.email || !user.email.startsWith('INACTIVE_')).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(user => !user.email || !user.email.startsWith('INACTIVE_')).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.firstName || ""} {user.lastName || ""}</span>
                              <span className="text-sm text-muted-foreground flex items-center">
                                <AtSign className="h-3 w-3 mr-1" />
                                {user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {(user.isAccountOwner || user.role === "ACCOUNT_OWNER") && (
                                <Shield className="h-4 w-4 mr-1 text-purple-600" />
                              )}
                              <span>
                                {user.role === "ACCOUNT_OWNER" || user.isAccountOwner ? "Account Owner" :
                                 user.role === "ADMIN" ? "Administrator" : 
                                 user.role === "STANDARD_USER" ? "Standard User" : 
                                 "Standard User"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>{formatDate(user.updatedAt)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className="bg-red-100 text-red-800 hover:bg-red-100"
                            >
                              Verified
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-gray-300 rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-900">No users found</h3>
                  <p className="text-sm text-gray-500 mt-1">This church doesn't have any users yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}