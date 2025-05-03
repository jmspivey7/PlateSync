import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
// Removing custom combobox in favor of direct Shadcn component usage
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
import { X, Loader2, Check, ChevronsUpDown, User } from "lucide-react";
import { useLocation } from "wouter";
import { Member, Donation, Batch } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  batchId: z.string().optional(),
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
  defaultBatchId?: number;
}

const DonationForm = ({ donationId, isEdit = false, onClose, defaultBatchId }: DonationFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  
  // Load members for the dropdown
  const { data: members, isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });
  
  // Load donation data if editing
  const { data: donationData, isLoading: isLoadingDonation } = useQuery<Donation>({
    queryKey: donationId ? [`/api/donations/${donationId}`] : ['/api/donations'],
    enabled: !!donationId,
  });
  
  // React Hook Form setup
  // Load batches for dropdown
  const { data: batches, isLoading: isLoadingBatches } = useQuery<Batch[]>({
    queryKey: ['/api/batches'],
  });

  // Get current batch for default selection
  const { data: currentBatch, isLoading: isLoadingCurrentBatch } = useQuery<Batch>({
    queryKey: ['/api/batches/current'],
  });
  
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
      batchId: "",
    },
  });
  
  // Set form default batch value when current batch is loaded
  useEffect(() => {
    if (!isEdit) {
      // If defaultBatchId is provided, use it
      if (defaultBatchId) {
        console.log("Using provided default batch ID:", defaultBatchId.toString());
        form.setValue("batchId", defaultBatchId.toString());
        
        // Get batch info to set the date
        const selectedBatch = batches?.find(batch => batch.id === defaultBatchId);
        if (selectedBatch && selectedBatch.date) {
          const batchDate = format(new Date(selectedBatch.date), 'yyyy-MM-dd');
          form.setValue("date", batchDate);
        }
      }
      // Otherwise, use current batch if available
      else if (currentBatch) {
        // Only set if not already set or if set to empty string
        const currentBatchId = form.getValues("batchId");
        if (!currentBatchId || currentBatchId === "") {
          console.log("Setting default batch ID:", currentBatch.id.toString());
          form.setValue("batchId", currentBatch.id.toString());
          
          // Set date to match batch date
          if (currentBatch.date) {
            const batchDate = format(new Date(currentBatch.date), 'yyyy-MM-dd');
            form.setValue("date", batchDate);
          }
        }
      }
    }
  }, [currentBatch, batches, form, isEdit, defaultBatchId]);
  
  // When batch selection changes, update the date field
  useEffect(() => {
    if (!isEdit) {
      const batchId = form.watch("batchId");
      if (batchId && batchId !== "none") {
        const selectedBatch = batches?.find(batch => batch.id === parseInt(batchId));
        if (selectedBatch && selectedBatch.date) {
          const batchDate = format(new Date(selectedBatch.date), 'yyyy-MM-dd');
          form.setValue("date", batchDate);
        }
      }
    }
  }, [form.watch("batchId"), batches, form, isEdit]);
  
  // Update form values when editing an existing donation
  useEffect(() => {
    if (donationData && members) {
      // Add some debugging to see what we're getting
      console.log("Donation data received:", donationData);
      
      // Handle case where API returns an array instead of a single donation
      let singleDonation: Donation;
      if (Array.isArray(donationData)) {
        console.log("Donation data is an array, using first item");
        if (donationData.length === 0) return;
        singleDonation = donationData[0];
      } else {
        singleDonation = donationData;
      }
      
      // Set donor type based on member existence
      let donorTypeValue: "existing" | "new" | "visitor" = "visitor";
      if (singleDonation.memberId) {
        const member = members.find(m => m.id === singleDonation.memberId);
        if (member) {
          donorTypeValue = "existing";
        }
      }
      
      // Safely format the date to YYYY-MM-DD format
      let formattedDate = "";
      try {
        if (singleDonation.date) {
          // First try to parse as ISO string
          if (typeof singleDonation.date === 'string') {
            formattedDate = format(parseISO(singleDonation.date), 'yyyy-MM-dd');
          } else {
            // If it's already a Date object
            formattedDate = format(new Date(singleDonation.date), 'yyyy-MM-dd');
          }
        } else {
          // If no date, use current date
          formattedDate = format(new Date(), 'yyyy-MM-dd');
        }
      } catch (error) {
        console.error("Error parsing date:", error);
        // Fallback to current date if parsing fails
        formattedDate = format(new Date(), 'yyyy-MM-dd');
      }
      
      // Ensure all values are properly defined with fallbacks
      const formValues = {
        date: formattedDate,
        amount: singleDonation.amount !== undefined ? singleDonation.amount.toString() : "",
        donationType: singleDonation.donationType || "CASH",
        checkNumber: singleDonation.checkNumber || "",
        notes: singleDonation.notes || "",
        donorType: donorTypeValue,
        memberId: singleDonation.memberId ? singleDonation.memberId.toString() : "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        sendNotification: singleDonation.notificationStatus === "SENT",
        batchId: singleDonation.batchId ? singleDonation.batchId.toString() : "",
      };
      
      // Reset the form with the prepared values
      form.reset(formValues);
    }
  }, [donationData, members, form]);
  
  // Handle donor type changes to show appropriate fields
  const donorType = form.watch("donorType");
  const donationType = form.watch("donationType");
  
  // Create/update donation mutation
  const createDonationMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // If we're in edit mode and have a donation ID
      if (isEdit && donationId) {
        // Update existing donation
        const donationResponse = await apiRequest("PATCH", `/api/donations/${donationId}`, {
          date: values.date,
          amount: values.amount,
          donationType: values.donationType,
          checkNumber: values.donationType === "CHECK" ? values.checkNumber : null,
          notes: values.notes,
          memberId: values.donorType === "existing" ? parseInt(values.memberId!) : null,
          batchId: values.batchId && values.batchId !== "none" ? parseInt(values.batchId) : null,
          sendNotification: values.sendNotification && values.donorType === "existing",
        });
        
        if (!donationResponse.ok) {
          throw new Error("Failed to update donation");
        }
        
        return donationResponse.json();
      }
      // If donor type is new, create a member first
      else if (values.donorType === "new") {
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
          batchId: values.batchId && values.batchId !== "none" ? parseInt(values.batchId) : null,
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
          batchId: values.batchId && values.batchId !== "none" ? parseInt(values.batchId) : null,
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
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      
      toast({
        title: "Success",
        description: isEdit 
          ? "Donation updated successfully." 
          : "Donation recorded successfully.",
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
        description: `Failed to ${isEdit ? 'update' : 'record'} donation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    console.log("Form validated and submitting with values:", values);
    // Add additional logging to trace submission flow
    try {
      createDonationMutation.mutate(values);
    } catch (error) {
      console.error("Error during mutation submission:", error);
      toast({
        title: "Submission Error",
        description: "There was a problem submitting the form. Please try again.",
        variant: "destructive",
      });
    }
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
        {(isLoadingMembers || isLoadingDonation || isLoadingBatches || isLoadingCurrentBatch) && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
          </div>
        )}
        
        {!(isLoadingMembers || isLoadingDonation || isLoadingBatches || isLoadingCurrentBatch) && (
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
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
                
                {/* Existing Member Selector with Typeahead */}
                {donorType === "existing" && (
                  <FormField
                    control={form.control}
                    name="memberId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Select Member</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value && members
                                  ? members.find(member => member.id.toString() === field.value)
                                    ? `${members.find(member => member.id.toString() === field.value)?.firstName} ${members.find(member => member.id.toString() === field.value)?.lastName}`
                                    : "Select a member..."
                                  : "Select a member..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search members..." />
                              <CommandEmpty>No member found.</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-y-auto">
                                {members?.map((member) => (
                                  <CommandItem
                                    key={member.id}
                                    value={`${member.firstName} ${member.lastName}`}
                                    onSelect={() => {
                                      field.onChange(member.id.toString());
                                      console.log("Member selected:", member.id.toString());
                                    }}
                                  >
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{member.firstName} {member.lastName}</span>
                                    {member.id.toString() === field.value && (
                                      <Check className="ml-auto h-4 w-4" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Type to search for members by name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* New Member Form */}
                {donorType === "new" && (
                  <div className="space-y-4">
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
                    </div>
                    
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
                
                {/* Batch selection - hide when defaultBatchId is provided */}
                {!defaultBatchId && (
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="batchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch (Optional)</FormLabel>
                          <Select
                            value={field.value || "none"} 
                            onValueChange={(val) => {
                              console.log("Batch selection changed to:", val);
                              field.onChange(val);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a batch..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None (Add to batch later)</SelectItem>
                              {batches && batches.length > 0 ? (
                                batches.map((batch) => (
                                  <SelectItem key={batch.id} value={batch.id.toString()}>
                                    {batch.name} {batch.status !== "FINALIZED" ? `(${batch.status})` : ""}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No batches available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {currentBatch ? 
                              `Current open batch: ${currentBatch.name}` : 
                              "No open batch available. You can create one in the Batches section."}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
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
                  onClick={(e) => {
                    // Manual form validation check - if there are errors, log them
                    if (Object.keys(form.formState.errors).length > 0) {
                      console.error("Submit clicked but form has errors:", form.formState.errors);
                    } else {
                      console.log("Form submission attempt with values:", form.getValues());
                    }
                    // Don't use preventDefault() as we want the normal form submit to happen
                  }}
                >
                  {createDonationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? "Updating..." : "Recording..."}
                    </>
                  ) : (
                    isEdit ? "Update Donation" : "Record Donation"
                  )}
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