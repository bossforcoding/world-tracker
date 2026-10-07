import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import "./lib/i18n";
import { loadStoredLanguage } from "./lib/i18n";
import { VisitedProvider } from "./lib/VisitedContext";
import { useTheme, Theme } from "./lib/theme";
import MapScreen from "./screens/MapScreen";
import PassportScreen from "./screens/PassportScreen";
import CountryDetailScreen from "./screens/CountryDetailScreen";
import CapitalsScreen from "./screens/CapitalsScreen";

const Tab = createBottomTabNavigator();
const MapStack = createNativeStackNavigator();

function MapStackNavigator({ theme }: { theme: Theme }) {
  return (
    <MapStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
      }}
    >
      <MapStack.Screen name="MapHome" component={MapScreen} options={{ headerShown: false }} />
      <MapStack.Screen name="CountryDetail" component={CountryDetailScreen} options={{ title: "" }} />
    </MapStack.Navigator>
  );
}

function Navigation() {
  const theme = useTheme();
  const { t } = useTranslation();

  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.tabInactive,
          tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
          tabBarIcon: ({ color, size }) => {
            const iconName =
              route.name === "Map" ? "map" : route.name === "Capitals" ? "business" : "book";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Map" options={{ tabBarLabel: t("tabs.map") }}>
          {() => <MapStackNavigator theme={theme} />}
        </Tab.Screen>
        <Tab.Screen
          name="Capitals"
          component={CapitalsScreen}
          options={{ tabBarLabel: t("tabs.capitals") }}
        />
        <Tab.Screen
          name="Passport"
          component={PassportScreen}
          options={{ tabBarLabel: t("tabs.passport") }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    loadStoredLanguage();
  }, []);

  return (
    <SafeAreaProvider>
      <VisitedProvider>
        <StatusBar style="auto" />
        <Navigation />
      </VisitedProvider>
    </SafeAreaProvider>
  );
}
