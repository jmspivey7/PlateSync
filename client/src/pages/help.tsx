import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PageLayout from "@/components/layout/PageLayout";

const Help = () => {
  return (
    <PageLayout 
      title="Help Center" 
      subtitle="Find answers to common questions and learn how to use the system"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Basic information to help you get started with PlateSync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is PlateSync?</AccordionTrigger>
                <AccordionContent>
                  PlateSync is a church donation management system that helps track and manage tithes and collections from offering plates. The system provides features for recording donations, managing members, and generating reports.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>How do I record a new donation?</AccordionTrigger>
                <AccordionContent>
                  <p>To record a new donation:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the Dashboard</li>
                    <li>Look for the current open Count/Batch</li>
                    <li>Click "Record New Donation"</li>
                    <li>Fill in the donation details including member, amount, and type</li>
                    <li>Click "Record Donation" to save</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger>How do I start a new count?</AccordionTrigger>
                <AccordionContent>
                  <p>To start a new count:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the Dashboard</li>
                    <li>Click the "Start New Count" button</li>
                    <li>Select the appropriate service date and option</li>
                    <li>Click "Create Count" to begin</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger>How do I search for a specific member?</AccordionTrigger>
                <AccordionContent>
                  <p>To search for a member:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the Members page</li>
                    <li>Use the search box at the top of the page</li>
                    <li>Type the member's name, email, or phone number</li>
                    <li>The list will automatically filter as you type</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Common Tasks</CardTitle>
            <CardDescription>
              Step-by-step instructions for common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="task-1">
                <AccordionTrigger>How to finalize a count</AccordionTrigger>
                <AccordionContent>
                  <p>When you've recorded all donations for a particular count:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the Dashboard or the specific count details page</li>
                    <li>Review all recorded donations for accuracy</li>
                    <li>Click the "Finalize Count" button</li>
                    <li>Confirm the action when prompted</li>
                    <li>Once finalized, the count will be archived and can be viewed in Historical Counts</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="task-2">
                <AccordionTrigger>How to view historical counts</AccordionTrigger>
                <AccordionContent>
                  <p>To view previous counts:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Click on "Historical Counts" in the navigation menu</li>
                    <li>Browse the list of past counts</li>
                    <li>Click on any count to view details including all donations</li>
                    <li>Use filters if available to find specific counts</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="task-3">
                <AccordionTrigger>How to update my profile</AccordionTrigger>
                <AccordionContent>
                  <p>To update your user profile:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Click on your account icon in the top-right corner</li>
                    <li>Select "Profile" from the dropdown menu</li>
                    <li>Update your information as needed</li>
                    <li>Click "Save Changes" to apply your updates</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="task-4">
                <AccordionTrigger>How to log out</AccordionTrigger>
                <AccordionContent>
                  <p>To log out of the application:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Click on your account icon in the top-right corner</li>
                    <li>Select "Logout" from the dropdown menu</li>
                    <li>You will be redirected to the login page</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Need Additional Help?</CardTitle>
            <CardDescription>
              Contact your administrator if you have questions not covered here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              If you need further assistance, please contact your church administrator.
              They can provide additional training or guidance on using the PlateSync system.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Help;