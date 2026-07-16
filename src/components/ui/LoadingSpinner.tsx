import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  message?: string;
}

export function LoadingSpinner({ size = 32, className = '', message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full p-8 ${className}`}>
      <Loader2 
        className="animate-spin text-primary/70" 
        size={size} 
        strokeWidth={2.5}
      />
      {message && (
        <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
