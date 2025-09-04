import { useEffect } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Member } from "@shared/schema";

// Create a schema for member form
const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  isVisitor: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MemberFormProps {
  memberId?: string;
  isEdit?: boolean;
  onClose?: () => void;
}

const MemberForm = ({ memberId, isEdit = false, onClose }: MemberFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  
  // Load member data if editing
  const { data: memberData, isLoading: isLoadingMember } = useQuery<Member>({
    queryKey: ['/api/members', memberId],
    enabled: !!memberId,
  });
  
  // React Hook Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      isVisitor: false,
      notes: "",
    },
  });
  
  // Update form values when editing an existing member
  useEffect(() => {
    if (memberData) {
      form.reset({
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email || "",
        phone: memberData.phone || "",
        isVisitor: memberData.isVisitor || false,
        notes: memberData.notes || "",
      });
    }
  }, [memberData, form]);
  
  // Create/Update member mutation
  const memberMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && memberId) {
        const response = await apiRequest("PATCH", `/api/members/${memberId}`, values);
        
        if (!response.ok) {
          throw new Error("Failed to update member");
        }
        
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/members/create", values);
        
        if (!response.ok) {
          throw new Error("Failed to create member");
        }
        
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      toast({
        title: "Success",
        description: isEdit ? "Member updated successfully." : "Member created successfully.",
        className: "bg-[#d35f5f] text-white",
      });
      
      if (onClose) {
        onClose();
      } else {
        setLocation("/members");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? 'update' : 'create'} member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    memberMutation.mutate(values);
  };
  
  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl font-bold text-[#2D3748]">
          {isEdit ? "Edit Member" : "Add New Member"}
        </CardTitle>
        
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoadingMember ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              <FormField
                control={form.control}
                name="isVisitor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as Visitor</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose || (() => setLocation("/members"))}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#d35f5f] hover:bg-[#d35f5f]/90 text-white"
                  disabled={memberMutation.isPending}
                >
                  {memberMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Update Member" : "Add Member"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberForm;
