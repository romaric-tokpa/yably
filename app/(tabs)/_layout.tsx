import { Tabs } from 'expo-router';
import { Bell, Compass, User } from 'lucide-react-native';
import { Platform } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { fonts } from '@/lib/fonts';

export default function TabLayout() {
  const { theme: t, nightMode } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, true),
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: fonts.outfitSemiBold,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: nightMode ? t.surface : t.bg,
          borderTopColor: t.border,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 88 : 72,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorer',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Compass size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <User size={size ?? 22} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
