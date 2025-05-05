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
  // State variables
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  // Parse token from URL and automatically validate it
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      validateToken(tokenFromUrl);
    }
  }, [search]);
  
  // Validate token against the API
  const validateToken = async (tokenToCheck: string) => {
    if (!tokenToCheck) return;
    
    try {
      const response = await fetch(`/api/test-verification-token?token=${encodeURIComponent(tokenToCheck)}`);
      const data = await response.json();
      
      if (data.success) {
        setTokenValid(true);
        setError("");
      } else {
        setTokenValid(false);
        setError("Invalid verification token. Please check your email for the correct link or generate a new token.");
      }
    } catch (err) {
      console.error("Error validating token:", err);
      setTokenValid(false);
      setError("Error validating token. Please try again.");
    }
  };
  
  // Handle token generation
  const handleGenerateToken = async () => {
    try {
      const email = prompt("Please enter your email to generate a new verification token:");
      if (!email) return;
      
      toast({
        title: "Generating token...",
        description: "Please wait while we generate a new verification token.",
      });
      
      const response = await fetch('/api/regenerate-verification-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newToken = data.verificationUrl.split("token=")[1];
        setToken(newToken);
        validateToken(newToken);
        
        toast({
          title: "Token generated",
          description: "A new verification token has been generated and applied.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to generate token.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error generating token:", err);
      toast({
        title: "Error",
        description: "Failed to generate a new token. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Form validation
  const validateForm = () => {
    if (!token) {
      setError("Missing verification token");
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
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }
      
      setSuccess(true);
      toast({
        title: "Success!",
        description: "Your email has been verified and password set successfully.",
      });
      
      // Redirect to login page after a short delay
      setTimeout(() => setLocation("/"), 2000);
      
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Verification failed. Please try again.");
      toast({
        title: "Verification failed",
        description: err.message || "An error occurred during verification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Show token status message
  const getStatusMessage = () => {
    if (tokenValid === true) {
      return "Your verification link is valid. Please set your password to complete account setup.";
    } else if (tokenValid === false) {
      return "This verification link is invalid or has expired. Please generate a new one or check your email for the correct link.";
    }
    return null;
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
            {/* Status messages */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm">
                Your email has been verified and password set successfully. You will be redirected to the login page.
              </div>
            )}
            
            {/* Token status message */}
            {getStatusMessage() && !success && !error && (
              <div className={`p-3 rounded-md text-sm ${tokenValid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {getStatusMessage()}
              </div>
            )}
            
            {/* Hidden token field - only show if advanced options toggled */}
            {showAdvanced && (
              <div className="space-y-2">
                <Label htmlFor="token">Verification Token</Label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (e.target.value.length > 32) {
                      validateToken(e.target.value);
                    }
                  }}
                  placeholder="Enter your verification token"
                  required
                  className="w-full font-mono text-xs"
                />
              </div>
            )}
            
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
                  disabled={loading || success || tokenValid === false}
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
                disabled={loading || success || tokenValid === false}
              />
            </div>
            
            {/* Advanced options toggle */}
            <div className="pt-2">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? "Hide" : "Show"} advanced options
                {showAdvanced ? (
                  <span className="ml-1">▲</span>
                ) : (
                  <span className="ml-1">▼</span>
                )}
              </button>
            </div>
            
            {/* Token regeneration */}
            {(tokenValid === false || showAdvanced) && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGenerateToken}
                >
                  Generate New Verification Token
                </Button>
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-[#69ad4c] hover:bg-[#5a9440]"
              disabled={loading || success || tokenValid === false}
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