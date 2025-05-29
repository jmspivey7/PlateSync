import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { MemberSearchSelect } from "@/components/ui/member-search-select";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { User, UserCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ThumbsUp } from "lucide-react";
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
  
  // State for showing the success thumbs-up indicator
  const [showSuccess, setShowSuccess] = useState(false);
  
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
      donationType: "CHECK", // Default to Check as requested
      checkNumber: "",
      notes: "",
      donorType: "existing", // Default to Existing Member
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
        
        // Get batch info to set the date - DIRECT FROM BATCH NAME
        if (specificBatch.name) {
          try {
            // The batch name format is "Service Type, Month Day, Year"
            // Parse that directly to get the correct date
            const nameParts = specificBatch.name.split(',');
            if (nameParts.length >= 3) {
              // Get month and day from the middle part, year from the last part
              const monthDay = nameParts[1].trim();
              const year = nameParts[2].trim();
              
              // Create the date string in YYYY-MM-DD format
              // First parse it with JS Date
              const datePart = `${monthDay} ${year}`;
              console.log("Parsing date directly from batch name:", datePart);
              
              // Explicitly extract month, day, year using month names
              const monthNames = ["January", "February", "March", "April", "May", "June",
                                 "July", "August", "September", "October", "November", "December"];
              
              // Extract month and day from the string like "May 3"
              const monthDayRegex = /([A-Za-z]+)\s+(\d+)/;
              const monthDayMatch = monthDay.match(monthDayRegex);
              
              if (monthDayMatch) {
                const [, monthName, dayStr] = monthDayMatch;
                const yearNum = parseInt(year);
                
                // Find month index (0-11)
                const monthIndex = monthNames.findIndex(m => 
                  monthName.toLowerCase() === m.toLowerCase() || 
                  (monthName.length >= 3 && m.toLowerCase().startsWith(monthName.toLowerCase()))
                );
                
                if (monthIndex !== -1) {
                  // JS months are 0-indexed
                  const month = monthIndex + 1;
                  const day = parseInt(dayStr);
                  
                  // Create date in YYYY-MM-DD format manually
                  const formattedDate = `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  console.log("Setting date from specific batch name:", formattedDate);
                  form.setValue("date", formattedDate);
                }
              }
            }
          } catch (error) {
            console.error("Error parsing date from batch name:", error);
            // If there's an error, still try to use the date field as fallback
            if (specificBatch.date) {
              const dateObj = new Date(specificBatch.date.toString());
              const fallbackDate = format(dateObj, 'yyyy-MM-dd');
              console.log("Using fallback date from batch date field:", fallbackDate);
              form.setValue("date", fallbackDate);
            }
          }
        }
      }
      // Otherwise, use current batch if available
      else if (currentBatch) {
        // Only set if not already set or if set to empty string
        const currentBatchId = form.getValues("batchId");
        if (!currentBatchId || currentBatchId === "") {
          console.log("Setting default batch ID:", currentBatch.id.toString());
          form.setValue("batchId", currentBatch.id.toString());
          
          // Set date to match batch date - DIRECT FROM BATCH NAME
          if (currentBatch.name) {
            try {
              // The batch name format is "Service Type, Month Day, Year"
              // Parse that directly to get the correct date
              const nameParts = currentBatch.name.split(',');
              if (nameParts.length >= 3) {
                // Get month and day from the middle part, year from the last part
                const monthDay = nameParts[1].trim();
                const year = nameParts[2].trim();
                
                // Create the date string in YYYY-MM-DD format
                const datePart = `${monthDay} ${year}`;
                console.log("Parsing date directly from current batch name:", datePart);
                
                // Explicitly extract month, day, year using month names
                const monthNames = ["January", "February", "March", "April", "May", "June",
                                   "July", "August", "September", "October", "November", "December"];
                
                // Extract month and day from the string like "May 3"
                const monthDayRegex = /([A-Za-z]+)\s+(\d+)/;
                const monthDayMatch = monthDay.match(monthDayRegex);
                
                if (monthDayMatch) {
                  const [, monthName, dayStr] = monthDayMatch;
                  const yearNum = parseInt(year);
                  
                  // Find month index (0-11)
                  const monthIndex = monthNames.findIndex(m => 
                    monthName.toLowerCase() === m.toLowerCase() || 
                    (monthName.length >= 3 && m.toLowerCase().startsWith(monthName.toLowerCase()))
                  );
                  
                  if (monthIndex !== -1) {
                    // JS months are 0-indexed
                    const month = monthIndex + 1;
                    const day = parseInt(dayStr);
                    
                    // Create date in YYYY-MM-DD format manually
                    const formattedDate = `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    console.log("Setting date from current batch name:", formattedDate);
                    form.setValue("date", formattedDate);
                  }
                }
              }
            } catch (error) {
              console.error("Error parsing date from current batch name:", error);
              // If there's an error, still try to use the date field as fallback
              if (currentBatch.date) {
                const dateObj = new Date(currentBatch.date.toString());
                const fallbackDate = format(dateObj, 'yyyy-MM-dd');
                console.log("Using fallback date from current batch date field:", fallbackDate);
                form.setValue("date", fallbackDate);
              }
            }
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
        if (selectedBatch && selectedBatch.name) {
          try {
            // The batch name format is "Service Type, Month Day, Year"
            // Parse that directly to get the correct date
            const nameParts = selectedBatch.name.split(',');
            if (nameParts.length >= 3) {
              // Get month and day from the middle part, year from the last part
              const monthDay = nameParts[1].trim();
              const year = nameParts[2].trim();
              
              // Create the date string in YYYY-MM-DD format
              const datePart = `${monthDay} ${year}`;
              console.log("Parsing date directly from selected batch name:", datePart);
              
              // Explicitly extract month, day, year using month names
              const monthNames = ["January", "February", "March", "April", "May", "June",
                                 "July", "August", "September", "October", "November", "December"];
              
              // Extract month and day from the string like "May 3"
              const monthDayRegex = /([A-Za-z]+)\s+(\d+)/;
              const monthDayMatch = monthDay.match(monthDayRegex);
              
              if (monthDayMatch) {
                const [, monthName, dayStr] = monthDayMatch;
                const yearNum = parseInt(year);
                
                // Find month index (0-11)
                const monthIndex = monthNames.findIndex(m => 
                  monthName.toLowerCase() === m.toLowerCase() || 
                  (monthName.length >= 3 && m.toLowerCase().startsWith(monthName.toLowerCase()))
                );
                
                if (monthIndex !== -1) {
                  // JS months are 0-indexed
                  const month = monthIndex + 1;
                  const day = parseInt(dayStr);
                  
                  // Create date in YYYY-MM-DD format manually
                  const formattedDate = `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  console.log("Setting date from selected batch name:", formattedDate);
                  form.setValue("date", formattedDate);
                }
              }
            }
          } catch (error) {
            console.error("Error parsing date from selected batch name:", error);
            // If there's an error, still try to use the date field as fallback
            if (selectedBatch.date) {
              const dateObj = new Date(selectedBatch.date.toString());
              const fallbackDate = format(dateObj, 'yyyy-MM-dd');
              console.log("Using fallback date from selected batch date field:", fallbackDate);
              form.setValue("date", fallbackDate);
            }
          }
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
  
  // Auto-set donation type to CASH when donor type is Cash (visitor)
  useEffect(() => {
    if (formDonorType === "visitor") {
      form.setValue("donationType", "CASH");
    }
  }, [formDonorType, form]);
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
        
        const memberResponse = await fetch("/api/members/create", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
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
        // Show success indicator (thumbs-up) briefly instead of toast
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 1000); // Hide after 1 second
        
        // First check if we should close the dialog instead of navigating
        if (onClose && isInsideDialog) {
          onClose();
        } else {
          // Otherwise navigate back to donations list for standalone form
          setLocation("/donations");
        }
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
        
        // Show success indicator (thumbs-up) briefly instead of toast
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 1000); // Hide after 1 second
        
        // Reset form for next entry but keep the batchId as it should stay the same for all entries
        const currentBatchId = form.getValues("batchId");
        const currentDate = form.getValues("date");
        const currentDonorType = form.getValues("donorType");
        
        // First manually reset the amount field to ensure it's cleared
        form.setValue("amount", "");
        
        // Reset form completely, but maintain current donor type if it's cash
        form.reset({
          date: currentDate,
          amount: "",  // Setting explicitly to empty string
          // Set donation type based on donor type
          donationType: currentDonorType === "visitor" ? "CASH" : "CHECK",
          checkNumber: "",
          notes: "",
          // Keep Cash (visitor) selection if that was the current donor type
          donorType: currentDonorType === "visitor" ? "visitor" : "existing",
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
    <Card className={`${isInsideDialog ? 'mb-0 border-0 shadow-none' : 'mb-8'}`}>
      {!isInsideDialog && (
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xl font-bold text-[#2D3748]">
            {isEdit ? "Edit Donation" : "Record New Donation"}
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={`${isInsideDialog ? 'p-4 sm:p-6' : 'p-4 sm:p-5 md:p-4'}`}>
        {(isLoadingMembers || isLoadingDonation || isLoadingBatches || isLoadingCurrentBatch || isLoadingSpecificBatch) && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
          </div>
        )}
        
        {!(isLoadingMembers || isLoadingDonation || isLoadingBatches || isLoadingCurrentBatch) && (
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3 sm:space-y-4 md:space-y-3"
            >
              {/* Donor Selection */}
              <div className="space-y-3 md:space-y-2">
                <FormField
                  control={form.control}
                  name="donorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">Donor Type:</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="lg"
                          value={field.value}
                          onValueChange={(value) => {
                            if (value) field.onChange(value);
                          }}
                          className="justify-start gap-3 my-2"
                        >
                          <ToggleGroupItem 
                            value="existing" 
                            className={`flex items-center gap-2 flex-1 ${field.value === "existing" ? "border-green-500 bg-[#69ad4c] text-white font-semibold" : "bg-gray-50 border border-gray-200 hover:bg-green-50"}`}
                            aria-label="Existing Member"
                          >
                            {/* Force icon to always be visible using solid green color */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#69ad4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                              <circle cx="12" cy="8" r="5" />
                              <path d="M20 21a8 8 0 0 0-16 0" />
                            </svg>
                            <span>Existing Member</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem 
                            value="new" 
                            className={`flex items-center gap-2 flex-1 ${field.value === "new" ? "border-blue-500 bg-blue-500 text-white font-semibold" : "bg-gray-50 border border-gray-200 hover:bg-blue-50"}`}
                            aria-label="Known Visitor"
                          >
                            {/* Force icon to display in all states */}
                            <UserPlus className={`h-5 w-5 ${field.value === "new" ? "text-white" : "text-blue-600"}`} />
                            <span>Known Visitor</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem 
                            value="visitor" 
                            className={`flex items-center gap-2 flex-1 ${field.value === "visitor" ? "border-slate-500 bg-slate-600 text-white font-semibold" : "bg-gray-50 border border-gray-200 hover:bg-gray-100"}`}
                            aria-label="Cash"
                          >
                            {/* Force icon to display in all states */}
                            <User className={`h-5 w-5 ${field.value === "visitor" ? "text-white" : "text-slate-600"}`} />
                            <span>Cash</span>
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
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
                        <FormLabel className="font-bold">Select Member:</FormLabel>
                        <FormControl>
                          {members && members.length > 0 ? (
                            <MemberSearchSelect
                              members={members}
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              placeholder="Type to search for members..."
                            />
                          ) : (
                            <div className="border rounded-md p-3 bg-amber-50 border-amber-200">
                              <p className="text-sm text-amber-800">
                                No members found in your church. To add members, go to the <strong>Members</strong> tab.
                              </p>
                            </div>
                          )}
                        </FormControl>
                        <FormDescription>
                          {members && members.length > 0 ? (
                            field.value && members ? (
                              <span className="text-sm text-green-700 font-medium">
                                Selected: {members.find(m => m.id.toString() === field.value)?.firstName} {members.find(m => m.id.toString() === field.value)?.lastName}
                              </span>
                            ) : (
                              "Start typing to search for members by name"
                            )
                          ) : null}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Known Visitor Form */}
                {formDonorType === "new" && (
                  <div className="space-y-3 md:space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">First Name:</FormLabel>
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
                            <FormLabel className="font-bold">Last Name:</FormLabel>
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
                          <FormLabel className="font-bold">Email Address:</FormLabel>
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
                          <FormLabel className="font-bold">Phone Number:</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Cash Donation Information */}
                {formDonorType === "visitor" && (
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="text-sm text-gray-700">
                      This will be recorded as a cash donation. No receipt will be generated.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Donation Details */}
              <div className="pt-3 md:pt-2 border-t border-gray-200">
                <h3 className="text-lg font-medium text-[#2D3748] mb-3 md:mb-2">Donation Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 max-w-full overflow-hidden px-1">

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Date:</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date" 
                            className="w-full max-w-[90%] text-left sm:w-full"
                            style={{ 
                              textAlign: 'left', 
                              MozAppearance: 'textfield',
                              WebkitAppearance: 'none',
                              direction: 'ltr',
                              width: '90%'
                            }} 
                          />
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
                        <FormLabel className="font-bold">Donation Type:</FormLabel>
                        {formDonorType === "visitor" ? (
                          // For Cash donations, show a read-only field that's always CASH
                          <FormControl>
                            <Input value="Cash" readOnly className="bg-gray-50 w-full max-w-[90%]" style={{ width: '90%' }} />
                          </FormControl>
                        ) : (
                          // For all other donor types, show the normal dropdown
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full max-w-[90%]" style={{ width: '90%' }}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CASH">Cash</SelectItem>
                              <SelectItem value="CHECK">Check</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Amount:</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="0.00" 
                            step="0.01" 
                            type="number"
                            className="w-full max-w-[90%] text-left"
                            style={{ width: '90%', textAlign: 'left' }}
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
                          <FormLabel className="font-bold">Check Number:</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              className="w-full max-w-[90%] text-left"
                              style={{ width: '90%', textAlign: 'left' }} 
                            />
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
              
              <div className="mt-4 md:mt-3 relative">
                {/* Success indicator - appears briefly above buttons, aligned right */}
                {showSuccess && (
                  <div className="flex justify-end mb-2">
                    <ThumbsUp className="h-6 w-6 text-green-500 animate-fade-in-out" />
                  </div>
                )}
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="mb-2 sm:mb-0 h-12"
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
                    className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white h-12"
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
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default DonationForm;