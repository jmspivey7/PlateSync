import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import plateSyncLogo from "@assets/PlateSync Logo.png";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-6">
            <img src={plateSyncLogo} alt="PlateSync" className="h-12 w-auto" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Trial Expired Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trial Expired</h2>
            <p className="text-lg text-gray-600 mb-6">
              Your 30-day free trial has ended. Please upgrade to continue using PlateSync.
            </p>
          </div>

          {/* Church/User Info */}
          {user && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1"><span className="font-bold">Account Owner:</span> {(user as any).email}</p>
                  <p className="text-xl font-semibold text-gray-900">{(user as any).churchName}</p>
                  <p className="text-red-600 font-medium">Trial Expired: May 1, 2025</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Plans */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">Choose Your Plan</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Monthly Plan */}
              <Card className="border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Monthly Plan</CardTitle>
                  <CardDescription>Pay monthly, cancel anytime</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-2">$2.99<span className="text-base font-normal text-gray-500">/month</span></p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>All features included</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Unlimited members</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleSubscribe('monthly')}
                    disabled={isRedirecting}
                    className="w-full bg-[#69ad4c] hover:bg-[#5a9140] text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isRedirecting ? 'Redirecting...' : 'Subscribe Monthly'}
                  </Button>
                </CardContent>
              </Card>

              {/* Annual Plan */}
              <Card className="border border-green-200 shadow-sm">
                <CardHeader className="pb-2 bg-green-50 rounded-t-lg">
                  <Badge className="w-fit bg-green-600 mb-2">Best Value</Badge>
                  <CardTitle className="text-xl">Annual Plan</CardTitle>
                  <CardDescription>Get 2 months free</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-2">$25.00<span className="text-base font-normal text-gray-500">/year</span></p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>All features included</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Unlimited members</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Save over 30%</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleSubscribe('annual')}
                    disabled={isRedirecting}
                    className="w-full bg-[#69ad4c] hover:bg-[#5a9140] text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isRedirecting ? 'Redirecting...' : 'Subscribe Annually'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features Included */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center">What's Included in Your Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#69ad4c] rounded-full mr-3"></div>
                    <span className="text-gray-700">Unlimited donation tracking</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#69ad4c] rounded-full mr-3"></div>
                    <span className="text-gray-700">Member management</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#69ad4c] rounded-full mr-3"></div>
                    <span className="text-gray-700">Automated email notifications</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#69ad4c] rounded-full mr-3"></div>
                    <span className="text-gray-700">Financial reports</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#69ad4c] rounded-full mr-3"></div>
                    <span className="text-gray-700">Planning Center integration</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-[#69ad4c] rounded-full mr-3"></div>
                    <span className="text-gray-700">Multi-user support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Option */}
          <div className="text-center">
            <Button 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              Sign Out
            </Button>
          </div>

          {/* Support Contact */}
          <div className="text-center mt-8 text-gray-600">
            <p>Questions? Contact us at <a href="mailto:support@platesync.com" className="text-[#69ad4c] hover:underline">support@platesync.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}