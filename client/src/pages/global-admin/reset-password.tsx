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
import { Loader2, KeyRound, Eye, EyeOff, ArrowLeft } from "lucide-react";

// Form validation schema
const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function GlobalAdminResetPassword() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  
  // Extract token from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    
    if (!tokenFromUrl) {
      toast({
        title: "Invalid link",
        description: "No reset token found. Please request a new password reset.",
        variant: "destructive",
      });
      setIsValidToken(false);
      return;
    }
    
    setToken(tokenFromUrl);
    
    // Validate the token
    validateToken(tokenFromUrl);
  }, []);
  
  const validateToken = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/validate-token?token=${encodeURIComponent(token)}`);
      
      if (response.ok) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
        toast({
          title: "Invalid or expired token",
          description: "This password reset link has expired. Please request a new one.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsValidToken(false);
      toast({
        title: "Error",
        description: "Failed to validate reset token. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Initialize form
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        title: "Error",
        description: "No reset token found",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          password: values.password,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now login with your new password.",
      });
      
      // Redirect to login page
      setTimeout(() => {
        setLocation("/global-admin/login");
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
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
                alt="PlateSync Logo" 
                className="mx-auto h-[5.25rem]"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-[#69ad4c]">
              Create New Password
            </CardTitle>
            <CardDescription className="text-center">
              Enter your new password below to complete the reset process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isValidToken === null ? (
              <div className="text-center py-4">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#69ad4c]" />
                <p className="mt-2 text-sm text-gray-600">Validating reset link...</p>
              </div>
            ) : isValidToken === false ? (
              <div className="text-center space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">
                    This password reset link is invalid or has expired.
                  </p>
                </div>
                <Button 
                  className="w-full bg-[#69ad4c] hover:bg-[#5a9440] text-white"
                  onClick={() => setLocation("/global-admin/forgot-password")}
                >
                  Request New Reset Link
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your new password" 
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
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your new password" 
                              className="pl-9 pr-9"
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-[#69ad4c] hover:bg-[#5a9440] text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-800" 
              onClick={() => setLocation("/global-admin/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}