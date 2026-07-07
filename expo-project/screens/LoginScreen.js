import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, LOCAL_USER_KEY } from '../services/supabase';

export default function LoginScreen({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (supabase) {
        // Login Real com Supabase
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (sbError) throw sbError;

        if (data?.user) {
          await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
          onLoginSuccess(data.user);
        }
      } else {
        // Login Simulado (Offline)
        // No simulador offline local, vamos aceitar qualquer senha de pelo menos 6 caracteres
        if (password.length < 6) {
          throw new Error('A senha precisa ter pelo menos 6 caracteres no simulador.');
        }

        // Criar ou recuperar usuário simulado
        const simulatedUser = {
          id: 'offline-user-' + email.trim().replace(/[^a-zA-Z0-9]/g, ''),
          email: email.trim().toLowerCase(),
          isOffline: true
        };

        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(simulatedUser));
        Alert.alert(
          'Modo Offline Ativo',
          'Conectado com sucesso usando a conta simulada local!'
        );
        onLoginSuccess(simulatedUser);
      }
    } catch (err) {
      setError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>⏰</Text>
          </View>
          <Text style={styles.title}>RotinaApp</Text>
          <Text style={styles.subtitle}>Lembretes inteligentes baseados em localização</Text>
        </View>

        {/* Inputs Form */}
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-MAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SENHA</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Entrar no Aplicativo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Navigation Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta? </Text>
          <TouchableOpacity onPress={onNavigateToRegister}>
            <Text style={styles.footerLink}>Cadastre-se grátis</Text>
          </TouchableOpacity>
        </View>

        {/* Status Mode Indicator */}
        <View style={styles.badgeContainer}>
          <View style={[styles.statusBadge, supabase ? styles.onlineBadge : styles.offlineBadge]}>
            <Text style={styles.statusBadgeText}>
              {supabase ? 'Supabase Conectado' : 'Modo Offline Ativo (Local)'}
            </Text>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
    textDecorationLine: 'underline',
  },
  badgeContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1,
  },
  onlineBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  offlineBadge: {
    backgroundColor: '#f0f4f8',
    borderColor: '#e2e8f0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  }
});
