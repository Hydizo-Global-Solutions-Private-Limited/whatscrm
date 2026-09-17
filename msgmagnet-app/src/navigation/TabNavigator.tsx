import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CardScannerScreen } from '../screens/CardScannerScreen';
import { LeadsPipelineScreen } from '../screens/LeadsPipelineScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import {
  LayoutDashboard,
  Camera,
  Kanban,
  CheckSquare,
  Settings,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0b0f19',
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          color: '#ffffff',
          fontWeight: '800',
          fontSize: 18,
        },
        headerTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#0b0f19',
          borderTopWidth: 1,
          borderTopColor: '#1e293b',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'MsgMagnet',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Scanner"
        component={CardScannerScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Scan Card',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Pipeline"
        component={LeadsPipelineScreen}
        options={{
          title: 'Leads Pipeline',
          tabBarLabel: 'Pipeline',
          tabBarIcon: ({ color, size }) => <Kanban color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Voice & CRM Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Workspace Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
