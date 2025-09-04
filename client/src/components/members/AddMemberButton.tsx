import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddMemberButtonProps {
  onMemberAdded?: (memberId: string) => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddMemberButton({ 
  onMemberAdded, 
  variant = "default", 
  size = "default",
  className = ""
}: AddMemberButtonProps) {
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for adding new member
  const addMemberMutation = useMutation({
    mutationFn: async (memberData: { firstName: string; lastName: string; email?: string; phone?: string }) => {
      const response = await fetch("/api/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to add member");
      return await response.json();
    },
    onSuccess: (newMember) => {
      // Invalidate members query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Call callback if provided
      if (onMemberAdded) {
        onMemberAdded(newMember.id.toString());
      }
      
      // Close dialog and reset form
      setShowAddMemberDialog(false);
      setNewMemberData({ firstName: "", lastName: "", email: "", phone: "" });
      
      toast({
        title: "Member Added",
        description: `${newMember.firstName} ${newMember.lastName} has been added successfully.`,
        className: 'bg-[#d35f5f] text-white',
      });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Member",
        description: error instanceof Error ? error.message : "Failed to add member",
        variant: "destructive",
      });
    }
  });

  const handleAddMember = () => {
    setShowAddMemberDialog(true);
  };

  const handleSaveMember = () => {
    if (!newMemberData.firstName.trim() || !newMemberData.lastName.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      firstName: newMemberData.firstName.trim(),
      lastName: newMemberData.lastName.trim(),
      email: newMemberData.email.trim() || undefined,
      phone: newMemberData.phone.trim() || undefined,
    });
  };

  const handleDialogClose = () => {
    setShowAddMemberDialog(false);
    setNewMemberData({ firstName: "", lastName: "", email: "", phone: "" });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleAddMember}
        className={className}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add Member
      </Button>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Add a new member to your church directory. First name and last name are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newMemberData.firstName}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newMemberData.lastName}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newMemberData.email}
                onChange={(e) => setNewMemberData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Mobile Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={newMemberData.phone}
                onChange={(e) => setNewMemberData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter mobile phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMember} 
              disabled={addMemberMutation.isPending}
              className="bg-[#4299E1] hover:bg-[#3182CE]"
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}