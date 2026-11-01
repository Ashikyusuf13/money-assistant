import { useState, createElement } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { format, parseISO, isValid, addMonths, addYears, subDays } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChangeDate: (dateStr: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  placeholder?: string;
  containerClassName?: string;
  error?: string;
  helperText?: string;
  mode?: 'future' | 'past' | 'any';
}

function safeParseDate(str: string): Date {
  if (!str) return new Date();
  const parsed = parseISO(str);
  return isValid(parsed) ? parsed : new Date();
}

function formatDisplay(str: string): string {
  if (!str) return 'Select Date';
  const d = safeParseDate(str);
  return format(d, 'dd MMM yyyy');
}

export function DatePicker({
  label = 'Date',
  value,
  onChangeDate,
  minDate,
  maxDate,
  placeholder = 'Select Date',
  containerClassName = '',
  error,
  helperText,
  mode = 'any',
}: DatePickerProps) {
  const [showModal, setShowModal] = useState(false);

  // Active viewing month in calendar
  const currentDate = safeParseDate(value);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth()); // 0-indexed

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    onChangeDate(dateStr);
    setShowModal(false);
  };

  // Generate days in month grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Presets based on mode
  const today = new Date();
  const presets =
    mode === 'future'
      ? [
          { label: '+3 Months', date: addMonths(today, 3) },
          { label: '+6 Months', date: addMonths(today, 6) },
          { label: '+1 Year', date: addYears(today, 1) },
          { label: '+2 Years', date: addYears(today, 2) },
          {
            label: 'End of Year',
            date: new Date(today.getFullYear(), 11, 31),
          },
        ]
      : mode === 'past'
      ? [
          { label: 'Today', date: today },
          { label: 'Yesterday', date: subDays(today, 1) },
          { label: '3 Days Ago', date: subDays(today, 3) },
          { label: '1 Week Ago', date: subDays(today, 7) },
        ]
      : [
          { label: 'Today', date: today },
          { label: '+6 Months', date: addMonths(today, 6) },
          { label: '+1 Year', date: addYears(today, 1) },
        ];

  const handleApplyPreset = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChangeDate(`${yyyy}-${mm}-${dd}`);
  };

  // Check if a day matches selected value
  const isSelectedDay = (day: number) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    return y === viewYear && m === viewMonth + 1 && d === day;
  };

  const isTodayDay = (day: number) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

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

      {/* Trigger Button with Calendar Display */}
      <View className="relative">
        <Pressable
          onPress={() => {
            const cur = safeParseDate(value);
            setViewYear(cur.getFullYear());
            setViewMonth(cur.getMonth());
            setShowModal(true);
          }}
          className={`flex-row items-center justify-between px-4 py-3 rounded-2xl border bg-white active:opacity-90 ${
            error
              ? 'border-rose-500 bg-rose-50/10'
              : 'border-slate-300'
          }`}
          style={{ backgroundColor: '#ffffff', borderColor: error ? '#f43f5e' : '#cbd5e1' }}
        >
          <View className="flex-row items-center gap-2.5 flex-1">
            <View className="w-8 h-8 rounded-xl bg-primary-100 items-center justify-center">
              <CalendarIcon size={16} color="#026ac8" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900" style={{ color: '#0f172a' }}>
                {value ? formatDisplay(value) : placeholder}
              </Text>
              <Text className="text-[11px] font-semibold text-slate-500">
                {value || 'Tap to choose date'}
              </Text>
            </View>
          </View>

          <View className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Text className="text-[11px] font-bold text-primary-700">
              Change
            </Text>
          </View>
        </Pressable>

        {/* On Web: invisible HTML5 date input overlay to allow instant native browser calendar popups */}
        {Platform.OS === 'web' &&
          createElement('input', {
            type: 'date',
            value: value || '',
            min: minDate || '',
            max: maxDate || '',
            onChange: (e: any) => {
              if (e?.target?.value) {
                onChangeDate(e.target.value);
              }
            },
            style: {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 10,
            },
          })}
      </View>

      {/* Quick Preset Pills */}
      <View className="flex-row flex-wrap gap-1.5 mt-2">
        {presets.map((p, idx) => (
          <Pressable
            key={idx}
            onPress={() => handleApplyPreset(p.date)}
            className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg active:opacity-70"
          >
            <Text className="text-[10px] font-bold text-slate-700">
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text className="text-xs font-bold text-rose-600 mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs font-medium text-slate-600 mt-1">{helperText}</Text>
      ) : null}

      {/* Interactive In-App Calendar Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View
            className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-xl"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-[11px] font-bold text-primary-700 uppercase tracking-wider">
                  Pick A Date
                </Text>
                <Text className="text-lg font-black text-slate-900" style={{ color: '#0f172a' }}>
                  {formatDisplay(value || new Date().toISOString().split('T')[0]!)}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <X size={16} color="#334155" />
              </Pressable>
            </View>

            {/* Month & Year Navigation Bar */}
            <View className="flex-row items-center justify-between bg-slate-100 p-2 rounded-2xl mb-4 border border-slate-200">
              <Pressable
                onPress={handlePrevMonth}
                className="w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm active:scale-95 border border-slate-200"
              >
                <ChevronLeft size={18} color="#0c87eb" />
              </Pressable>

              <Text className="text-sm font-black text-slate-900" style={{ color: '#0f172a' }}>
                {monthNames[viewMonth]} {viewYear}
              </Text>

              <Pressable
                onPress={handleNextMonth}
                className="w-8 h-8 rounded-xl bg-white items-center justify-center shadow-sm active:scale-95 border border-slate-200"
              >
                <ChevronRight size={18} color="#0c87eb" />
              </Pressable>
            </View>

            {/* Quick Year Jump Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1.5 mb-3"
            >
              {[
                today.getFullYear(),
                today.getFullYear() + 1,
                today.getFullYear() + 2,
                today.getFullYear() + 3,
                today.getFullYear() + 5,
              ].map((yr) => (
                <Pressable
                  key={yr}
                  onPress={() => setViewYear(yr)}
                  className={`px-3 py-1 rounded-lg border ${
                    viewYear === yr
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      viewYear === yr ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {yr}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Weekday Headers */}
            <View className="flex-row justify-between mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <View key={i} className="w-10 items-center">
                  <Text className="text-[11px] font-bold text-slate-500">{d}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View className="flex-row flex-wrap">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} className="w-10 h-10" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const selected = isSelectedDay(day);
                const isCurrent = isTodayDay(day);

                return (
                  <Pressable
                    key={`day-${day}`}
                    onPress={() => handleSelectDay(day)}
                    className={`w-10 h-10 rounded-xl items-center justify-center m-0.5 ${
                      selected
                        ? 'bg-primary-600 shadow-sm'
                        : isCurrent
                        ? 'bg-primary-100 border border-primary-300'
                        : 'active:bg-slate-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected
                          ? 'text-white font-black'
                          : isCurrent
                          ? 'text-primary-800 font-black'
                          : 'text-slate-900 font-bold'
                      }`}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Presets in Modal */}
            <View className="flex-row flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-200">
              {presets.map((p, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    handleApplyPreset(p.date);
                    setShowModal(false);
                  }}
                  className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl active:opacity-70"
                >
                  <Text className="text-xs font-bold text-slate-800">
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
