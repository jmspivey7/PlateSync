import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, AlertCircle, ExternalLink, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  externalSystem: string | null;
  createdAt: string;
};

type DuplicateCandidateGroup = {
  name: string;
  count: number;
  members: Member[];
};

type DuplicateCandidatesListProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DuplicateCandidatesList({ open, onOpenChange }: DuplicateCandidatesListProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery<{ success: boolean; duplicateGroups: DuplicateCandidateGroup[] }>({
    queryKey: ['/api/members/potential-duplicates'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/members/potential-duplicates', 'GET');
        return response;
      } catch (error) {
        console.error('Error fetching duplicate candidates:', error);
        throw error;
      }
    },
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const duplicateGroups = data?.duplicateGroups || [];
  const totalDuplicates = duplicateGroups.reduce((acc, group) => acc + group.count, 0);
  const groupsCount = duplicateGroups.length;

  const toggleExpand = (name: string) => {
    if (expandedGroups.includes(name)) {
      setExpandedGroups(expandedGroups.filter(g => g !== name));
    } else {
      setExpandedGroups([...expandedGroups, name]);
    }
  };

  const hasExternalSource = (member: Member) => {
    return member.externalId && member.externalSystem;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
            Potential Duplicate Members
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            These members have matching names but may be distinct individuals. Review carefully before taking action.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 rounded-md">
            Error loading duplicate candidates: {(error as Error)?.message || "Unknown error"}
          </div>
        ) : duplicateGroups.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center">
                <Info className="h-12 w-12 text-red-600" />
              </div>
              <p className="mt-4 text-lg font-medium">No potential duplicates found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your member database appears to be free of duplicate entries.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm text-muted-foreground">
                  Found {groupsCount} group{groupsCount !== 1 ? 's' : ''} with potential duplicates 
                  ({totalDuplicates} members total)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {duplicateGroups.map((group) => (
                <Card key={group.name}>
                  <CardHeader className="pb-2">
                    <CardTitle 
                      className="text-base font-medium flex items-center justify-between cursor-pointer" 
                      onClick={() => toggleExpand(group.name)}
                    >
                      <div>
                        {group.name}
                        <Badge variant="outline" className="ml-2">
                          {group.count} members
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(group.name);
                        }}
                      >
                        {expandedGroups.includes(group.name) ? "Hide" : "View"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  
                  {expandedGroups.includes(group.name) && (
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.id}</TableCell>
                              <TableCell>
                                {member.firstName} {member.lastName}
                              </TableCell>
                              <TableCell>
                                {member.email || member.phone ? (
                                  <div className="text-xs">
                                    {member.email && <div>{member.email}</div>}
                                    {member.phone && <div>{member.phone}</div>}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No contact info</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasExternalSource(member) ? (
                                  <Badge variant="outline" className="text-xs">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    {member.externalSystem}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Manual</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-xs">
                                  {formatDate(new Date(member.createdAt))}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}