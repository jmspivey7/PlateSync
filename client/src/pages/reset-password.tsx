"use client";

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import plateSyncLogo from "../assets/platesync-logo.png";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract token from URL query parameters
  // Fix: location is the full path, so we need to extract the query part properly
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  
  console.log("Reset Token Found:", token); // Debug log
  
  if (!token) {
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
              <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation("/login")}
              >
                Return to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Correct way to call the reset password endpoint
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been successfully reset. You can now log in with your new password.",
      });
    } catch (err: any) {
      setError(err.message || "An error occurred while resetting your password.");
      toast({
        title: "Error",
        description: err.message || "An error occurred while resetting your password.",
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
            <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
            {!isSuccess && (
              <CardDescription>
                Please enter a new password for your account.
              </CardDescription>
            )}
          </CardHeader>
          
          {!isSuccess ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                
                {/* Password input */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-lg font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pl-10 pr-10 text-lg py-6"
                      disabled={isLoading}
                      required
                    />
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Confirm Password input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-lg font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pl-10 pr-10 text-lg py-6"
                      disabled={isLoading}
                      required
                    />
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full bg-[#d35f5f] hover:bg-[#5a9440] text-white text-lg py-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-[#d35f5f] hover:text-[#5a9440]"
                  onClick={() => setLocation("/login")}
                >
                  Return to Login
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6 py-6">
              <div className="p-4 rounded-md bg-red-50 text-red-700 text-center">
                <p className="text-lg">
                  Your password has been successfully reset!
                </p>
                <p className="mt-2">
                  You can now log in with your new password.
                </p>
              </div>
              
              <Button 
                type="button" 
                className="w-full bg-[#d35f5f] hover:bg-[#5a9440] text-white"
                onClick={() => setLocation("/login")}
              >
                Go to Login
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}