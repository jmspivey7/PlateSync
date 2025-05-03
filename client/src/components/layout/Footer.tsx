import { DollarSign } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#2D3748] text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-[#48BB78] mr-2" />
              <span className="text-lg font-bold font-inter">PlateSync</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Simplifying church donation management</p>
          </div>
          <div className="text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} PlateSync. All rights reserved.</p>
            <p>Built with care for churches everywhere.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
