import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface MobileButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  title,
  onPress,
  variant = 'primary'
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          variant === 'outline' && { color: '#f9fafb' },
          variant === 'secondary' && { color: '#f9fafb' }
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4
  },
  primary: {
    backgroundColor: '#6366f1'
  },
  secondary: {
    backgroundColor: '#1f2937'
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)'
  },
  danger: {
    backgroundColor: '#ef4444'
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  }
});
