import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminAccountDropdown from "@/components/global-admin/GlobalAdminAccountDropdown";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
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
  
  // Function to fetch churches
  const fetchChurches = async (): Promise<ChurchesResponse> => {
    const token = localStorage.getItem("globalAdminToken");
    if (!token) {
      throw new Error("Authentication required");
    }
    
    let url = `/api/global-admin/churches?page=${page}&limit=${limit}`;
    
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }
    
    if (statusFilter && statusFilter !== "all") {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }
    
    const response = await fetch(url, {
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
    queryKey: ["churches", page, limit, searchTerm, statusFilter],
    queryFn: fetchChurches,
    keepPreviousData: true,
  });
  
  const handleDetailView = (id: string) => {
    setLocation(`/global-admin/churches/${id}`);
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit));
    setPage(1);
  };
  
  const handleLogout = () => {
    localStorage.removeItem("globalAdminToken");
    setLocation("/global-admin/login");
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  };
  
  const formatCurrency = (amount: string) => {
    if (!amount) return "$0.00";
    
    try {
      // Convert string to number and format as currency
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(parseFloat(amount));
    } catch (error) {
      return "$0.00";
    }
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
          <GlobalAdminAccountDropdown 
            adminName="Global Admin" 
            adminEmail="admin@platesync.com" 
          />
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Card className="border-gray-200 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#69ad4c]/10 to-[#69ad4c]/5 border-b border-gray-200">
              <CardTitle className="text-[#4a8330]">Global Administrator Dashboard</CardTitle>
              <CardDescription>
                Manage all churches and users in the PlateSync platform
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        
        <div className="mb-6">
          <Card className="border-gray-200 shadow-md overflow-hidden">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-[#4a8330]">Churches Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search churches by name or email..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        refetch();
                      }
                    }}
                  />
                </div>
                
                <div className="w-full sm:w-48">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="DELETED">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {isError ? (
                <div className="text-center py-10">
                  <p className="text-destructive mb-4">{error?.message || "Failed to load churches"}</p>
                  <Button 
                    onClick={() => refetch()} 
                    className="bg-[#69ad4c] hover:bg-[#5a9440]"
                  >
                    Try Again
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="rounded-md border">
                    <div className="h-10 px-4 flex items-center bg-muted/50">
                      <Skeleton className="h-4 w-32" />
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 px-4 flex items-center border-t">
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-48" />
                  </div>
                </div>
              ) : data && data.churches.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Church Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Users</TableHead>
                          <TableHead className="hidden md:table-cell">Created</TableHead>
                          <TableHead className="hidden md:table-cell">Last Activity</TableHead>
                          <TableHead className="hidden lg:table-cell text-right">Donations</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.churches.map((church) => (
                          <TableRow key={church.id}>
                            <TableCell className="font-medium truncate max-w-[200px]">
                              {church.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(church.status) as any}>
                                {church.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center items-center">
                                <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                                {church.userCount}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {formatDate(church.createdAt)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {formatDate(church.lastActivity || church.updatedAt)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right">
                              {formatCurrency(church.totalDonations)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
                                onClick={() => handleDetailView(church.id)}
                              >
                                Details <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {data.pagination && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{" "}
                        {Math.min(
                          data.pagination.page * data.pagination.limit,
                          data.pagination.total
                        )}{" "}
                        of {data.pagination.total} churches
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(1)}
                          disabled={data.pagination.page === 1}
                        >
                          <ChevronFirst className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(data.pagination.page - 1)}
                          disabled={data.pagination.page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <span className="text-sm">
                          Page {data.pagination.page} of {data.pagination.totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(data.pagination.page + 1)}
                          disabled={data.pagination.page === data.pagination.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(data.pagination.totalPages)}
                          disabled={data.pagination.page === data.pagination.totalPages}
                        >
                          <ChevronLast className="h-4 w-4" />
                        </Button>
                        
                        <Select
                          value={limit.toString()}
                          onValueChange={handleLimitChange}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder={limit.toString()} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No churches found. Try a different search term or filter.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}