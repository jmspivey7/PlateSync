import plateSyncLogoHorizontal from "../../assets/platesync-logo-horizontal.png?v=2025010601";

const SharedFooter = () => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-3 mb-4 gap-4">
      <div>
        <img 
          src={plateSyncLogoHorizontal} 
          alt="PlateSYNQ - Church Collection Management" 
          className="h-10 object-contain" /* Horizontal logo for footer */
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