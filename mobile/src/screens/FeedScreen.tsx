import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { authImageSource, api, MediaItem } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Feed">;

export default function FeedScreen({ navigation }: Props) {
  const { token, user, logout, refreshProfile } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    const result = await api.feed(token);
    setItems(result.items);
    await refreshProfile();
  }, [token, refreshProfile]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener("focus", () => {
      load();
    });
    return unsubscribe;
  }, [navigation, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const initial = user?.displayName?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Media Feed</Text>
              <Text style={styles.headerSubtitle}>Hi {user?.displayName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.balancePill}>
              <Text style={styles.balanceEmoji}>🪙</Text>
              <Text style={styles.balance}>{user?.walletBalance ?? 0}</Text>
            </View>
            <TouchableOpacity onPress={logout} activeOpacity={0.7}>
              <Text style={styles.logout}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🖼️</Text>
                <Text style={styles.empty}>No media yet. Be the first to upload!</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("MediaDetail", { mediaId: item.id })}
            >
              <Image
                source={authImageSource(item.previewUrl, token!)}
                style={styles.thumb}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceEmoji}>🪙</Text>
                  <Text style={styles.cardPrice}>{item.unlockPrice} to unlock</Text>
                </View>
                <View style={[styles.badge, item.locked ? styles.badgeLocked : styles.badgeUnlocked]}>
                  <View style={[styles.badgeDot, item.locked ? styles.dotLocked : styles.dotUnlocked]} />
                  <Text style={[styles.badgeText, item.locked ? styles.badgeTextLocked : styles.badgeTextUnlocked]}>
                    {item.locked ? "Locked" : "Unlocked"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("Upload")} activeOpacity={0.85}>
          <Text style={styles.fabText}>+ Upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 560 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 56,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: theme.accent, fontWeight: "700", fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
  headerSubtitle: { color: theme.textMuted, marginTop: 2, fontSize: 13 },
  headerRight: { alignItems: "flex-end" },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  balanceEmoji: { fontSize: 13 },
  balance: { color: theme.gold, fontWeight: "700", fontSize: 15 },
  logout: { color: theme.danger, marginTop: 8, fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  empty: { color: theme.textMuted, textAlign: "center" },
  card: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  thumb: { width: 104, height: 104, backgroundColor: theme.surfaceAlt },
  cardBody: { flex: 1, padding: 14, justifyContent: "center" },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  priceEmoji: { fontSize: 12 },
  cardPrice: { color: theme.textMuted, fontSize: 13.5 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeLocked: { backgroundColor: theme.dangerSoft },
  badgeUnlocked: { backgroundColor: theme.successSoft },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  dotLocked: { backgroundColor: theme.danger },
  dotUnlocked: { backgroundColor: theme.success },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeTextLocked: { color: theme.danger },
  badgeTextUnlocked: { color: theme.success },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    backgroundColor: theme.accent,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
