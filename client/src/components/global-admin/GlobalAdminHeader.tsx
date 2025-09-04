import { useEffect, useState } from "react";
import plateSyncLogo from "../../assets/platesync-logo.png";
import GlobalAdminAccountDropdown from "./GlobalAdminAccountDropdown";

export default function GlobalAdminHeader() {
  const [adminInfo, setAdminInfo] = useState({
    firstName: "John",
    lastName: "Spivey",
    email: "jspivey@spiveyco.com"
  });
  
  useEffect(() => {
    // Load profile data from localStorage
    const savedProfileData = localStorage.getItem("globalAdminProfile");
    if (savedProfileData) {
      try {
        const parsedData = JSON.parse(savedProfileData);
        setAdminInfo({
          firstName: parsedData.firstName || "John",
          lastName: parsedData.lastName || "Spivey",
          email: parsedData.email || "jspivey@spiveyco.com"
        });
      } catch (error) {
        console.error("Error parsing saved profile data:", error);
      }
    }
    
    // Check for updates periodically
    const intervalId = setInterval(() => {
      const latestProfileData = localStorage.getItem("globalAdminProfile");
      if (latestProfileData) {
        try {
          const parsedData = JSON.parse(latestProfileData);
          setAdminInfo({
            firstName: parsedData.firstName || "John",
            lastName: parsedData.lastName || "Spivey",
            email: parsedData.email || "jspivey@spiveyco.com"
          });
        } catch (error) {
          console.error("Error parsing saved profile data:", error);
        }
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const fullName = `${adminInfo.firstName} ${adminInfo.lastName}`;
  
  return (
    <header className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <img 
          src={plateSyncLogo} 
          alt="PlateSYNQ Logo" 
          className="h-10 object-contain" 
        />
        <h1 className="text-xl font-semibold text-[#d35f5f]">Global Administration</h1>
        <GlobalAdminAccountDropdown 
          adminName={fullName} 
          adminEmail={adminInfo.email} 
        />
      </div>
    </header>
  );
}