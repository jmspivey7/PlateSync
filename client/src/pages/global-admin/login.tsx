import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import plateSyncLogo from "../../assets/platesync-logo.png";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, KeyRound, Eye, EyeOff } from "lucide-react";

// Form validation schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GlobalAdminLogin() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("globalAdminToken");
    if (token) {
      setLocation("/global-admin/dashboard");
    }
  }, [setLocation]);
  
  // Initialize form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/global-admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      // Handle successful login
      const data = await response.json();
      
      // Save token to localStorage
      localStorage.setItem("globalAdminToken", data.token);
      
      // Redirect to dashboard
      setLocation("/global-admin/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-4">
        <Card className="border-gray-200 shadow-xl">
          <CardHeader className="space-y-1">
            <div className="text-center mb-4">
              <img 
                src={plateSyncLogo} 
                alt="PlateSYNQ Logo" 
                className="mx-auto h-[5.25rem]"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-[#69ad4c]">Global Admin Portal</CardTitle>
            <CardDescription className="text-center">
              Login to access the PlateSYNQ administration dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="" 
                            className="pl-9"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="" 
                            className="pl-9 pr-9"
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button
                    variant="link"
                    type="button"
                    className="text-sm text-[#69ad4c] hover:text-[#5a9440] p-0"
                    onClick={() => setLocation("/global-admin/forgot-password")}
                  >
                    Forgot Password?
                  </Button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-[#69ad4c] hover:bg-[#5a9440] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login to Global Admin"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              variant="outline" 
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100" 
              onClick={() => setLocation("/login-local")}
            >
              Return to Main Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}