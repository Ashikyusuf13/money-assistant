import { View, Text, Modal, Pressable } from 'react-native';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle?: string;
  cancelTitle?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmTitle = 'Confirm',
  cancelTitle = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        className="flex-1 bg-black/60 items-center justify-center p-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-[340px] bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-2xl"
        >
          <View className="items-center mb-4">
            <View
              className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${
                isDestructive ? 'bg-rose-50 dark:bg-rose-950/60' : 'bg-primary-50'
              }`}
            >
              <AlertTriangle
                size={24}
                color={isDestructive ? '#e11d48' : '#0c87eb'}
              />
            </View>
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center">
              {title}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1.5 leading-relaxed">
              {message}
            </Text>
          </View>

          <View className="gap-2.5 mt-2">
            <Button
              title={confirmTitle}
              variant={isDestructive ? 'destructive' : 'primary'}
              loading={isLoading}
              onPress={onConfirm}
            />
            <Button
              title={cancelTitle}
              variant="outline"
              disabled={isLoading}
              onPress={onCancel}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
