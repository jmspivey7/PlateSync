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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#69ad4c]" />
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
            <h2 className="text-xl font-medium text-[#333]">Manage your PlateSync subscription</h2>
          </div>

          <div className="mt-6">
            <SubscriptionStatus onUpgrade={() => setShowUpgradeDialog(true)} />
          </div>
        </div>
      </main>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Subscription</DialogTitle>
            <DialogDescription>
              Choose a plan to continue using PlateSync
            </DialogDescription>
          </DialogHeader>
          <SubscriptionPlans onCancel={() => setShowUpgradeDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}