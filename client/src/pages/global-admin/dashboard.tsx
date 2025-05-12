import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MoreHorizontal,
  LogOut,
  CheckCircle,
  XCircle,
  Archive,
  Eye,
  RefreshCw,
  Trash,
  Building,
  Users,
  DollarSign
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Type definitions for church data from API
interface Church {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  contactEmail: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string;
  websiteUrl?: string;
  denomination?: string;
  notes?: string;
  membersCount: number;
  accountOwnerId?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginDate?: string;
  registrationDate: string;
  deletedAt?: string;
  archiveUrl?: string;
}

interface ChurchWithStats extends Church {
  totalMembers: number;
  totalDonations: string;
  userCount: number;
  lastActivity: string | null;
}

export default function GlobalAdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "activate" | "delete" | null>(null);

  // Fetch all churches
  const { data: churches, isLoading, error } = useQuery<Church[]>({
    queryKey: ["/api/global-admin/churches"],
    retry: 1,
  });

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      setLocation("/global-admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Action mutations
  const suspendMutation = useMutation({
    mutationFn: async (churchId: string) => {
      const response = await fetch(`/api/global-admin/churches/${churchId}/suspend`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to suspend church");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-admin/churches"] });
      toast({
        title: "Church suspended",
        description: `${selectedChurch?.name} has been suspended successfully.`,
      });
      setConfirmDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to suspend church",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (churchId: string) => {
      const response = await fetch(`/api/global-admin/churches/${churchId}/activate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to activate church");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-admin/churches"] });
      toast({
        title: "Church activated",
        description: `${selectedChurch?.name} has been activated successfully.`,
      });
      setConfirmDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to activate church",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (churchId: string) => {
      const response = await fetch(`/api/global-admin/churches/${churchId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete church");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-admin/churches"] });
      toast({
        title: "Church deleted",
        description: `${selectedChurch?.name} has been deleted successfully.`,
      });
      setConfirmDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete church",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/global-admin/migrate-churches", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to migrate churches");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-admin/churches"] });
      toast({
        title: "Migration complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Migration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dialog confirmation handler
  const handleConfirmAction = () => {
    if (!selectedChurch) return;
    
    switch (confirmAction) {
      case "suspend":
        suspendMutation.mutate(selectedChurch.id);
        break;
      case "activate":
        activateMutation.mutate(selectedChurch.id);
        break;
      case "delete":
        deleteMutation.mutate(selectedChurch.id);
        break;
      default:
        setConfirmDialogOpen(false);
    }
  };

  // Status badge renderer
  const renderStatusBadge = (status: Church["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Active</Badge>;
      case "SUSPENDED":
        return <Badge variant="secondary" className="bg-yellow-500 text-black">Suspended</Badge>;
      case "DELETED":
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="text-xl font-medium">Loading churches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>
              There was a problem loading the churches data. You may need to log in again.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/global-admin/churches"] })}>
              Retry
            </Button>
            <Button onClick={() => setLocation("/global-admin/login")}>Return to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PlateSync Global Administrator</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-2" />
            Log Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Churches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-primary mr-2" />
                  <p className="text-2xl font-bold">{churches?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Churches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-2xl font-bold">
                    {churches?.filter(c => c.status === "ACTIVE").length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Suspended Churches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-yellow-500 mr-2" />
                  <p className="text-2xl font-bold">
                    {churches?.filter(c => c.status === "SUSPENDED").length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Deleted Churches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Archive className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-2xl font-bold">
                    {churches?.filter(c => c.status === "DELETED").length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Churches Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Churches</CardTitle>
                <Button size="sm" onClick={() => migrateMutation.mutate()} disabled={migrateMutation.isPending}>
                  {migrateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    "Migrate Legacy Data"
                  )}
                </Button>
              </div>
              <CardDescription>
                Manage all church accounts in the system. View details, suspend accounts or archive deleted churches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {churches && churches.length > 0 ? (
                    churches.map((church) => (
                      <TableRow key={church.id}>
                        <TableCell className="font-medium">{church.name}</TableCell>
                        <TableCell>{renderStatusBadge(church.status)}</TableCell>
                        <TableCell>{church.contactEmail}</TableCell>
                        <TableCell>{new Date(church.registrationDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/global-admin/churches/${church.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              
                              {church.status === "ACTIVE" && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedChurch(church);
                                    setConfirmAction("suspend");
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="text-yellow-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Suspend Church
                                </DropdownMenuItem>
                              )}
                              
                              {church.status === "SUSPENDED" && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedChurch(church);
                                    setConfirmAction("activate");
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate Church
                                </DropdownMenuItem>
                              )}
                              
                              {(church.status === "ACTIVE" || church.status === "SUSPENDED") && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedChurch(church);
                                    setConfirmAction("delete");
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete Church
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No churches found. You may need to migrate legacy data first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "suspend" && "Suspend Church"}
              {confirmAction === "activate" && "Activate Church"}
              {confirmAction === "delete" && "Delete Church"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "suspend" && 
                `Are you sure you want to suspend ${selectedChurch?.name}? This will prevent all users from accessing their account.`
              }
              {confirmAction === "activate" && 
                `Are you sure you want to activate ${selectedChurch?.name}? This will restore access to all users.`
              }
              {confirmAction === "delete" && 
                `Are you sure you want to delete ${selectedChurch?.name}? This action cannot be undone. The church data will be archived.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={
                (confirmAction === "suspend" && suspendMutation.isPending) ||
                (confirmAction === "activate" && activateMutation.isPending) ||
                (confirmAction === "delete" && deleteMutation.isPending)
              }
            >
              {(
                (confirmAction === "suspend" && suspendMutation.isPending) ||
                (confirmAction === "activate" && activateMutation.isPending) ||
                (confirmAction === "delete" && deleteMutation.isPending)
              ) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}