import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, HelpCircle, Lightbulb, FileQuestion } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";

const Help = () => {
  return (
    <PageLayout 
      title="Help Center" 
      subtitle="Find answers to common questions about using the application"
      icon={<HelpCircle className="h-6 w-6 text-[#69ad4c]" />}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#69ad4c]" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Answers to common questions about using the donation tracking system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I start a new count?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    To start a new count, follow these steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4">
                    <li>Go to the Dashboard</li>
                    <li>Click the green "Start New Count" button</li>
                    <li>Fill in the count details (date, service type)</li>
                    <li>Click "Create Count" to begin</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>How do I record a donation?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    To record a donation within a count:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4">
                    <li>Open the count you want to add a donation to</li>
                    <li>Click the "Record New Donation" button</li>
                    <li>Select the donor from the dropdown (start typing to search)</li>
                    <li>Enter the donation amount</li>
                    <li>Select the donation type (Cash or Check)</li>
                    <li>For checks, enter the check number</li>
                    <li>Click "Record Donation" to save</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger>How do I finalize a count?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    When you've recorded all donations for a count and verified the total:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4">
                    <li>Review all donations in the count to ensure accuracy</li>
                    <li>Verify that the total matches your physical count</li>
                    <li>Click the gold "Finalize Count" button</li>
                    <li>Confirm in the dialog that appears</li>
                  </ol>
                  <p className="mt-2 text-amber-700">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Important: Once a count is finalized, it cannot be modified!
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3.5">
                <AccordionTrigger>How do I complete the attestation process?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    The attestation process requires two people to verify the count's accuracy:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4">
                    <li>After clicking "Finalize Count", you'll be taken to the attestation page</li>
                    <li>The first person (Primary Attestor) enters their name and selects "Continue"</li>
                    <li>Once the Primary Attestor is entered, a second dropdown appears</li>
                    <li>A different person (Secondary Attestor) must be selected</li>
                    <li>Review the count total one final time</li>
                    <li>Click "Confirm and Finalize Count" to complete the process</li>
                  </ol>
                  <p className="mt-2 text-gray-600">
                    <AlertCircle className="inline h-4 w-4 mr-1 text-amber-500" />
                    Note: Two different people must attest to each count to maintain proper financial controls.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger>How to handle check donations?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    When recording check donations:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4">
                    <li>Select "Check" as the donation type</li>
                    <li>Enter the check number in the field that appears</li>
                    <li>Check numbers can help with reconciliation later</li>
                  </ol>
                  <p className="mt-2">
                    <Lightbulb className="inline h-4 w-4 mr-1 text-amber-500" />
                    Tip: Record each check separately, even if a donor has multiple checks.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger>How to view past counts?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    To view historical count data:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4">
                    <li>Click on "Historical Counts" in the navigation menu</li>
                    <li>Browse the list of past counts sorted by date</li>
                    <li>Click on any count to view its details</li>
                    <li>Use the "Back to List" button to return to the counts list</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-6">
                <AccordionTrigger>What if I can't find a member?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    If you can't find a member when recording a donation:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-4 mt-2">
                    <li>Double-check spelling (the search is case-sensitive)</li>
                    <li>Try searching by just the last name</li>
                    <li>Contact your administrator to add new members to the system</li>
                  </ol>
                  <p className="mt-2 text-gray-600">
                    Note: Members can only be added by administrators via CSV import.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-[#69ad4c]" />
              Need Additional Help?
            </CardTitle>
            <CardDescription>
              Contact information for further assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              If you need additional help or have questions not covered in the FAQ:
            </p>
            <div className="space-y-2">
              <p className="font-medium">Contact your administrator:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>For questions about donation recording procedures</li>
                <li>To report any issues with the system</li>
                <li>To request new features or improvements</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Help;