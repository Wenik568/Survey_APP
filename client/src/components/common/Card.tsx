import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
  ...rest
}) => {
  return (
    <div
      className={`
        bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl
        border border-white/50 overflow-hidden
        ${hover ? 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
      onClick={onClick}
      {...rest}
    >
      {/* Градієнтна лінія зверху */}
      <div className="h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-secondary-500" />

      {children}
    </div>
  );
};

export default Card;
