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

export default function CadastroScreen({ onCadastroSuccess, onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (supabase) {
        // Cadastro no Supabase Real
        const { data, error: sbError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (sbError) throw sbError;

        if (data?.user) {
          setSuccess(true);
          await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
          
          setTimeout(() => {
            onCadastroSuccess(data.user);
          }, 1500);
        } else {
          throw new Error('Confirme seu e-mail para validar sua conta se necessário.');
        }
      } else {
        // Cadastro Simulado Offline (Salva no AsyncStorage)
        setSuccess(true);
        const simulatedUser = {
          id: 'offline-user-' + email.trim().replace(/[^a-zA-Z0-9]/g, ''),
          email: email.trim().toLowerCase(),
          isOffline: true
        };

        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(simulatedUser));
        
        setTimeout(() => {
          Alert.alert('Simulador de Conta', 'Conta simulada cadastrada com sucesso!');
          onCadastroSuccess(simulatedUser);
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Erro ao realizar cadastro.');
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
        
        {/* Back navigation button */}
        <TouchableOpacity style={styles.backButton} onPress={onNavigateToLogin}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para monitorar suas tarefas geográficas em tempo real</Text>
        </View>

        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Cadastro concluído!</Text>
            <Text style={styles.successText}>Iniciando sua sessão automática...</Text>
          </View>
        ) : (
          /* Inputs Form */
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
              <Text style={styles.label}>SENHA (MÍN. 6 CARACTERES)</Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRMAR SENHA</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar Minha Conta</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Link */}
        {!success && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.footerLink}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        )}

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
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    lineHeight: 18,
  },
  form: {
    marginBottom: 16,
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
    marginTop: 12,
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
  successCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  successText: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 6,
    fontWeight: '500',
  }
});
