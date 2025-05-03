import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Member, Donation } from "@shared/schema";

// Create a schema that extends the donation schema with UI-specific fields
const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)), "Amount must be a number")
    .refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  donationType: z.string().min(1, "Donation type is required"),
  checkNumber: z.string().optional(),
  notes: z.string().optional(),
  donorType: z.enum(["existing", "new", "visitor"]),
  memberId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  sendNotification: z.boolean().default(true),
})
.refine(
  (data) => {
    if (data.donorType === "existing" && !data.memberId) {
      return false;
    }
    return true;
  },
  {
    message: "Please select a member",
    path: ["memberId"],
  }
)
.refine(
  (data) => {
    if (data.donorType === "new" && (!data.firstName || !data.lastName)) {
      return false;
    }
    return true;
  },
  {
    message: "First and last name are required for new members",
    path: ["firstName"],
  }
)
.refine(
  (data) => {
    if (data.donationType === "CHECK" && !data.checkNumber) {
      return false;
    }
    return true;
  },
  {
    message: "Check number is required for check donations",
    path: ["checkNumber"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface DonationFormProps {
  donationId?: string;
  isEdit?: boolean;
  onClose?: () => void;
}

const DonationForm = ({ donationId, isEdit = false, onClose }: DonationFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  
  // Load members for the dropdown
  const { data: members, isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });
  
  // Load donation data if editing
  const { data: donationData, isLoading: isLoadingDonation } = useQuery<Donation>({
    queryKey: ['/api/donations', donationId],
    enabled: !!donationId,
  });
  
  // React Hook Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: "",
      donationType: "CASH",
      checkNumber: "",
      notes: "",
      donorType: "existing",
      memberId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      sendNotification: true,
    },
  });
  
  // Update form values when editing an existing donation
  useEffect(() => {
    if (donationData && members) {
      let donorType = "visitor";
      if (donationData.memberId) {
        const member = members.find(m => m.id === donationData.memberId);
        if (member) {
          donorType = "existing";
        }
      }
      
      form.reset({
        date: new Date(donationData.date).toISOString().split('T')[0],
        amount: donationData.amount.toString(),
        donationType: donationData.donationType,
        checkNumber: donationData.checkNumber || "",
        notes: donationData.notes || "",
        donorType,
        memberId: donationData.memberId ? donationData.memberId.toString() : "",
        sendNotification: donationData.notificationStatus === "SENT",
      });
    }
  }, [donationData, members, form]);
  
  // Handle donor type changes to show appropriate fields
  const donorType = form.watch("donorType");
  const donationType = form.watch("donationType");
  
  // Create donation mutation
  const createDonationMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // If donor type is new, create a member first
      if (values.donorType === "new") {
        const memberResponse = await apiRequest("POST", "/api/members", {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          isVisitor: false,
        });
        
        if (!memberResponse.ok) {
          throw new Error("Failed to create member");
        }
        
        const newMember = await memberResponse.json();
        
        // Now create the donation with the new member ID
        const donationResponse = await apiRequest("POST", "/api/donations", {
          date: values.date,
          amount: values.amount,
          donationType: values.donationType,
          checkNumber: values.donationType === "CHECK" ? values.checkNumber : null,
          notes: values.notes,
          memberId: newMember.id,
          sendNotification: values.sendNotification,
        });
        
        if (!donationResponse.ok) {
          throw new Error("Failed to create donation");
        }
        
        return donationResponse.json();
      } else {
        // Create donation with existing member or as visitor
        const donationResponse = await apiRequest("POST", "/api/donations", {
          date: values.date,
          amount: values.amount,
          donationType: values.donationType,
          checkNumber: values.donationType === "CHECK" ? values.checkNumber : null,
          notes: values.notes,
          memberId: values.donorType === "existing" ? parseInt(values.memberId!) : null,
          sendNotification: values.sendNotification && values.donorType === "existing",
        });
        
        if (!donationResponse.ok) {
          throw new Error("Failed to create donation");
        }
        
        return donationResponse.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/donations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Success",
        description: "Donation recorded successfully.",
        className: "bg-[#48BB78] text-white",
      });
      
      if (onClose) {
        onClose();
      } else {
        setLocation("/donations");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record donation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    createDonationMutation.mutate(values);
  };
  
  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl font-bold text-[#2D3748]">
          {isEdit ? "Edit Donation" : "Record New Donation"}
        </CardTitle>
        
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {(isLoadingMembers || isLoadingDonation) && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
          </div>
        )}
        
        {!(isLoadingMembers || isLoadingDonation) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Donor Selection */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="donorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Donor</FormLabel>
                      <RadioGroup
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing" />
                          <Label htmlFor="existing">Existing Member</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="new" />
                          <Label htmlFor="new">New Member</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="visitor" id="visitor" />
                          <Label htmlFor="visitor">Visitor/Anonymous</Label>
                        </div>
                      </RadioGroup>
                    </FormItem>
                  )}
                />
                
                {/* Existing Member Selector */}
                {donorType === "existing" && (
                  <FormField
                    control={form.control}
                    name="memberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Member</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a member..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {members?.map((member) => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                {member.firstName} {member.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* New Member Fields */}
                {donorType === "new" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Visitor Information */}
                {donorType === "visitor" && (
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="text-sm text-gray-700">
                      This donation will be recorded as anonymous or from a visitor. No receipt will be generated.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Donation Details */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-[#2D3748] mb-4">Donation Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="donationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CHECK">Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {donationType === "CHECK" && (
                    <FormField
                      control={form.control}
                      name="checkNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <Input {...field} className="pl-7" placeholder="0.00" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {donorType !== "visitor" && (
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="sendNotification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Send email notification</FormLabel>
                            <FormDescription>
                              An email receipt will be sent to the donor via SendGrid
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose || (() => setLocation("/donations"))}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#48BB78] hover:bg-[#48BB78]/90 text-white"
                  disabled={createDonationMutation.isPending}
                >
                  {createDonationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Record Donation
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default DonationForm;
