import React from 'react';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Loading: React.FC<LoadingProps> = ({
  text = 'Завантаження',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        {/* Зовнішнє кільце */}
        <div
          className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full`}
        />
        {/* Внутрішнє кільце що обертається */}
        <div
          className={`${sizeClasses[size]} absolute top-0 left-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin`}
        />
      </div>

      {text && (
        <p className="mt-4 text-gray-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default Loading;
