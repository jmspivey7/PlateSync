"use client";

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MailIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import plateSyncLogo from "../assets/platesync-logo.png";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Email is required");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Correct way to call the forgot password endpoint
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process request");
      }
      
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while processing your request.");
      toast({
        title: "Error",
        description: err.message || "An error occurred while processing your request.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <img 
                src={plateSyncLogo} 
                alt="PlateSync Logo" 
                className="h-20 object-contain mb-2" 
              />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            {!isSubmitted && (
              <CardDescription>
                Please enter the email address associated with your account to receive a password reset link.
              </CardDescription>
            )}
          </CardHeader>
          
          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                
                {/* Email input */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-lg font-medium">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10 text-lg py-6"
                      disabled={isLoading}
                      required
                    />
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full bg-[#69ad4c] hover:bg-[#5a9440] text-white text-lg py-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <span>Submit</span>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-[#69ad4c] hover:text-[#5a9440]"
                  onClick={() => setLocation("/login")}
                >
                  Return to Login
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6 py-6">
              <div className="p-4 rounded-md bg-green-50 text-green-700 text-center">
                <p className="text-lg">
                  If your email is validated by our system then a reset password link will be sent to you within the next 5 minutes.
                </p>
                <p className="mt-2">
                  You can use this link to reset your password to PlateSync.
                </p>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation("/login")}
              >
                Return to Login
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}