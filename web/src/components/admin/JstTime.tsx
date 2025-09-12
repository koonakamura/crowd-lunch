import React from 'react';
import { formatJst, formatJstDate } from '../../utils/datetime';

interface JstTimeProps {
  value: string | number | Date | null | undefined;
  dateOnly?: boolean;
  className?: string;
}

/**
 * JST Time display component for Admin screens
 * Ensures consistent JST display across all Admin date/time fields
 */
export const JstTime: React.FC<JstTimeProps> = ({ 
  value, 
  dateOnly = false, 
  className 
}) => {
  const formattedTime = dateOnly ? formatJstDate(value) : formatJst(value);
  
  return (
    <span className={className}>
      {formattedTime}
    </span>
  );
};
