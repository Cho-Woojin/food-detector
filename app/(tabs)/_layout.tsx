import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { color, glass, typography } from '@/constants/tokens';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: color.brand.primary,
        tabBarInactiveTintColor: color.status.neutral,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          ...glass.regular,
          borderTopColor: color.border.default,
          borderTopWidth: 0.5,
          height: 76,
          paddingTop: 10,
          paddingBottom: 14,
        },
        tabBarLabelStyle: {
          ...typography.footnote,
          lineHeight: 16,
          marginTop: 2,
        },
        headerStyle: { backgroundColor: color.surface.subtle },
        headerTintColor: color.text.primary,
        headerTitleStyle: typography.headline,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color: c, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={c} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          headerShown: false,
          tabBarIcon: ({ color: c, focused }) => (
            <TabBarIcon name={focused ? 'map' : 'map-outline'} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: '좋아요',
          headerShown: false,
          tabBarIcon: ({ color: c, focused }) => (
            <TabBarIcon name={focused ? 'heart' : 'heart-outline'} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내정보',
          headerShown: false,
          tabBarIcon: ({ color: c, focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={c} />
          ),
        }}
      />
    </Tabs>
  );
}
