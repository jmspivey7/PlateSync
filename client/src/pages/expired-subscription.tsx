import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export default function ExpiredSubscription() {
  const { user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    setIsRedirecting(true);
    
    try {
      // Redirect to Stripe payment links
      const paymentLinks = {
        monthly: process.env.VITE_STRIPE_MONTHLY_PAYMENT_LINK,
        annual: process.env.VITE_STRIPE_ANNUAL_PAYMENT_LINK
      };
      
      const paymentLink = paymentLinks[plan];
      if (paymentLink) {
        window.location.href = paymentLink;
      } else {
        console.error(`Payment link not configured for ${plan} plan`);
        setIsRedirecting(false);
      }
    } catch (error) {
      console.error('Error redirecting to payment:', error);
      setIsRedirecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'GET',
        credentials: 'include'
      });
      
      // Force page reload to clear all state and redirect to login
      window.location.href = '/login-local';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login-local';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PlateSync</h1>
          <p className="text-gray-600">Church Donation Management</p>
        </div>

        {/* Trial Expired Card */}
        <Card className="shadow-lg border-orange-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Trial Expired</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Your 30-day free trial has ended. Please upgrade to continue using PlateSync.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-orange-200 text-orange-700">
              <Clock className="w-3 h-3 mr-1" />
              Trial Period Ended
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Church Info */}
            {user && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Account Owner</p>
                <p className="font-medium text-gray-900">{(user as any).firstName} {(user as any).lastName}</p>
                <p className="text-sm text-gray-600">{(user as any).churchName}</p>
              </div>
            )}

            {/* Subscription Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-center">Choose Your Plan</h3>
              
              {/* Monthly Plan */}
              <Card className="border-2 hover:border-blue-300 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">Monthly Plan</h4>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">$2.99</p>
                      <p className="text-sm text-gray-600">per month</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSubscribe('monthly')}
                    disabled={isRedirecting}
                    className="w-full mt-3"
                    variant="outline"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isRedirecting ? 'Redirecting...' : 'Subscribe Monthly'}
                  </Button>
                </CardContent>
              </Card>

              {/* Annual Plan */}
              <Card className="border-2 border-green-200 bg-green-50 hover:border-green-300 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">Annual Plan</h4>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Save 30%
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">$25.00</p>
                      <p className="text-sm text-gray-600">per year</p>
                      <p className="text-xs text-green-600">Only $2.08/month</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSubscribe('annual')}
                    disabled={isRedirecting}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isRedirecting ? 'Redirecting...' : 'Subscribe Annually'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Features Included */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">What's Included:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Unlimited donation tracking</li>
                <li>• Member management</li>
                <li>• Automated email notifications</li>
                <li>• Financial reports</li>
                <li>• Planning Center integration</li>
                <li>• Multi-user support</li>
              </ul>
            </div>

            {/* Logout Option */}
            <div className="pt-4 border-t">
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="w-full text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Questions? Contact us at <a href="mailto:support@platesync.com" className="text-blue-600 hover:underline">support@platesync.com</a></p>
        </div>
      </div>
    </div>
  );
}