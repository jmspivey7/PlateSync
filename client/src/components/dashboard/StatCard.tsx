import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  changeText: string;
  changeValue: number;
  borderColor: string;
}

const StatCard = ({ title, value, changeText, changeValue, borderColor }: StatCardProps) => {
  const formatValue = (value: string) => {
    // If the value is a dollar amount, add the $ sign
    if (title.toLowerCase().includes('donation')) {
      return `$${value}`;
    }
    return value;
  };
  
  const getChangeIcon = () => {
    if (changeValue > 0) {
      return <ArrowUp className="h-3 w-3 mr-1 text-[#d35f5f]" />;
    } else if (changeValue < 0) {
      return <ArrowDown className="h-3 w-3 mr-1 text-red-500" />;
    } else {
      return <Minus className="h-3 w-3 mr-1 text-yellow-500" />;
    }
  };
  
  const getChangeTextColor = () => {
    if (changeValue > 0) {
      return "text-[#d35f5f]";
    } else if (changeValue < 0) {
      return "text-red-500";
    } else {
      return "text-yellow-500";
    }
  };
  
  return (
    <Card className={`p-4 border-l-4 ${borderColor}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold font-inter text-[#2D3748]">{formatValue(value)}</p>
      <div className="flex items-center mt-2">
        <span className={`text-xs flex items-center ${getChangeTextColor()}`}>
          {getChangeIcon()}
          {Math.abs(changeValue)}%
        </span>
        <span className="text-xs text-gray-500 ml-2">{changeText}</span>
      </div>
    </Card>
  );
};

export default StatCard;
