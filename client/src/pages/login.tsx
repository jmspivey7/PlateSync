"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import plateSyncLogo from "../assets/platesync-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Use useEffect for the redirect to avoid React state update during render
  useEffect(() => {
    if (user && !authLoading) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: email, password }),
        credentials: "include",
      });
      
      if (response.ok) {
        // Successful login
        window.location.href = "/dashboard"; // Use window.location for full page refresh
      } else {
        const data = await response.json().catch(() => ({ message: "Invalid credentials" }));
        setError(data.message || "Login failed");
        
        toast({
          title: "Login Failed",
          description: data.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
      
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleLoginWithReplit = () => {
    window.location.href = "/api/login";
  };
  
  // If still loading auth status, show spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#69ad4c]"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md mx-auto mb-8">
          <div className="text-center mb-8">
            <img 
              src={plateSyncLogo} 
              alt="PlateSync Logo" 
              className="mx-auto mb-4 h-24"
            />
            <h2 className="text-2xl font-bold text-[#69ad4c]">Plate Counts Made Easy!</h2>
          </div>
          
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">Log In</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm mb-4">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <MailIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="church@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a 
                      href="/forgot-password" 
                      className="text-sm text-[#69ad4c] hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <LockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={togglePasswordVisibility}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#69ad4c] hover:bg-[#59ad3c] text-white" 
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleLoginWithReplit}
                >
                  Log In with Replit
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Information Side / Hero */}
      <div className="hidden md:flex md:flex-1 bg-[#69ad4c] text-white">
        <div className="p-10 flex flex-col justify-center max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6">Streamline Your Church Donations</h1>
          <p className="text-lg mb-8">
            PlateSync helps your church track and manage donations efficiently, with powerful tools 
            for counting teams and administrators.
          </p>
          <div className="space-y-4">
            <FeatureItem title="Easy Counting">
              Quickly record and track donations with an intuitive interface
            </FeatureItem>
            <FeatureItem title="Two-User Verification">
              Ensure accuracy with dual-person verification process
            </FeatureItem>
            <FeatureItem title="Insightful Reports">
              Generate detailed reports on donation trends and giving patterns
            </FeatureItem>
            <FeatureItem title="Secure & Reliable">
              Keep your church's financial data safe and accessible
            </FeatureItem>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <div className="h-6 w-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 text-white" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      </div>
      <div className="ml-3">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="mt-1 text-white text-opacity-90">{children}</p>
      </div>
    </div>
  );
}