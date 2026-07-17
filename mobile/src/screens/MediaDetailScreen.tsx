import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError, MediaDetails, api, authImageSource } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "MediaDetail">;

export default function MediaDetailScreen({ route }: Props) {
  const { mediaId } = route.params;
  const { token, refreshProfile } = useAuth();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const result = await api.mediaDetails(token, mediaId);
    setDetails(result);
  }, [token, mediaId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function unlock() {
    setUnlocking(true);
    try {
      await api.unlock(token!, mediaId);
      await refreshProfile();
      await load();
    } catch (e) {
      Alert.alert("Unlock failed", e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setUnlocking(false);
    }
  }

  if (loading || !details) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const { media, originalUrl } = details;
  const imageSource =
    !media.locked && originalUrl ? authImageSource(originalUrl, token!) : authImageSource(media.previewUrl, token!);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} bounces={false}>
        <View style={styles.imageWrap}>
          <Image source={imageSource} style={styles.image} contentFit="cover" transition={150} />
          {media.locked && (
            <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
              <Text style={styles.lockEmoji}>🔒</Text>
            </View>
          )}
        </View>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{media.title}</Text>
            <View style={[styles.badge, media.locked ? styles.badgeLocked : styles.badgeUnlocked]}>
              <Text style={[styles.badgeText, media.locked ? styles.badgeTextLocked : styles.badgeTextUnlocked]}>
                {media.locked ? "Locked" : "Unlocked"}
              </Text>
            </View>
          </View>
          {media.description ? <Text style={styles.description}>{media.description}</Text> : null}

          <View style={styles.priceCard}>
            <Text style={styles.priceEmoji}>🪙</Text>
            <View>
              <Text style={styles.priceLabel}>Unlock price</Text>
              <Text style={styles.price}>{media.unlockPrice} coins</Text>
            </View>
          </View>

          {media.locked ? (
            <TouchableOpacity style={styles.button} onPress={unlock} disabled={unlocking} activeOpacity={0.85}>
              {unlocking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Unlock for {media.unlockPrice} coins</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedEmoji}>✅</Text>
              <Text style={styles.unlockedText}>Unlocked — viewing original</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 560 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg },
  imageWrap: { width: "100%", height: 320, backgroundColor: theme.surfaceAlt },
  image: { width: "100%", height: "100%" },
  lockOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.2)",
  },
  lockEmoji: { fontSize: 40 },
  card: {
    padding: 22,
    marginTop: -20,
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontWeight: "700", color: theme.text, flexShrink: 1, marginRight: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeLocked: { backgroundColor: theme.dangerSoft },
  badgeUnlocked: { backgroundColor: theme.successSoft },
  badgeText: { fontSize: 12.5, fontWeight: "700" },
  badgeTextLocked: { color: theme.danger },
  badgeTextUnlocked: { color: theme.success },
  description: { color: theme.textMuted, marginTop: 10, fontSize: 14.5, lineHeight: 21 },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  priceEmoji: { fontSize: 26 },
  priceLabel: { color: theme.textMuted, fontSize: 12.5 },
  price: { color: theme.gold, fontWeight: "700", fontSize: 18, marginTop: 2 },
  button: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.successSoft,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 22,
  },
  unlockedEmoji: { fontSize: 16 },
  unlockedText: { color: theme.success, fontWeight: "700" },
});
