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
    return <LoadingPage />;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
            <p className="text-gray-600">Manage your PlateSync subscription</p>
          </div>
        </div>

        <div className="grid gap-6">
          <SubscriptionStatus onUpgrade={() => setShowUpgradeDialog(true)} />
        </div>

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
    </MainLayout>
  );
}