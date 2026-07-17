import React from "react";
import { ActivityIndicator, View } from "react-native";
import { DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import AuthScreen from "../screens/AuthScreen";
import FeedScreen from "../screens/FeedScreen";
import MediaDetailScreen from "../screens/MediaDetailScreen";
import UploadScreen from "../screens/UploadScreen";
import { RootStackParamList } from "./types";
import { theme } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.bg,
    text: theme.text,
    border: theme.border,
    primary: theme.accent,
  },
};

export default function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Feed" component={FeedScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Upload" component={UploadScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MediaDetail" component={MediaDetailScreen} options={{ title: "Media" }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
