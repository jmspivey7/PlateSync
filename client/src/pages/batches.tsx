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
import { PlusCircle, Loader2, Package, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Batch, BatchWithDonations } from "../../../shared/schema";
import BatchModal from "@/components/batches/BatchModal";
import { apiRequest } from "@/lib/queryClient";

const statusColors = {
  OPEN: "bg-green-100 text-green-800 hover:bg-green-100",
  CLOSED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  FINALIZED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
};

const BatchesPage = () => {
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
      const response = await apiRequest("GET", `/api/batches/${selectedBatchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch batch details");
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
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-inter text-[#2D3748]">Donation Batches</h2>
          <p className="text-gray-500 mt-1">Manage and organize your donation batches</p>
        </div>
        <Button 
          onClick={handleCreateBatch}
          className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Batch List</CardTitle>
              <CardDescription>
                Organize your donations by worship service or collection date
              </CardDescription>
              <Tabs defaultValue="all" className="mt-3" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="closed">Closed</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {filteredBatches && filteredBatches.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {filteredBatches.map((batch) => (
                    <div 
                      key={batch.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedBatchId === batch.id ? 'border-[#4299E1] bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleViewBatch(batch.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{batch.name}</div>
                        <Badge className={getBadgeClass(batch.status)}>{batch.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Calendar className="mr-1 h-3.5 w-3.5" />
                        {format(new Date(batch.date), 'MMM d, yyyy')}
                      </div>
                      <div className="mt-1 flex items-center text-sm font-medium">
                        <DollarSign className="mr-1 h-3.5 w-3.5 text-[#48BB78]" />
                        {formatCurrency(batch.totalAmount || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {activeTab === "all" ? (
                    <div>
                      <Package className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <p>No batches created yet</p>
                      <p className="text-sm mt-1">Create your first batch to get started</p>
                    </div>
                  ) : (
                    <div>
                      <p>No {activeTab} batches found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedBatchId && selectedBatch ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{selectedBatch.name}</CardTitle>
                  <CardDescription>
                    Created on {format(new Date(selectedBatch.date), 'MMMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="text-[#2D3748]"
                    onClick={() => handleEditBatch(selectedBatchId)}
                  >
                    Edit Batch
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
                  <h3 className="font-medium mb-3">Donations in this Batch</h3>
                  {selectedBatch.donations && selectedBatch.donations.length > 0 ? (
                    <div className="border rounded-lg divide-y max-h-[350px] overflow-y-auto">
                      {selectedBatch.donations.map((donation) => (
                        <div key={donation.id} className="p-3 flex justify-between hover:bg-gray-50">
                          <div>
                            <div className="font-medium">
                              {donation.member ? 
                                `${donation.member.firstName} ${donation.member.lastName}` : 
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
                      <p>No donations in this batch yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="pt-10 text-center">
                <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Batch</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Choose a batch from the list to view details or create a new one to organize your donations.
                </p>
                <Button
                  onClick={handleCreateBatch}
                  variant="outline"
                  className="mx-auto"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Batch
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isModalOpen && (
        <BatchModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          batchId={selectedBatchId}
          isEdit={isEditMode}
        />
      )}
    </div>
  );
};

export default BatchesPage;