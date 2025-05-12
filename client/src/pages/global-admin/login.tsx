import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema for Global Admin login
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  secretKey: z.string().min(1, { message: "Global Admin secret key is required" })
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GlobalAdminLogin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Initialize form with validation schema
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      secretKey: ""
    }
  });

  // Handle Global Admin login - this would be implemented server-side
  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      // In a real implementation, this would validate Global Admin credentials
      // and the secret key against server security requirements
      const response = await fetch("/api/global-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Authentication failed");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome to the Global Admin dashboard",
      });
      navigate("/global-admin/dashboard");
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Form submission handler
  function onSubmit(values: LoginFormValues) {
    setError(null);
    loginMutation.mutate(values);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold">PlateSync Global Admin</CardTitle>
            <CardDescription className="text-center">
              Secure authentication required for Global Administrator access
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
                        <Input placeholder="admin@example.com" type="email" {...field} />
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
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="secretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Global Admin Secret Key</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter secret key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && (
                  <div className="text-sm font-medium text-destructive">{error}</div>
                )}
                <Button
                  type="submit"
                  className="w-full font-semibold bg-primary"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              This login is for PlateSync Global Administrators only. <br />
              Regular church users should log in through the main login page.
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/login")}
            >
              Return to Regular Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}