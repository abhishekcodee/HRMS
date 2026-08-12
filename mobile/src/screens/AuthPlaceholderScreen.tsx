import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  onLoginSuccess: () => void;
}

export function AuthPlaceholderScreen({ onLoginSuccess }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Text style={styles.logoText}>H</Text>
      </View>
      <Text style={styles.title}>HRMS Mobile</Text>
      <Text style={styles.subtitle}>Single-Company Enterprise HR Portal</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Authentication Boundary</Text>
        <Text style={styles.cardBody}>
          Supports Employee & Manager sign-in via secure JWT & OAuth tokens.
        </Text>

        <TouchableOpacity style={styles.button} onPress={onLoginSuccess}>
          <Text style={styles.buttonText}>Simulate Login (Enter App)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
