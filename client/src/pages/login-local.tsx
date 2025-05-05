"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import plateSyncLogo from "../assets/platesync-logo.png";

export default function LoginLocal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { user, isLoading: authLoading, login, loginStatus } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    login({ username: email, password });
  };
  
  const handleLoginWithReplit = () => {
    // Redirect to regular Replit Auth login (handled by OpenID Connect)
    window.location.href = "/login";
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#69ad4c]"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6">
        <Card className="w-full border border-gray-100">
          <CardHeader className="pb-0">
            <div className="text-center mb-4">
              <img 
                src={plateSyncLogo} 
                alt="PlateSync Logo" 
                className="mx-auto h-[5.25rem]" /* 25% reduction from h-28 (7rem) */
              />
            </div>
            <CardTitle className="text-left mt-2">Sign In</CardTitle>
            <p className="text-gray-600 mt-2">Welcome back. Please enter your credentials to access your account.</p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {loginStatus.error && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm mb-4">
                  {loginStatus.error.message}
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
                    placeholder=""
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loginStatus.isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <LockIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder=""
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loginStatus.isLoading}
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
                disabled={loginStatus.isLoading}
              >
                {loginStatus.isLoading ? "Signing in..." : "Sign In"}
              </Button>
              
              <div className="text-center mt-4">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-[#69ad4c] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              
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
                Sign In with Replit (jspivey@spiveyco.com)
              </Button>
            </form>
          </CardContent>
        </Card>
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