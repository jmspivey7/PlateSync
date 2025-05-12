"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronUp,
  Gauge,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Users,
} from "lucide-react";

// Types
interface ChurchWithStats {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  updatedAt: string;
  totalMembers: number;
  totalDonations: string;
  userCount: number;
  lastActivity: string | null;
}

export default function GlobalAdminDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof ChurchWithStats>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch churches data
  const { data: churches = [], isLoading, refetch } = useQuery<ChurchWithStats[]>({
    queryKey: ["/api/global-admin/churches"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle church status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "SUSPENDED":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "DELETED":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Sorting and filtering logic
  const handleSort = (field: keyof ChurchWithStats) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: keyof ChurchWithStats) => {
    if (field !== sortField) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Filter and sort churches
  const filteredAndSortedChurches = churches
    .filter((church) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!church.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Apply status filter
      if (statusFilter && church.status !== statusFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];

      // Handle string comparison
      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sortDirection === "asc"
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }

      // Handle number comparison
      if (typeof fieldA === "number" && typeof fieldB === "number") {
        return sortDirection === "asc" ? fieldA - fieldB : fieldB - fieldA;
      }
      
      // Handle null values
      if (fieldA === null && fieldB !== null) return sortDirection === "asc" ? -1 : 1;
      if (fieldA !== null && fieldB === null) return sortDirection === "asc" ? 1 : -1;
      if (fieldA === null && fieldB === null) return 0;

      // For other types or mixed types (if both values are non-null at this point)
      if (fieldA! < fieldB!) return sortDirection === "asc" ? -1 : 1;
      if (fieldA! > fieldB!) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // Compute stats
  const totalChurches = churches.length;
  const activeChurches = churches.filter(
    (church) => church.status === "ACTIVE"
  ).length;
  const suspendedChurches = churches.filter(
    (church) => church.status === "SUSPENDED"
  ).length;
  const totalMembers = churches.reduce(
    (sum, church) => sum + church.totalMembers,
    0
  );
  const totalDonationsAmount = churches.reduce(
    (sum, church) => sum + parseFloat(church.totalDonations || "0"),
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Global Administration</h1>
          <p className="text-muted-foreground">
            Manage all churches and global system settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/api/global-admin/logout"}
            className="h-9"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Churches</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChurches}</div>
            <p className="text-xs text-muted-foreground">
              {activeChurches} active, {suspendedChurches} suspended
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Across all churches
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDonationsAmount.toString())}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime donations processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground">
              All services running normally
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Churches List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Churches</h2>
            <p className="text-sm text-muted-foreground">
              Manage all registered churches in the system
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search churches..."
                className="pl-8 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter || ""}
              onValueChange={(value) => setStatusFilter(value || null)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="DELETED">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Church
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Church</DialogTitle>
                  <DialogDescription>
                    Create a new church and its initial administrator account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="church-name">Church Name</Label>
                    <Input id="church-name" placeholder="First Baptist Church" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input id="admin-email" type="email" placeholder="admin@church.org" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="admin-first-name">First Name</Label>
                      <Input id="admin-first-name" placeholder="John" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="admin-last-name">Last Name</Label>
                      <Input id="admin-last-name" placeholder="Smith" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admin-password">Initial Password</Label>
                    <Input id="admin-password" type="password" placeholder="•••••••••••" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Church</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="w-[250px] cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Church Name</span>
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[100px] cursor-pointer"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hidden md:table-cell"
                    onClick={() => handleSort("totalMembers")}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Members</span>
                      {getSortIcon("totalMembers")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hidden md:table-cell"
                    onClick={() => handleSort("totalDonations")}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Total Donations</span>
                      {getSortIcon("totalDonations")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hidden md:table-cell"
                    onClick={() => handleSort("lastActivity")}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Last Activity</span>
                      {getSortIcon("lastActivity")}
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading churches...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedChurches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No churches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedChurches.map((church) => (
                    <TableRow key={church.id}>
                      <TableCell className="font-medium">{church.name}</TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusBadgeColor(church.status)}
                          variant="outline"
                        >
                          {church.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {church.totalMembers}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {formatCurrency(church.totalDonations)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {formatDate(church.lastActivity)}
                      </TableCell>
                      <TableCell>
                        <Sheet>
                          <SheetTrigger>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>{church.name}</SheetTitle>
                              <SheetDescription>
                                ID: {church.id}
                              </SheetDescription>
                            </SheetHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h3 className="text-sm font-medium">Status</h3>
                                  <p className="text-sm">
                                    <Badge
                                      className={getStatusBadgeColor(church.status)}
                                      variant="outline"
                                    >
                                      {church.status}
                                    </Badge>
                                  </p>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium">Created</h3>
                                  <p className="text-sm">{formatDate(church.createdAt)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h3 className="text-sm font-medium">Members</h3>
                                  <p className="text-sm">{church.totalMembers}</p>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium">Users</h3>
                                  <p className="text-sm">{church.userCount}</p>
                                </div>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium">Donations Total</h3>
                                <p className="text-sm">{formatCurrency(church.totalDonations)}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium">Last Activity</h3>
                                <p className="text-sm">{formatDate(church.lastActivity)}</p>
                              </div>
                            </div>
                            <div className="mt-6 space-y-2">
                              <Button className="w-full" variant="default">
                                Manage Users
                              </Button>
                              <Button className="w-full" variant="outline">
                                {church.status === "ACTIVE" ? "Suspend" : "Activate"}
                              </Button>
                              <Button className="w-full" variant="outline">
                                View Details
                              </Button>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}