import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export const MobileCard: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  }
});
