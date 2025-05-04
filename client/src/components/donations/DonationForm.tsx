import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ComboboxSearch } from "@/components/ui/combobox-search";
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
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Member, Donation, Batch } from "@shared/schema";

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
  // Skip email validation completely since we handle it in the submission function
  email: z.string().optional(),
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
  /** Set to true when this form is used inside a Dialog component */
  isInsideDialog?: boolean;
}

const DonationForm = ({ donationId, isEdit = false, onClose, defaultBatchId, isInsideDialog = false }: DonationFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  
  // State to force re-render of member combobox when form is reset
  const [comboboxKey, setComboboxKey] = useState(0);
  
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
  
  // Initialize form with today's date, will be updated with batch date when available
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
  
  // Load specific batch data if defaultBatchId is provided
  const { data: specificBatch, isLoading: isLoadingSpecificBatch } = useQuery<Batch>({
    queryKey: ['/api/batches', defaultBatchId?.toString()],
    enabled: !!defaultBatchId,
  });
  
  // Set form default batch value when current batch is loaded
  useEffect(() => {
    if (!isEdit) {
      // If defaultBatchId is provided, use it and get batch info from specific query
      if (defaultBatchId && specificBatch) {
        console.log("Using provided default batch ID:", defaultBatchId.toString());
        form.setValue("batchId", defaultBatchId.toString());
        
        // Get batch info to set the date
        if (specificBatch.date) {
          // Handle timezone issues by adding a day offset
          const dateString = specificBatch.date.toString();
          let dateObj = new Date(dateString);
          
          // Adjust for timezone offset if needed
          // This ensures the date displayed is the same as the one set in the batch
          const batchDate = format(dateObj, 'yyyy-MM-dd');
          
          // Check if the formatted date matches what we expect from the batch name
          // Batch name typically contains the date in "Month Day, Year" format
          const expectedDateMatch = specificBatch.name.match(/,\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
          if (expectedDateMatch) {
            const [, month, day, year] = expectedDateMatch;
            // Use the date from the name if available
            const monthIndex = new Date(`${month} 1, 2000`).getMonth();
            dateObj = new Date(parseInt(year), monthIndex, parseInt(day));
          }
          
          const correctedDate = format(dateObj, 'yyyy-MM-dd');
          console.log("Setting date from specific batch:", correctedDate, "Original date:", specificBatch.date);
          form.setValue("date", correctedDate);
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
            // Handle timezone issues by extracting date from batch name
            const dateString = currentBatch.date.toString();
            let dateObj = new Date(dateString);
            
            // Check if the formatted date matches what we expect from the batch name
            // Batch name typically contains the date in "Month Day, Year" format
            const expectedDateMatch = currentBatch.name.match(/,\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
            if (expectedDateMatch) {
              const [, month, day, year] = expectedDateMatch;
              // Use the date from the name if available
              const monthIndex = new Date(`${month} 1, 2000`).getMonth();
              dateObj = new Date(parseInt(year), monthIndex, parseInt(day));
            }
            
            const correctedDate = format(dateObj, 'yyyy-MM-dd');
            console.log("Setting date from current batch:", correctedDate, "Original date:", currentBatch.date);
            form.setValue("date", correctedDate);
          }
        }
      }
    }
  }, [currentBatch, specificBatch, form, isEdit, defaultBatchId]);
  
  // When batch selection changes, update the date field
  useEffect(() => {
    if (!isEdit) {
      const batchId = form.watch("batchId");
      if (batchId && batchId !== "none") {
        const selectedBatch = batches?.find(batch => batch.id === parseInt(batchId));
        if (selectedBatch && selectedBatch.date) {
          // Handle timezone issues by extracting date from batch name
          const dateString = selectedBatch.date.toString();
          let dateObj = new Date(dateString);
          
          // Check if the date matches what we expect from the batch name
          const expectedDateMatch = selectedBatch.name.match(/,\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
          if (expectedDateMatch) {
            const [, month, day, year] = expectedDateMatch;
            // Use the date from the name if available
            const monthIndex = new Date(`${month} 1, 2000`).getMonth();
            dateObj = new Date(parseInt(year), monthIndex, parseInt(day));
          }
          
          const correctedDate = format(dateObj, 'yyyy-MM-dd');
          console.log("Setting date from batch selection:", correctedDate, "Original date:", selectedBatch.date);
          form.setValue("date", correctedDate);
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
  
  // Handle form field changes to show appropriate fields
  const formDonorType = form.watch("donorType");
  const donationType = form.watch("donationType");
  
  // Create/update donation mutation
  const createDonationMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log("Form submission attempt with values:", values);
      
      // Get any form errors before submitting
      const formErrors = form.formState.errors;
      if (Object.keys(formErrors).length > 0) {
        console.error("Submit clicked but form has errors:", formErrors);
        throw new Error("Form has validation errors");
      }
      
      // If we're in edit mode and have a donation ID
      if (isEdit && donationId) {
        // Update existing donation
        const donationResponse = await fetch(`/api/donations/${donationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: values.date,
            amount: values.amount,
            donationType: values.donationType,
            checkNumber: values.donationType === "CHECK" ? values.checkNumber : null,
            notes: values.notes,
            memberId: values.donorType === "existing" ? parseInt(values.memberId!) : null,
            batchId: values.batchId && values.batchId !== "none" ? parseInt(values.batchId) : null,
            sendNotification: values.sendNotification && values.donorType === "existing"
          })
        });
        
        if (!donationResponse.ok) {
          throw new Error("Failed to update donation");
        }
        
        return donationResponse.json();
      }
      // If donor type is new, create a member first
      else if (values.donorType === "new") {
        // For new members, we need to ensure email is valid
        if (values.email && values.email.trim() !== "" && !values.email.includes("@")) {
          throw new Error("Please provide a valid email address for new members");
        }
        
        const memberResponse = await fetch("/api/members", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email || null, // Use null if email is empty
            phone: values.phone || null, // Use null if phone is empty
            isVisitor: false
          })
        });
        
        if (!memberResponse.ok) {
          throw new Error("Failed to create member");
        }
        
        const newMember = await memberResponse.json();
        
        // Now create the donation with the new member ID
        const donationResponse = await fetch("/api/donations", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: values.date,
            amount: values.amount,
            donationType: values.donationType,
            checkNumber: values.donationType === "CHECK" ? values.checkNumber : null,
            notes: values.notes,
            memberId: newMember.id,
            batchId: values.batchId && values.batchId !== "none" ? parseInt(values.batchId) : null,
            sendNotification: values.sendNotification
          })
        });
        
        if (!donationResponse.ok) {
          throw new Error("Failed to create donation");
        }
        
        return { donation: await donationResponse.json(), newMember: true };
      } else {
        // Create donation with existing member or as visitor
        const donationResponse = await fetch("/api/donations", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: values.date,
            amount: values.amount,
            donationType: values.donationType,
            checkNumber: values.donationType === "CHECK" ? values.checkNumber : null,
            notes: values.notes || "", 
            memberId: values.donorType === "existing" ? parseInt(values.memberId!) : null,
            batchId: values.batchId && values.batchId !== "none" ? parseInt(values.batchId) : null,
            sendNotification: values.sendNotification && values.donorType === "existing"
          })
        });
        
        if (!donationResponse.ok) {
          throw new Error("Failed to create donation");
        }
        
        return { donation: await donationResponse.json(), existingMember: values.donorType === "existing" };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/donations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // If we have a batch ID, invalidate that batch's data
      const batchId = form.getValues("batchId");
      if (batchId && batchId !== "none") {
        queryClient.invalidateQueries({ queryKey: ['/api/batches', batchId] });
        queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      }
      
      // For normal editing operations
      if (isEdit) {
        toast({
          title: "Success",
          description: "Donation updated successfully.",
          className: "bg-[#48BB78] text-white",
        });
        
        // For edit mode, navigate back to donations list
        setLocation("/donations");
      } 
      // For "Record & Next" flow, show targeted message and reset form
      else {
        // Get donor name for message if it's an existing member
        let donorName = "";
        const memberId = form.getValues("memberId");
        if (memberId && members) {
          const member = members.find(m => m.id.toString() === memberId);
          if (member) {
            donorName = `for ${member.firstName} ${member.lastName}`;
          }
        }
        
        // Show message with amount
        const amount = form.getValues("amount");
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(amount));
        
        toast({
          title: "Donation Recorded",
          description: `${formattedAmount} ${donorName} recorded. Ready for next donation.`,
          className: "bg-[#48BB78] text-white",
        });
        
        // Reset form for next entry but keep the batchId as it should stay the same for all entries
        const currentBatchId = form.getValues("batchId");
        const currentDate = form.getValues("date");
        
        // First manually reset the amount field to ensure it's cleared
        form.setValue("amount", "");
        
        // Reset form completely
        form.reset({
          date: currentDate,
          amount: "",  // Setting explicitly to empty string
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
          batchId: currentBatchId,
        });
        
        // Force a re-render of the amount field
        setTimeout(() => {
          form.setValue("amount", "");
        }, 0);
        
        // Increment combobox key to force re-render
        setComboboxKey(prevKey => prevKey + 1);
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
    <Card className={`${isInsideDialog ? 'mb-0' : 'mb-8'}`}>
      {!isInsideDialog && (
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xl font-bold text-[#2D3748]">
            {isEdit ? "Edit Donation" : "Record New Donation"}
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent>
        {(isLoadingMembers || isLoadingDonation || isLoadingBatches || isLoadingCurrentBatch || isLoadingSpecificBatch) && (
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
                
                {/* Existing Member Selector with Custom Combobox */}
                {formDonorType === "existing" && (
                  <FormField
                    control={form.control}
                    name="memberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Member</FormLabel>
                        <FormControl>
                          {members && (
                            <ComboboxSearch
                              key={comboboxKey}
                              options={members.map(member => ({
                                value: member.id.toString(),
                                label: `${member.firstName} ${member.lastName}`
                              }))}
                              value={field.value || ""}
                              onValueChange={(value) => {
                                field.onChange(value);
                                console.log("Selected member ID:", value);
                              }}
                              placeholder="Type to search for members..."
                              className="w-full"
                            />
                          )}
                        </FormControl>
                        <FormDescription>
                          {field.value && members ? (
                            <span className="text-sm text-green-700 font-medium">
                              Selected: {members.find(m => m.id.toString() === field.value)?.firstName} {members.find(m => m.id.toString() === field.value)?.lastName}
                            </span>
                          ) : (
                            "Start typing to search for members by name"
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* New Member Form */}
                {formDonorType === "new" && (
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
                {formDonorType === "visitor" && (
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
                        <FormLabel>Donation Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
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
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="0.00" 
                            step="0.01" 
                            type="number"
                            value={field.value || ""} // Ensure it's never undefined
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
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
                  
                  {/* Hidden fields - don't use Input component with type="hidden" */}
                  <input type="hidden" name="batchId" value={form.getValues("batchId")} />
                  <input type="hidden" name="notes" value={form.getValues("notes") || ""} />
                  {formDonorType === "existing" && (
                    <input
                      type="hidden"
                      name="sendNotification"
                      value={form.getValues("sendNotification") ? "true" : "false"}
                    />
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    // If inside dialog, use onClose to close the dialog
                    if (isInsideDialog && onClose) {
                      onClose();
                    } 
                    // Otherwise navigate based on the batch ID
                    else if (defaultBatchId) {
                      setLocation(`/batch/${defaultBatchId}`);
                    } else {
                      setLocation("/counts");
                    }
                  }}
                >
                  Back to Count Summary
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                  disabled={createDonationMutation.isPending}
                  onClick={() => {
                    // Log form state before submission
                    console.log("Form state:", form.getValues());
                    console.log("Form errors:", form.formState.errors);
                    // Don't use preventDefault() as we want the normal form submit to happen
                  }}
                >
                  {createDonationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? "Updating..." : "Recording..."}
                    </>
                  ) : (
                    isEdit ? "Update Donation" : "Record & Next"
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