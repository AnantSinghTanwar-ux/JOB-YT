import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { COLORS } from '../../constants';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  let btnStyle = 'rounded-xl flex-row justify-center items-center ';
  let textStyle = 'font-bold text-center ';

  if (variant === 'primary' || variant === 'brand') {
    btnStyle += 'bg-slate-900 border border-slate-900 ';
    textStyle += 'text-brand-primary ';
  } else if (variant === 'secondary') {
    btnStyle += 'bg-blue-600 border border-blue-600 ';
    textStyle += 'text-white ';
  } else if (variant === 'outline') {
    btnStyle += 'border border-slate-200 bg-transparent ';
    textStyle += 'text-slate-700 ';
  } else if (variant === 'ghost') {
    btnStyle += 'bg-transparent ';
    textStyle += 'text-slate-500 ';
  } else if (variant === 'danger') {
    btnStyle += 'bg-rose-600 border border-rose-600 ';
    textStyle += 'text-white ';
  }

  if (size === 'sm') {
    btnStyle += 'px-3 py-2 ';
    textStyle += 'text-xs ';
  } else if (size === 'md') {
    btnStyle += 'px-5 py-3 ';
    textStyle += 'text-sm ';
  } else if (size === 'lg') {
    btnStyle += 'px-6 py-4 ';
    textStyle += 'text-base ';
  }

  if (disabled || loading) {
    btnStyle += 'opacity-55 ';
  }

  const indicatorColor =
    variant === 'primary' || variant === 'brand'
      ? COLORS.primary
      : variant === 'outline' || variant === 'ghost'
      ? '#0b1120'
      : '#ffffff';

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`${btnStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={indicatorColor}
          className="mr-2"
        />
      ) : null}
      <Text className={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
};
export default Button;
