import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ToastNotificationProps {
  title: string;
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

const ToastNotification = ({
  title,
  message,
  variant = "success",
  duration = 3000,
  onClose
}: ToastNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const getBackgroundColor = () => {
    switch (variant) {
      case "success":
        return "bg-[#48BB78] text-white";
      case "error":
        return "bg-red-500 text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      case "info":
        return "bg-[#4299E1] text-white";
      default:
        return "bg-white";
    }
  };
  
  const getIcon = () => {
    switch (variant) {
      case "success":
        return <Check className="h-6 w-6" />;
      case "error":
        return (
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "warning":
        return (
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "info":
        return (
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return <Check className="h-6 w-6" />;
    }
  };
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };
  
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 max-w-md transition-opacity duration-500", 
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <Alert className={cn("p-4 flex items-start", getBackgroundColor())}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 w-0 flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
        <button
          className="ml-4 flex-shrink-0 rounded-md inline-flex text-white hover:text-gray-100 focus:outline-none"
          onClick={handleClose}
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </Alert>
    </div>
  );
};

export default ToastNotification;
