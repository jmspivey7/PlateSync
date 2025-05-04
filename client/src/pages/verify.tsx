"use client";

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Verify() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<null | {
    valid: boolean;
    message: string;
    details?: any;
  }>(null);
  
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  // Parse token from URL and automatically test it
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      
      // Automatically check the token after a short delay
      setTimeout(() => {
        const verifyToken = async () => {
          try {
            const response = await fetch(`/api/test-verification-token?token=${encodeURIComponent(tokenFromUrl)}`);
            const data = await response.json();
            
            if (data.success) {
              setTokenStatus({
                valid: true,
                message: `Token is valid for user: ${data.userEmail}`,
                details: data
              });
              setError("");
            } else {
              setTokenStatus({
                valid: false,
                message: data.message,
                details: data
              });
              setError("Invalid verification token. Please check your email for the correct link or contact support.");
            }
          } catch (err) {
            console.error("Error verifying token:", err);
            setTokenStatus({
              valid: false,
              message: "Error checking token"
            });
          }
        };
        
        verifyToken();
      }, 500);
    }
  }, [search]);
  
  // Function to check token validity
  const checkToken = async () => {
    if (!token) {
      setTokenStatus({
        valid: false,
        message: "Please enter a token to check"
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/test-verification-token?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      
      if (data.success) {
        setTokenStatus({
          valid: true,
          message: `Token is valid for user: ${data.userEmail}`,
          details: data
        });
        setError("");
      } else {
        setTokenStatus({
          valid: false,
          message: data.message,
          details: data
        });
      }
    } catch (err) {
      setTokenStatus({
        valid: false,
        message: "Error checking token"
      });
    }
  };
  
  // Form validation
  const validateForm = () => {
    if (!token) {
      setError("Invalid or missing verification token");
      return false;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    setError("");
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Use fetch directly for better error handling instead of apiRequest
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }
      
      setSuccess(true);
      toast({
        title: "Verification successful",
        description: "Your email has been verified and password set successfully. You can now log in.",
      });
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        setLocation("/");
      }, 2000);
      
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Verification failed. Please try again or contact support.");
      toast({
        title: "Verification failed",
        description: err.message || "An error occurred during verification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>Set your password to complete account setup</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            
            {/* Success message */}
            {success && (
              <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm">
                Your email has been verified and password set successfully. You will be redirected to the login page.
              </div>
            )}
            
            {/* Token input and debug section */}
            <div className="space-y-2">
              <Label htmlFor="token">Verification Token</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your verification token"
                  required
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={checkToken}
                >
                  Test Token
                </Button>
              </div>
              
              {/* Token status */}
              {tokenStatus && (
                <div className={`p-3 rounded-md text-sm ${tokenStatus.valid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {tokenStatus.message}
                  {tokenStatus.details && (
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(tokenStatus.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              
              {/* Token regeneration */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const email = prompt("Please enter your email to generate a new verification token:");
                      if (!email) return;
                      
                      const response = await fetch('/api/regenerate-verification-token', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email })
                      });
                      
                      const data = await response.json();
                      
                      if (data.success) {
                        toast({
                          title: "New token generated",
                          description: `A new verification token has been generated for ${data.email}`,
                        });
                        
                        // Update the token in the form
                        setToken(data.verificationUrl.split("token=")[1]);
                        
                        // Auto-check the token
                        setTimeout(() => checkToken(), 500);
                      } else {
                        toast({
                          title: "Error",
                          description: data.message,
                          variant: "destructive",
                        });
                      }
                    } catch (err) {
                      console.error("Error regenerating token:", err);
                      toast({
                        title: "Error",
                        description: "Failed to generate a new token",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Generate New Verification Token
                </Button>
              </div>
            </div>
            
            {/* Password input */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  required
                  className="pr-10"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>
            
            {/* Confirm Password input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading || success}
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-[#69ad4c] hover:bg-[#5a9440]"
              disabled={loading || success}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LockIcon className="h-4 w-4" />
                  <span>Set Password & Verify</span>
                </div>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}