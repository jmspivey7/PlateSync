import platesyncLogo from "@/assets/platesync-logo.png";
import redeemerLogo from "@/assets/redeemer-logo-white.png";

const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground py-6 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex flex-col items-start">
              <img src={platesyncLogo} alt="PlateSync" className="h-8 mb-2" />
              <img src={redeemerLogo} alt="Redeemer Presbyterian Church" className="h-10" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} PlateSync. All rights reserved.</p>
            <p>Built with care for churches everywhere.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
