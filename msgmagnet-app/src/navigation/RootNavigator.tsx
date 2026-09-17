import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '../screens/LoginScreen';
import { CardsListScreen } from '../screens/CardsListScreen';
import { CardDetailScreen } from '../screens/CardDetailScreen';
import { NetworkMapScreen } from '../screens/NetworkMapScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ShareQRScreen } from '../screens/ShareQRScreen';
import { MeetingVoiceScreen } from '../screens/MeetingVoiceScreen';
import { CommunityFeedScreen } from '../screens/CommunityFeedScreen';
import { TemplateVaultScreen } from '../screens/TemplateVaultScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0f19', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0b0f19',
        },
        headerTitleStyle: {
          color: '#ffffff',
          fontWeight: '800',
        },
        headerTintColor: '#ffffff',
      }}
    >
      {!token ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="CardsList"
            component={CardsListScreen}
            options={{ title: 'All Contacts & Leads' }}
          />

          <Stack.Screen
            name="CardDetail"
            component={CardDetailScreen}
            options={{ title: 'Lead Dossier' }}
          />

          <Stack.Screen
            name="NetworkMap"
            component={NetworkMapScreen}
            options={{ title: 'Geo-Network Map' }}
          />

          <Stack.Screen
            name="Events"
            component={EventsScreen}
            options={{ title: 'Event Workspaces' }}
          />

          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Edit Digital Profile' }}
          />

          <Stack.Screen
            name="ShareQR"
            component={ShareQRScreen}
            options={{ title: 'Share & NFC Beam' }}
          />

          <Stack.Screen
            name="MeetingVoice"
            component={MeetingVoiceScreen}
            options={{ title: 'Meeting AI Summarizer' }}
          />

          <Stack.Screen
            name="CommunityFeed"
            component={CommunityFeedScreen}
            options={{ title: 'B2B Community Feed & Leads' }}
          />

          <Stack.Screen
            name="TemplateVault"
            component={TemplateVaultScreen}
            options={{ title: 'WhatsApp Sales Script Vault' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
