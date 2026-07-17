import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { theme } from "../theme";

function Field({
  label,
  focusedField,
  fieldKey,
  setFocusedField,
  ...inputProps
}: {
  label: string;
  focusedField: string | null;
  fieldKey: string;
  setFocusedField: (key: string | null) => void;
} & React.ComponentProps<typeof TextInput>) {
  const focused = focusedField === fieldKey;
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholderTextColor={theme.textFaint}
        onFocus={() => setFocusedField(fieldKey)}
        onBlur={() => setFocusedField(null)}
        {...inputProps}
      />
    </View>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim());
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconEmoji}>🔒</Text>
          </View>
          <Text style={styles.title}>Paid Media Locker</Text>
          <Text style={styles.subtitle}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>

          <View style={styles.form}>
            {mode === "register" && (
              <Field
                label="Display name"
                fieldKey="displayName"
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                placeholder="Jane Doe"
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
              />
            )}
            <Field
              label="Email"
              fieldKey="email"
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              fieldKey="password"
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={submit} disabled={busy} activeOpacity={0.85}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Create account"}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")} activeOpacity={0.7}>
            <Text style={styles.switchText}>
              {mode === "login" ? "Need an account? " : "Already have an account? "}
              <Text style={styles.switchTextAccent}>{mode === "login" ? "Register" : "Log in"}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 26 },
  title: { fontSize: 24, fontWeight: "700", color: theme.text, textAlign: "center" },
  subtitle: { fontSize: 15, color: theme.textMuted, textAlign: "center", marginTop: 6, marginBottom: 28 },
  form: { width: "100%" },
  fieldGroup: { width: "100%", marginBottom: 16 },
  label: { color: theme.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 2 },
  input: {
    width: "100%",
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
  },
  inputFocused: { borderColor: theme.borderFocus, backgroundColor: theme.surface },
  errorBox: {
    width: "100%",
    backgroundColor: theme.dangerSoft,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  error: { color: theme.danger, textAlign: "center", fontSize: 13.5 },
  button: {
    width: "100%",
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  divider: { width: "100%", height: 1, backgroundColor: theme.border, marginVertical: 20 },
  switchText: { color: theme.textMuted, textAlign: "center", fontSize: 14.5 },
  switchTextAccent: { color: theme.accent, fontWeight: "700" },
});
