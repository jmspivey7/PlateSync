import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Package, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Batch, BatchWithDonations } from "../../../shared/schema";
import CountModal from "../components/counts/CountModal";
import { apiRequest } from "@/lib/queryClient";
import PageLayout from "@/components/layout/PageLayout";

const statusColors = {
  OPEN: "bg-green-100 text-green-800 hover:bg-green-100",
  CLOSED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  FINALIZED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
};

const CountsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all batches
  const { data: batches, isLoading: isLoadingBatches } = useQuery<Batch[]>({
    queryKey: ["/api/batches"],
  });

  // Fetch selected batch with donations
  const { data: selectedBatch, isLoading: isLoadingSelectedBatch } = useQuery<BatchWithDonations>({
    queryKey: ["/api/batches", selectedBatchId, "details"],
    queryFn: async () => {
      if (!selectedBatchId) return null;
      const response = await fetch(`/api/batches/${selectedBatchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count details");
      }
      return response.json();
    },
    enabled: !!selectedBatchId,
  });

  // Filter batches by status
  const filteredBatches = batches?.filter((batch) => {
    if (activeTab === "all") return true;
    return batch.status === activeTab.toUpperCase();
  });

  const handleCreateBatch = () => {
    setSelectedBatchId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditBatch = (batchId: number) => {
    setSelectedBatchId(batchId);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleViewBatch = (batchId: number) => {
    setSelectedBatchId(batchId);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    if (selectedBatchId) {
      queryClient.invalidateQueries({ queryKey: ["/api/batches", selectedBatchId, "details"] });
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getBadgeClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  if (isLoadingBatches) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#4299E1]" />
      </div>
    );
  }

  return (
    <PageLayout
      title="Historical Counts"
      subtitle="View and manage past donation counts"
      icon={<Calendar className="h-6 w-6 text-gray-700" />}
    >
      <div className="mb-6 flex justify-end">
        <Button 
          onClick={handleCreateBatch}
          className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Count
        </Button>
      </div>

      {/* Historical Count List as Table with Rows and Columns */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Historical Count List</CardTitle>
          <CardDescription>
            View past donation counts by worship service or collection date
          </CardDescription>
          <Tabs defaultValue="all" className="mt-3" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 p-1 shadow-sm border border-gray-200 rounded-md">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#69ad4c] hover:bg-[#69ad4c]/10 transition-colors duration-200"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="open"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#69ad4c] hover:bg-[#69ad4c]/10 transition-colors duration-200"
              >
                Open
              </TabsTrigger>
              <TabsTrigger 
                value="closed"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#69ad4c] hover:bg-[#69ad4c]/10 transition-colors duration-200"
              >
                Closed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredBatches && filteredBatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium text-gray-500 w-1/5">Date</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500 w-1/5">Service</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500 w-1/5">Amount</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500 w-1/5">Status</th>
                    <th className="py-2 px-3 text-right font-medium text-gray-500 w-1/10">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch) => {
                    // Extract service name from the batch name
                    const batchNameParts = batch.name.split(', ');
                    const serviceName = batchNameParts.length > 1 ? batchNameParts[0] : 'Regular Service';
                    
                    return (
                      <tr 
                        key={batch.id}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          selectedBatchId === batch.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleViewBatch(batch.id)}
                      >
                        <td className="py-3 px-3 text-gray-700 font-medium">
                          {format(new Date(batch.date), 'MMMM d, yyyy')}
                        </td>
                        <td className="py-3 px-3 text-gray-700">
                          {serviceName}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#48BB78]">
                          {formatCurrency(batch.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={getBadgeClass(batch.status)}>{batch.status}</Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBatch(batch.id);
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {activeTab === "all" ? (
                <div>
                  <Package className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <p>No counts created yet</p>
                  <p className="text-sm mt-1">Create your first count to get started</p>
                </div>
              ) : (
                <div>
                  <p>No {activeTab} counts found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Count Details */}
      {selectedBatchId && selectedBatch && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              {/* Extract service name from the batch name */}
              {(() => {
                const batchNameParts = selectedBatch.name.split(', ');
                const serviceName = batchNameParts.length > 1 ? batchNameParts[0] : 'Regular Service';
                return (
                  <>
                    <CardTitle>{format(new Date(selectedBatch.date), 'MMMM d, yyyy')}</CardTitle>
                    <CardDescription>
                      Service: {serviceName}
                    </CardDescription>
                  </>
                );
              })()}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="text-[#2D3748]"
                onClick={() => setSelectedBatchId(null)}
              >
                Back to List
              </Button>
              <Button 
                variant="outline" 
                className="text-[#2D3748]"
                onClick={() => handleEditBatch(selectedBatchId)}
              >
                Edit Count
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-xl font-bold text-[#48BB78]">
                  {formatCurrency(selectedBatch.totalAmount || 0)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Status</div>
                <div className="flex items-center">
                  <Badge className={getBadgeClass(selectedBatch.status)}>
                    {selectedBatch.status}
                  </Badge>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Donations</div>
                <div className="text-xl font-bold text-[#2D3748]">
                  {selectedBatch.donations?.length || 0}
                </div>
              </div>
            </div>

            {selectedBatch.notes && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                  {selectedBatch.notes}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-3">Donations in this Count</h3>
              {selectedBatch.donations && selectedBatch.donations.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-[350px] overflow-y-auto">
                  {selectedBatch.donations.map((donation) => (
                    <div key={donation.id} className="p-3 flex justify-between hover:bg-gray-50">
                      <div>
                        <div className="font-medium">
                          {donation.memberId ? 
                            "Member Donation" : 
                            "Anonymous Donation"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(donation.date), 'MMM d, yyyy')} • 
                          {donation.donationType === "CASH" ? " Cash" : ` Check #${donation.checkNumber}`}
                        </div>
                      </div>
                      <div className="font-medium text-[#48BB78]">
                        {formatCurrency(donation.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-lg text-gray-500">
                  <p>No donations in this count yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isModalOpen && (
        <CountModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          batchId={selectedBatchId}
          isEdit={isEditMode}
        />
      )}
    </PageLayout>
  );
};

export default CountsPage;