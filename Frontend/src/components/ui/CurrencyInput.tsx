import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { rupeesToPaise } from '../../utils/currency';

interface CurrencyInputProps {
  label?: string;
  error?: string;
  paiseValue: number;
  onPaiseChange: (paise: number) => void;
  placeholder?: string;
  containerClassName?: string;
  helperText?: string;
  autoFocus?: boolean;
}

/** Format rupee amount in Indian locale: 1,00,000.50 */
function formatIndianDisplay(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees === 0) return '';
  return rupees.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/** Compact label: ₹1.5L, ₹2.3Cr */
function getCompactLabel(paise: number): string | null {
  if (!paise || paise <= 0) return null;
  const r = paise / 100;
  if (r >= 10_000_000) return `${(r / 10_000_000).toFixed(2)} Cr`;
  if (r >= 100_000) return `${(r / 100_000).toFixed(2)} L`;
  if (r >= 1_000) return `${(r / 1_000).toFixed(1)}K`;
  return null;
}

export function CurrencyInput({
  label = 'Amount',
  error,
  paiseValue,
  onPaiseChange,
  placeholder = '0',
  containerClassName = '',
  helperText,
  autoFocus = false,
}: CurrencyInputProps) {
  const inputRef = useRef<any>(null);
  const [rawText, setRawText] = useState(
    paiseValue > 0 ? (paiseValue / 100).toString() : '',
  );
  const [displayText, setDisplayText] = useState(
    paiseValue > 0 ? formatIndianDisplay(paiseValue / 100) : '',
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync external paiseValue updates
  useEffect(() => {
    if (!isFocused) {
      if (paiseValue > 0) {
        setRawText((paiseValue / 100).toString());
        setDisplayText(formatIndianDisplay(paiseValue / 100));
      } else {
        setRawText('');
        setDisplayText('');
      }
    }
  }, [paiseValue, isFocused]);

  const handleChangeText = (text: string) => {
    const stripped = text.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const parts = stripped.split('.');
    const clean =
      (parts[0] ?? '').slice(0, 12) +
      (parts.length > 1 ? '.' + (parts[1] ?? '').slice(0, 2) : '');
    setRawText(clean);
    const rupees = parseFloat(clean) || 0;
    onPaiseChange(rupeesToPaise(rupees));
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayText(rawText);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const rupees = parseFloat(rawText) || 0;
    setDisplayText(rupees > 0 ? formatIndianDisplay(rupees) : '');
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  const compactLabel = getCompactLabel(paiseValue);

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && (
        <Text
          className="text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider"
          style={{ color: '#0f172a' }}
        >
          {label}
        </Text>
      )}

      <Pressable
        onPress={handleContainerPress}
        className={`flex-row items-center px-4 py-3.5 rounded-2xl border bg-white ${
          error
            ? 'border-rose-500'
            : isFocused
            ? 'border-primary-500'
            : 'border-slate-300'
        }`}
        style={{
          backgroundColor: '#ffffff',
          borderColor: error ? '#f43f5e' : isFocused ? '#0c87eb' : '#cbd5e1',
          shadowColor: isFocused ? '#0c87eb' : 'transparent',
          shadowOpacity: isFocused ? 0.15 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: isFocused ? 3 : 0,
        }}
      >
        <Text
          className={`text-2xl font-black mr-1.5 ${
            isFocused ? 'text-primary-600' : 'text-slate-600'
          }`}
          style={{ color: isFocused ? '#026ac8' : '#334155' }}
        >
          ₹
        </Text>

        <TextInput
          ref={inputRef}
          autoFocus={autoFocus}
          className="flex-1 text-2xl font-black text-slate-900 py-1"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          value={isFocused ? rawText : displayText}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            { color: '#0f172a', fontWeight: '900', minHeight: 40 },
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none', borderStyle: 'none', outline: 'none' } as any)
              : undefined,
          ]}
        />
        {compactLabel && !isFocused && (
          <View className="ml-2 bg-primary-100 px-2 py-0.5 rounded-lg border border-primary-200">
            <Text className="text-xs font-bold text-primary-800">
              {compactLabel}
            </Text>
          </View>
        )}
      </Pressable>

      {error ? (
        <Text className="text-xs font-bold text-rose-600 mt-1.5">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs font-medium text-slate-600 mt-1.5">{helperText}</Text>
      ) : paiseValue > 0 ? (
        <Text className="text-xs font-semibold text-slate-600 mt-1.5">
          ₹{formatIndianDisplay(paiseValue / 100)}
          {compactLabel ? ` · ${compactLabel}` : ''}
        </Text>
      ) : null}
    </View>
  );
}
