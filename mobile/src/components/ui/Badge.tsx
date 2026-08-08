import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  className = '',
  ...props
}) => {
  let badgeStyle = 'px-2.5 py-1 rounded-full self-start ';
  let textStyle = 'text-xs font-semibold ';

  if (variant === 'primary') {
    badgeStyle += 'bg-blue-50 border border-blue-100 ';
    textStyle += 'text-blue-700 ';
  } else if (variant === 'secondary') {
    badgeStyle += 'bg-slate-50 border border-slate-200 ';
    textStyle += 'text-slate-700 ';
  } else if (variant === 'success') {
    badgeStyle += 'bg-emerald-50 border border-emerald-100 ';
    textStyle += 'text-emerald-700 ';
  } else if (variant === 'warning') {
    badgeStyle += 'bg-amber-50 border border-amber-100 ';
    textStyle += 'text-amber-700 ';
  } else if (variant === 'danger') {
    badgeStyle += 'bg-red-50 border border-red-100 ';
    textStyle += 'text-red-700 ';
  } else if (variant === 'info') {
    badgeStyle += 'bg-teal-50 border border-teal-100 ';
    textStyle += 'text-teal-700 ';
  }

  return (
    <View className={`${badgeStyle} ${className}`} {...props}>
      <Text className={textStyle}>{label}</Text>
    </View>
  );
};

export default Badge;
