import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Server, CheckCircle2, AlertTriangle, RefreshCw, X, Wifi } from 'lucide-react-native';
import {
  getCurrentApiBaseUrl,
  setApiBaseUrl,
  testServerConnection,
} from '../services/api';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ServerConfigModal({ visible, onClose }: ServerConfigModalProps) {
  const [url, setUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setUrl(getCurrentApiBaseUrl());
      setTestResult(null);
    }
  }, [visible]);

  const handleTest = async () => {
    if (!url.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    const result = await testServerConnection(url.trim());
    setIsTesting(false);
    setTestResult(result);
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    setIsSaving(true);
    await setApiBaseUrl(url.trim());
    setIsSaving(false);
    onClose();
  };

  const applyPreset = (presetUrl: string) => {
    setUrl(presetUrl);
    setTestResult(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-center items-center px-4"
      >
        <View className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/60 items-center justify-center">
                <Server size={20} color="#026ac8" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Backend Server IP
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Configure API endpoint for mobile
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Quick presets */}
          <View className="mt-4 mb-2">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Presets
            </Text>
            <View className="gap-2">
              <TouchableOpacity
                onPress={() => applyPreset('https://money-assistant-backend.vercel.app/api/v1')}
                className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex-row items-center justify-between border border-emerald-200 dark:border-emerald-800"
              >
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Vercel Cloud (Live Production)
                  </Text>
                </View>
                <Text className="text-[10px] text-emerald-600 font-semibold">Recommended</Text>
              </TouchableOpacity>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => applyPreset('http://10.38.224.153:5000/api/v1')}
                  className="flex-1 py-2 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex-row items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <Wifi size={13} color="#026ac8" />
                  <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    PC Wi-Fi LAN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => applyPreset('http://10.0.2.2:5000/api/v1')}
                  className="py-2 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex-row items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <Text className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Emulator
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Input */}
          <View className="mt-3">
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              API Base URL
            </Text>
            <TextInput
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setTestResult(null);
              }}
              placeholder="http://10.38.224.153:5000/api/v1"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100"
            />
            <Text className="text-[11px] text-slate-400 mt-1">
              Ensure your phone is connected to the same Wi-Fi as your PC.
            </Text>
          </View>

          {/* Test connection feedback */}
          {testResult && (
            <View
              className={`mt-3 p-3 rounded-xl flex-row items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} color="#059669" />
              ) : (
                <AlertTriangle size={16} color="#e11d48" />
              )}
              <Text
                className={`text-xs font-semibold flex-1 ${
                  testResult.success
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {testResult.message}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View className="flex-row gap-2 mt-5">
            <TouchableOpacity
              onPress={handleTest}
              disabled={isTesting}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex-row items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#026ac8" />
              ) : (
                <RefreshCw size={15} color="#475569" />
              )}
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Test Connection
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-primary-600 rounded-2xl items-center justify-center shadow-md active:bg-primary-700"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-xs font-bold text-white">
                  Save & Apply
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

