import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: string;
  percentage: string;
  isPositive: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  iconBgColor,
  iconColor,
  title,
  value,
  percentage,
  isPositive,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col justify-between h-full border border-gray-100">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-lg sm:text-xl"
          style={{ backgroundColor: iconBgColor, color: iconColor }}
        >
          {icon}
        </div>
        <div
          className={`text-xs sm:text-sm font-medium ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}{percentage}
        </div>
      </div>
      <div>
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</h3>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">{title}</p>
      </div>
    </div>
  );
};

export default MetricCard;
