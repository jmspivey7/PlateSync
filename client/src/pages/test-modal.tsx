import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestModal() {
  const [showModal, setShowModal] = useState(false);

  console.log("🚨 TestModal render - showModal:", showModal);

  return (
    <div className="p-8">
      <h1>Modal Test Page</h1>
      <Button onClick={() => {
        console.log("🚨 Button clicked, setting modal to true");
        setShowModal(true);
      }}>
        Show Test Modal
      </Button>

      {/* Simple test modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2>Test Modal Works!</h2>
            <p>This confirms React state management is working</p>
            <Button 
              onClick={() => setShowModal(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}