import plateSyncLogo from "../../assets/platesync-logo.png";

const SharedFooter = () => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-3 mb-4 gap-4">
      <div>
        <img 
          src={plateSyncLogo} 
          alt="PlateSYNQ - Church Collection Management" 
          className="h-11 object-contain" /* Increased by 10% from h-10 */
        />
      </div>
      <div className="text-right text-gray-500 text-xs">
        <p>© 2025 PlateSYNQ. All rights reserved.</p>
        <p>Built with care for churches everywhere.</p>
      </div>
    </div>
  );
};

export default SharedFooter;