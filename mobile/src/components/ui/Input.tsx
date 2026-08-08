import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <View className="mb-4 w-full">
      {label ? (
        <Text className="text-slate-700 text-sm font-semibold mb-2">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#94a3b8"
        className={`bg-slate-50 border ${
          error ? 'border-red-500' : 'border-slate-200'
        } rounded-xl px-4 py-3 text-slate-900 text-sm focus:border-slate-800 ${className}`}
        {...props}
      />
      {error ? (
        <Text className="text-red-500 text-xs mt-1 font-medium">{error}</Text>
      ) : null}
    </View>
  );
};

export default Input;
