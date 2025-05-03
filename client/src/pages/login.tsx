import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7FAFC] px-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex items-center mb-4">
          <DollarSign className="h-12 w-12 text-[#48BB78] mr-2" />
          <h1 className="text-3xl font-bold font-inter tracking-tight text-[#2D3748]">PlateSync</h1>
        </div>
        <h2 className="text-2xl font-semibold text-[#1A202C] mb-2">Church Donation Management</h2>
        <p className="text-gray-600 max-w-md">
          Simplify donation tracking, manage church members, and send automated notifications
        </p>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Log in to access your church donation management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-600">
              Secure access is provided for authorized church staff only
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-[#4299E1] hover:bg-[#4299E1]/90 text-white"
            onClick={handleLogin}
            disabled={isLoading}
          >
            Log In with Replit
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          PlateSync helps churches manage donations and member information securely.
        </p>
      </div>
    </div>
  );
};

export default Login;
