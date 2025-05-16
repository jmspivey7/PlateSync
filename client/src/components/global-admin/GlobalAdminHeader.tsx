import plateSyncLogo from "../../assets/platesync-logo.png";
import GlobalAdminAccountDropdown from "./GlobalAdminAccountDropdown";

export default function GlobalAdminHeader() {
  return (
    <header className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <img 
          src={plateSyncLogo} 
          alt="PlateSync Logo" 
          className="h-10 object-contain" 
        />
        <h1 className="text-xl font-semibold text-[#69ad4c]">Global Administration</h1>
        <GlobalAdminAccountDropdown 
          adminName="John Spivey" 
          adminEmail="jspivey@spiveyco.com" 
        />
      </div>
    </header>
  );
}