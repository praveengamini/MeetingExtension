import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationComponent = ({ notification, setNotification }) => {
  if (!notification.show) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-3 rounded-lg border ${getBgColor()} shadow-lg flex items-center space-x-2 max-w-xs`}>
      {getIcon()}
      <span className="text-sm text-gray-800">{notification.message}</span>
      <button
        onClick={() => setNotification({ show: false, message: '', type: 'info' })}
        className="text-gray-500 hover:text-gray-700"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationComponent;