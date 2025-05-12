import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  ChevronRight,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Users,
  XCircle,
} from "lucide-react";

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

export default function ChurchDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/global-admin/churches/:id");
  const churchId = params?.id;

  // Redirect if no church ID
  useEffect(() => {
    if (!churchId) {
      setLocation("/global-admin/dashboard");
    }
  }, [churchId, setLocation]);

  // Fetch church details with stats
  const { data: church, isLoading, error } = useQuery<ChurchWithStats>({
    queryKey: [`/api/global-admin/churches/${churchId}`],
    enabled: !!churchId,
    retry: 1,
  });

  // Status badge renderer
  const renderStatusBadge = (status?: Church["status"]) => {
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
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-xl font-medium">Loading church details...</p>
        </div>
      </div>
    );
  }

  if (error || !church) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Button variant="outline" onClick={() => setLocation("/global-admin/dashboard")} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Church</CardTitle>
            <CardDescription>
              There was a problem loading the church details. The church may have been deleted or you may not have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/global-admin/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => setLocation("/global-admin/dashboard")} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Church Details</h1>
              <ChevronRight className="h-5 w-5 mx-2 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">{church.name}</h2>
              <div className="ml-3">{renderStatusBadge(church.status)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Church Profile */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Church Profile</CardTitle>
                <CardDescription>Basic information about the church</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    {church.logoUrl ? (
                      <AvatarImage src={church.logoUrl} alt={church.name} />
                    ) : (
                      <AvatarFallback className="text-2xl">
                        {church.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-base">{church.name}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p className="text-base">{church.contactEmail}</p>
                    </div>
                  </div>

                  {church.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p className="text-base">{church.phone}</p>
                      </div>
                    </div>
                  )}

                  {(church.address || church.city || church.state) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p className="text-base">
                          {[
                            church.address,
                            [church.city, church.state].filter(Boolean).join(", "),
                            church.zipCode
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {church.denomination && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Denomination</p>
                      <p className="text-base">{church.denomination}</p>
                    </div>
                  )}

                  {church.websiteUrl && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Website</p>
                      <a 
                        href={church.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-base text-primary hover:underline"
                      >
                        {church.websiteUrl}
                      </a>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p className="text-base">
                        {new Date(church.registrationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {church.lastLoginDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                      <p className="text-base">
                        {new Date(church.lastLoginDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats & Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Church Statistics</CardTitle>
                <CardDescription>Overview of activity and data</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Members
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-primary mr-2" />
                            <p className="text-2xl font-bold">{church.totalMembers}</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Users
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-blue-500 mr-2" />
                            <p className="text-2xl font-bold">{church.userCount}</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Donations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                            <p className="text-2xl font-bold">
                              ${parseFloat(church.totalDonations).toLocaleString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Current Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            {church.status === "ACTIVE" && (
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            )}
                            {church.status === "SUSPENDED" && (
                              <XCircle className="h-5 w-5 text-yellow-500 mr-2" />
                            )}
                            {church.status === "DELETED" && (
                              <XCircle className="h-5 w-5 text-red-500 mr-2" />
                            )}
                            <p className="text-lg font-semibold">{church.status}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {church.notes && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-medium mb-2">Church Notes</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {church.notes}
                          </p>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="activity" className="space-y-4 pt-4">
                    <div>
                      <h3 className="font-medium mb-2">Recent Activity</h3>
                      {church.lastActivity ? (
                        <p>
                          Last activity recorded on{" "}
                          <span className="font-semibold">
                            {new Date(church.lastActivity).toLocaleDateString()}
                          </span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">No recent activity recorded</p>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Church Timeline</h3>
                      <div className="space-y-3">
                        <div className="flex">
                          <div className="w-12 flex-shrink-0 text-sm text-muted-foreground">
                            Created
                          </div>
                          <div>
                            {new Date(church.registrationDate).toLocaleDateString()}
                          </div>
                        </div>
                        {church.updatedAt && (
                          <div className="flex">
                            <div className="w-12 flex-shrink-0 text-sm text-muted-foreground">
                              Updated
                            </div>
                            <div>
                              {new Date(church.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        {church.lastLoginDate && (
                          <div className="flex">
                            <div className="w-12 flex-shrink-0 text-sm text-muted-foreground">
                              Login
                            </div>
                            <div>
                              {new Date(church.lastLoginDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        {church.deletedAt && (
                          <div className="flex">
                            <div className="w-12 flex-shrink-0 text-sm text-muted-foreground">
                              Deleted
                            </div>
                            <div>
                              {new Date(church.deletedAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {church.status === "DELETED" && church.archiveUrl && (
                      <div>
                        <h3 className="font-medium mb-2">Archived Data</h3>
                        <Button size="sm" variant="outline" asChild>
                          <a href={church.archiveUrl} target="_blank" rel="noopener noreferrer">
                            Download Archive
                          </a>
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}