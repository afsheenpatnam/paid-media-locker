import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError, api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Upload">;
type PickedAsset = { uri: string; fileName: string; mimeType: string };

export default function UploadScreen({ navigation }: Props) {
  const { token, refreshProfile } = useAuth();
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("10");
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo library access to select an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked = result.assets[0];
    setAsset({
      uri: picked.uri,
      fileName: picked.fileName ?? `upload-${Date.now()}.jpg`,
      mimeType: picked.mimeType ?? "image/jpeg",
    });
  }

  async function publish() {
    if (!asset) {
      Alert.alert("Select an image first");
      return;
    }
    const unlockPrice = Number(price);
    if (!title.trim() || Number.isNaN(unlockPrice) || unlockPrice < 0) {
      Alert.alert("Please enter a title and a valid non-negative price");
      return;
    }
    setBusy(true);
    try {
      await api.upload(token!, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        title: title.trim(),
        description: description.trim() || undefined,
        unlockPrice,
      });
      await refreshProfile();
      Alert.alert("Published!", "Your media is now live in the feed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Upload Media</Text>
        <Text style={styles.subtitle}>Share something and set your price</Text>

        <TouchableOpacity
          style={[styles.picker, asset && styles.pickerFilled]}
          onPress={pickImage}
          activeOpacity={0.85}
        >
          {asset ? (
            <Image source={{ uri: asset.uri }} style={styles.previewImage} contentFit="cover" />
          ) : (
            <>
              <Text style={styles.pickerEmoji}>📷</Text>
              <Text style={styles.pickerText}>Tap to select an image</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, focusedField === "title" && styles.inputFocused]}
            placeholder="Give it a name"
            placeholderTextColor={theme.textFaint}
            value={title}
            onChangeText={setTitle}
            onFocus={() => setFocusedField("title")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline, focusedField === "description" && styles.inputFocused]}
            placeholder="Add a short description"
            placeholderTextColor={theme.textFaint}
            value={description}
            onChangeText={setDescription}
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Unlock price</Text>
          <View style={[styles.priceInputWrap, focusedField === "price" && styles.inputFocused]}>
            <Text style={styles.priceEmoji}>🪙</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="10"
              placeholderTextColor={theme.textFaint}
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
              onFocus={() => setFocusedField("price")}
              onBlur={() => setFocusedField(null)}
            />
            <Text style={styles.priceSuffix}>coins</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={publish} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Publish</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 560 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 60 },
  headerRow: { marginBottom: 12 },
  back: { color: theme.accent, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: theme.text },
  subtitle: { fontSize: 14, color: theme.textMuted, marginTop: 4, marginBottom: 22 },
  picker: {
    height: 200,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  pickerFilled: { borderStyle: "solid" },
  pickerEmoji: { fontSize: 30, marginBottom: 8 },
  previewImage: { width: "100%", height: "100%" },
  pickerText: { color: theme.textMuted, fontSize: 14 },
  fieldGroup: { width: "100%", marginBottom: 16 },
  label: { color: theme.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 2 },
  input: {
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
  multiline: { minHeight: 84, textAlignVertical: "top" },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 16,
  },
  priceEmoji: { fontSize: 16, marginRight: 8 },
  priceInput: { flex: 1, color: theme.text, paddingVertical: 13, fontSize: 16 },
  priceSuffix: { color: theme.textFaint, fontSize: 14 },
  button: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
