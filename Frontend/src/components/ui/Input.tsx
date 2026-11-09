import { useState, useRef, type ReactNode } from 'react';
import { View, Text, TextInput, TextInputProps, Pressable, Platform } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerClassName = '',
  helperText,
  className = '',
  secureTextEntry,
  autoFocus,
  ...props
}: InputProps) {
  const inputRef = useRef<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry !== undefined;

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View className={`w-full ${containerClassName}`}>
      {label ? (
        <Text
          className="text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider"
          style={{ color: '#0f172a' }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={handleContainerPress}
        className={`flex-row items-center px-3.5 py-3 rounded-xl border bg-white ${
          error
            ? 'border-rose-500 bg-rose-50/20'
            : isFocused
            ? 'border-primary-500'
            : 'border-slate-300'
        }`}
        style={{
          backgroundColor: '#ffffff',
          borderColor: error ? '#f43f5e' : isFocused ? '#0c87eb' : '#cbd5e1',
        }}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}

        <TextInput
          ref={inputRef}
          autoFocus={autoFocus}
          className={`flex-1 text-slate-900 text-sm py-1 ${className}`}
          placeholderTextColor="#94a3b8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword ? !isPasswordVisible : false}
          style={[
            { color: '#0f172a', minHeight: 38 },
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none', borderStyle: 'none', outline: 'none' } as any)
              : undefined,
            props.style,
          ]}
          {...props}
        />

        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="p-1 -mr-1"
          >
            <Text className="text-xs font-semibold text-slate-600">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}

        {rightIcon && !isPassword && <View className="ml-2.5">{rightIcon}</View>}
      </Pressable>

      {error ? (
        <Text className="text-xs font-bold text-rose-600 mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs font-medium text-slate-600 mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
}
