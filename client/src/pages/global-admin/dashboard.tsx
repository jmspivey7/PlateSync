import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Building2,
  ChevronDown,
  ChevronUp,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Type definitions
interface Church {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  totalMembers: number;
  totalDonations: string;
  lastActivity: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ChurchesResponse {
  churches: Church[];
  pagination: PaginationData;
}

export default function GlobalAdminDashboard() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // State for pagination, filtering, and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to access the global admin dashboard",
        variant: "destructive",
      });
      setLocation("/global-admin/login");
    }
  }, [toast, setLocation]);
  
  // Function to fetch churches with the API
  const fetchChurches = async (): Promise<ChurchesResponse> => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });
    
    if (search) queryParams.append("search", search);
    if (status) queryParams.append("status", status);
    
    const response = await fetch(`/api/global-admin/churches?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch churches");
    }
    
    return response.json();
  };
  
  // Query to fetch churches
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ChurchesResponse, Error>({
    queryKey: ["churches", page, limit, search, status, sortBy, sortOrder],
    queryFn: fetchChurches,
  });
  
  const handleLogout = () => {
    localStorage.removeItem("globalAdminToken");
    toast({
      title: "Logged out",
      description: "You have been logged out of the global admin portal",
    });
    setLocation("/global-admin/login");
  };
  
  const handleCreateChurch = () => {
    setLocation("/global-admin/churches/new");
  };
  
  const handleViewChurch = (churchId: string) => {
    setLocation(`/global-admin/churches/${churchId}`);
  };
  
  const handleToggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  
  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
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
  
  // If there's an error, display it
  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message}</p>
            <Button onClick={() => refetch()} className="mt-4">
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
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Building2 className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-semibold">PlateSync Global Admin</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Churches</CardTitle>
              <CardDescription>All registered churches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  data?.pagination.total || 0
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Churches</CardTitle>
              <CardDescription>Churches with active status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  data?.churches.filter(c => c.status === "ACTIVE").length || 0
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Suspended Churches</CardTitle>
              <CardDescription>Churches with suspended status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-500">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  data?.churches.filter(c => c.status === "SUSPENDED").length || 0
                )}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Churches</CardTitle>
              <Button onClick={handleCreateChurch} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-1" />
                Add Church
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and filter controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search churches..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1.5 h-7 w-7 p-0"
                    onClick={() => setSearch("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="DELETED">Deleted</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={limit.toString()} onValueChange={(val) => setLimit(parseInt(val))}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Table of churches */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px] cursor-pointer" onClick={() => handleToggleSort("name")}>
                      <div className="flex items-center">
                        Name
                        {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleToggleSort("status")}>
                      <div className="flex items-center">
                        Status
                        {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Total Donations</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleToggleSort("createdAt")}>
                      <div className="flex items-center">
                        Created
                        {getSortIcon("createdAt")}
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeletons
                    Array.from({ length: limit }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-9 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : data?.churches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No churches found. Add a new church to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    // Church data
                    data?.churches.map((church) => (
                      <TableRow key={church.id}>
                        <TableCell className="font-medium">{church.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(church.status) as any}>
                            {church.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{church.userCount}</TableCell>
                        <TableCell className="text-right">{church.totalMembers}</TableCell>
                        <TableCell className="text-right">${church.totalDonations}</TableCell>
                        <TableCell>
                          {new Date(church.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewChurch(church.id)}
                            >
                              View
                            </Button>
                            
                            {church.status === "ACTIVE" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-600 border-amber-600 hover:bg-amber-50"
                                  >
                                    Suspend
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Suspend Church</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to suspend {church.name}? This will prevent all users from accessing the church account until you reactivate it.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-amber-600 hover:bg-amber-700">
                                      Suspend
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            {church.status === "SUSPENDED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {page > 1 && (
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setPage(page - 1)} />
                      </PaginationItem>
                    )}
                    
                    {/* Generate page links */}
                    {Array.from(
                      { length: Math.min(5, data.pagination.totalPages) },
                      (_, i) => {
                        // Logic to show pages around the current page
                        let pageNum = i + 1;
                        if (data.pagination.totalPages > 5) {
                          if (page > 3) {
                            pageNum = page - 3 + i;
                          }
                          if (page > data.pagination.totalPages - 2) {
                            pageNum = data.pagination.totalPages - 4 + i;
                          }
                        }
                        
                        return (
                          pageNum > 0 && pageNum <= data.pagination.totalPages && (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                isActive={pageNum === page}
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        );
                      }
                    )}
                    
                    {page < data.pagination.totalPages && (
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage(page + 1)} />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}