/**
 * Reusable status card components for displaying different states (loading, error, info)
 */

import React from 'react';

interface StatusCardProps {
  type: 'error' | 'info' | 'loading';
  title: string;
  message: string;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
}

const statusConfig = {
  error: {
    bgClass: 'bg-red-50 dark:bg-red-900/10',
    borderClass: 'border-red-300 dark:border-red-800',
    iconClass: 'text-red-500',
    textClass: 'text-red-700 dark:text-red-400',
    buttonClass: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 focus:ring-red-500',
    icon: (
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    ),
  },
  info: {
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/10',
    borderClass: 'border-yellow-300 dark:border-yellow-800',
    iconClass: 'text-yellow-500',
    textClass: 'text-yellow-700 dark:text-yellow-400',
    buttonClass: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 focus:ring-yellow-500',
    icon: (
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
    ),
  },
  loading: {
    bgClass: 'bg-blue-50 dark:bg-blue-900/10',
    borderClass: 'border-blue-100 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    textClass: 'text-blue-700 dark:text-blue-400',
    buttonClass: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 focus:ring-blue-500',
    icon: null, // Loading will use a spinner
  },
};

export const StatusCard: React.FC<StatusCardProps> = ({
  type,
  title,
  message,
  onRetry,
  onAction,
  actionLabel = 'Retry',
  children,
}) => {
  const config = statusConfig[type];

  return (
    <div className={`p-6 border rounded-lg shadow-sm my-4 animate-fadeIn ${config.bgClass} ${config.borderClass}`}>
      <div className="flex items-center">
        {type === 'loading' ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-blue-600 border-r-blue-600 border-b-blue-300 border-l-blue-300 mr-3" />
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 mr-3 ${config.iconClass}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            {config.icon}
          </svg>
        )}
        <h3 className={`text-lg font-medium ${config.textClass}`}>
          {title}
        </h3>
      </div>
      
      <p className={`mt-3 ml-9 ${config.textClass}`}>
        {message}
      </p>
      
      {children && (
        <div className="mt-4 ml-9">
          {children}
        </div>
      )}
      
      {(onRetry || onAction) && (
        <div className="mt-4 ml-9">
          <button
            onClick={onRetry || onAction}
            className={`text-sm px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 font-medium ${config.buttonClass}`}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusCard;