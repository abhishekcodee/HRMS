import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MobileBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

export const MobileBadge: React.FC<MobileBadgeProps> = ({ label, variant = 'neutral' }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' };
      case 'neutral':
      default:
        return { bg: '#1f2937', text: '#9ca3af' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: 11,
    fontWeight: '700'
  }
});
