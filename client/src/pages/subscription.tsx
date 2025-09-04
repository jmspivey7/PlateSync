import { useState } from "react";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { DialogTitle, DialogDescription, DialogHeader, DialogContent, Dialog } from "@/components/ui/dialog";

export default function SubscriptionPage() {
  const { user, isLoading } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d35f5f]" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login-local" />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-semibold text-[#333]">Subscription</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-6 max-w-3xl mx-auto">
          <div className="mb-4">
            <h2 className="text-xl font-medium text-[#333]">Manage your PlateSYNQ subscription</h2>
          </div>

          <div className="mt-6">
            <SubscriptionStatus onUpgrade={() => setShowUpgradeDialog(true)} />
          </div>
          
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium mb-2">Need Help?</h3>
            <p className="text-gray-600">
              If you have any questions about your subscription or need assistance,
              please don't hesitate to <a href="mailto:support@platesync.com" className="text-green-600 hover:text-green-700 font-medium">contact our support team</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Subscription</DialogTitle>
            <DialogDescription>
              Choose a plan to continue using PlateSYNQ
            </DialogDescription>
          </DialogHeader>
          <SubscriptionPlans onCancel={() => setShowUpgradeDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}