import plateSyncLogo from "../../assets/platesync-logo.png";

const SharedFooter = () => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-8 mb-4 gap-4">
      <div>
        <img 
          src={plateSyncLogo} 
          alt="PlateSync - Church Collection Management" 
          className="h-10 object-contain"
        />
      </div>
      <div className="text-right text-gray-500 text-xs">
        <p>© 2025 PlateSync. All rights reserved.</p>
        <p>Built with care for churches everywhere.</p>
      </div>
    </div>
  );
};

export default SharedFooter;