"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, ChurchIcon, UserIcon, BuildingIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import plateSyncLogo from "../assets/platesync-logo.png";

export default function LoginLocal() {
  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [churchName, setChurchName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);


  const { user, isLoading: authLoading, login, loginStatus } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Active tab state
  const [activeTab, setActiveTab] = useState("signin");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    // Use the login function from useAuth hook
    login({ username: email, password });

    // The redirect will happen automatically in the useAuth hook
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    // Validate inputs
    if (!registerEmail || !registerPassword || !confirmPassword || !churchName || !firstName || !lastName) {
      setRegisterError("All fields are required");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setRegisterError("Passwords do not match");
      return;
    }

    if (registerPassword.length < 8) {
      setRegisterError("Password must be at least 8 characters long");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      setRegisterError("Please enter a valid email address");
      return;
    }

    try {
      setIsRegistering(true);

      // Define response type
      const response: Response = await fetch('/api/register-church', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          churchName: churchName,
          firstName: firstName,
          lastName: lastName
        })
      });

      interface RegisterResponse {
        message: string;
        onboarding: {
          churchId: string;
          churchName: string;
          email: string;
        };
      }

      const data: RegisterResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register");
      }

      // Clear form
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");
      setChurchName("");
      setFirstName("");
      setLastName("");

      // Immediately redirect to onboarding without showing toast
      const { churchId, churchName: churchNameFromResponse, email: emailFromResponse } = data.onboarding;
      // Redirect to onboarding page with query parameters
      window.location.href = `/onboarding?churchId=${churchId}&churchName=${encodeURIComponent(churchNameFromResponse)}&email=${encodeURIComponent(emailFromResponse)}`;

    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };


  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRegisterPasswordVisibility = () => {
    setShowRegisterPassword(!showRegisterPassword);
  };



  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d35f5f]"></div>
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
                alt="PlateSYNQ Logo" 
                className="mx-auto h-[5.25rem]" /* 25% reduction from h-28 (7rem) */
              />
            </div>
          </CardHeader>

          <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardContent className="py-4">
                <p className="text-gray-600 mb-4">Welcome back. Please enter your credentials to access your account.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginStatus.error && (
                    <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm mb-4">
                      {loginStatus.error.message}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">Email:</Label>
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
                    <Label htmlFor="password" className="font-bold">Password:</Label>
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
                    className="w-full bg-[#d35f5f] hover:bg-[#b84f4f] text-white" 
                    disabled={loginStatus.isLoading}
                  >
                    {loginStatus.isLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="text-center mt-4">
                    <a 
                      href="/forgot-password" 
                      className="text-sm text-[#d35f5f] hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardContent className="py-4">
                <p className="text-gray-600 mb-4 text-center">Start your <strong>30-Day Free Trial</strong> of PlateSYNQ Today! No credit card required. Complete the New Account form to get started.</p>

                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm mb-4">
                      {registerError}
                    </div>
                  )}

                  {registerSuccess && (
                    <div className="p-3 rounded-md bg-green-50 text-green-600 text-sm mb-4">
                      {registerSuccess}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="churchName" className="font-bold">Church Name:</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <BuildingIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="churchName"
                        type="text"
                        placeholder=""
                        className="pl-10"
                        value={churchName}
                        onChange={(e) => setChurchName(e.target.value)}
                        disabled={isRegistering}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="font-bold">First Name:</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder=""
                          className="pl-10"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={isRegistering}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="font-bold">Last Name:</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder=""
                          className="pl-10"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          disabled={isRegistering}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail" className="font-bold">Email:</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MailIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder=""
                        className="pl-10"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        disabled={isRegistering}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="font-bold">Password:</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <LockIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="registerPassword"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder=""
                        className="pl-10 pr-10"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        disabled={isRegistering}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={toggleRegisterPasswordVisibility}
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-bold">Confirm Password:</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <LockIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder=""
                        className="pl-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isRegistering}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#d35f5f] hover:bg-[#b84f4f] text-white" 
                    disabled={isRegistering}
                  >
                    {isRegistering ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>

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