import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { MobileApi } from '../api/client';
import { MessageCircle, MapPin, Flame, Zap, Snowflake } from 'lucide-react-native';

const GOOGLE_MAPS_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b0f19' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
];

const { width, height } = Dimensions.get('window');

export const NetworkMapScreen = ({ navigation }: any) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    fetchContactsWithLocation();
  }, []);

  const fetchContactsWithLocation = async () => {
    try {
      const res = await MobileApi.getContacts();
      if (res.data?.success) {
        const list = (res.data.contacts || []).map((c: any, index: number) => {
          // Provide mock coordinate offset around city center if no lat/lng recorded
          const defaultLat = 28.6139 + (index % 5 - 2) * 0.015;
          const defaultLng = 77.209 + (Math.floor(index / 5) - 2) * 0.015;
          return {
            ...c,
            lat: c.lat ? parseFloat(c.lat) : defaultLat,
            lng: c.lng ? parseFloat(c.lng) : defaultLng,
          };
        });

        setContacts(list);
        if (list.length > 0 && list[0].lat && list[0].lng) {
          setRegion({
            latitude: list[0].lat,
            longitude: list[0].lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching map contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hi ${name || ''}, connecting via MsgMagnet Network Map!`);
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${text}`).catch(() =>
      Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`)
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        customMapStyle={GOOGLE_MAPS_DARK_STYLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        userInterfaceStyle="dark"
      >
        {contacts.map((c) => {
          const pinColor =
            c.lead_temperature === 'hot'
              ? '#ef4444'
              : c.lead_temperature === 'warm'
              ? '#f59e0b'
              : '#3b82f6';

          return (
            <Marker
              key={c.id}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              pinColor={pinColor}
            >
              <Callout
                style={styles.callout}
                onPress={() => openWhatsApp(c.mobile, c.name)}
              >
                <View style={styles.calloutContent}>
                  <Text style={styles.calloutTitle}>{c.name || 'Lead'}</Text>
                  <Text style={styles.calloutSub}>
                    {c.company ? `${c.company} • ` : ''}{c.job_title || ''}
                  </Text>
                  <View style={styles.calloutAction}>
                    <Text style={styles.calloutBtnText}>Tap to Message WhatsApp</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Map Legend Overlay */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Hot</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Warm</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Cold</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  callout: {
    width: 200,
    padding: 6,
  },
  calloutContent: {
    alignItems: 'center',
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 2,
  },
  calloutSub: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 6,
  },
  calloutAction: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  calloutBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#334155',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
});
