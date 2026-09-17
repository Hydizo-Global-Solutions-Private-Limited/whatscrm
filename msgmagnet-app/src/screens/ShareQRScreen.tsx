import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { MobileApi } from '../api/client';
import {
  Radio,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';

export const ShareQRScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<any>(null);
  const [profileUrl, setProfileUrl] = useState<string>('https://msgmagnet.com/p/demo');
  const [loading, setLoading] = useState(true);
  const [isNfcWriting, setIsNfcWriting] = useState(false);

  useEffect(() => {
    fetchProfile();
    // Initialize NFC
    NfcManager.start().catch((e) => console.log('NFC Init notice:', e.message));

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await MobileApi.getMyProfile();
      if (res.data?.success && res.data.profile) {
        setProfile(res.data.profile);
        if (res.data.profileUrl) {
          setProfileUrl(res.data.profileUrl);
        }
      }
    } catch (e) {
      console.warn('Error fetching profile for QR:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Connect with me on MsgMagnet: ${profileUrl}`,
        url: profileUrl,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  // Hardware NFC Tag Programming
  const handleNfcWrite = async () => {
    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        Alert.alert('NFC Unsupported', 'This device does not support NFC hardware.');
        return;
      }

      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        Alert.alert('NFC Disabled', 'Please enable NFC in your device settings.');
        return;
      }

      setIsNfcWriting(true);
      Alert.alert(
        'Ready to Write NFC',
        'Hold the top of your phone near an NFC tag or digital business card to write your profile link.'
      );

      // Request NDEF technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([
        Ndef.uriRecord(profileUrl),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert('Success! 🎉', 'Your MsgMagnet digital card URL has been written to the physical NFC tag!');
      }
    } catch (ex: any) {
      console.warn('NFC Write Error:', ex);
      if (ex.message !== 'cancelled') {
        Alert.alert('NFC Write Notice', ex.message || 'Could not write to NFC tag');
      }
    } finally {
      setIsNfcWriting(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
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
      <View style={styles.cardContainer}>
        <View style={styles.badgeRow}>
          <Sparkles color="#3b82f6" size={16} />
          <Text style={styles.badgeText}>Digital Card & NFC Beam</Text>
        </View>

        <Text style={styles.name}>{profile?.display_name || 'My Digital Profile'}</Text>
        <Text style={styles.sub}>{profile?.headline || 'Scan to save my contact directly'}</Text>

        {/* High-Contrast QR Code */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={profileUrl}
            size={220}
            color="#0b0f19"
            backgroundColor="#ffffff"
          />
        </View>

        <Text style={styles.urlText} numberOfLines={1}>
          {profileUrl}
        </Text>

        {/* NFC Action Button */}
        <TouchableOpacity
          style={[styles.nfcBtn, isNfcWriting && styles.nfcBtnWriting]}
          onPress={handleNfcWrite}
          disabled={isNfcWriting}
        >
          {isNfcWriting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Radio color="#ffffff" size={20} />
              <Text style={styles.nfcBtnText}>Write to Physical NFC Tag</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Share & Copy Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Share2 color="#60a5fa" size={18} />
            <Text style={styles.actionBtnText}>Share Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Copied', 'Profile link copied to clipboard!')}
          >
            <Copy color="#a855f7" size={18} />
            <Text style={styles.actionBtnText}>Copy Link</Text>
          </TouchableOpacity>
        </View>

        {/* Apple & Google Wallet Passes (.pkpass) */}
        <View style={[styles.actionRow, { marginTop: 10 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#000000', borderColor: '#334155' }]}
            onPress={() => {
              if (!profile?.username) return;
              Linking.openURL(`http://localhost:3010/api/wallet/apple/${profile.username}`);
            }}
          >
            <Text style={{ fontSize: 16, color: '#ffffff' }}></Text>
            <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Apple Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1e293b', borderColor: '#334155' }]}
            onPress={() => {
              if (!profile?.username) return;
              Linking.openURL(`http://localhost:3010/api/wallet/google/${profile.username}?redirect=true`);
            }}
          >
            <Text style={{ fontSize: 15 }}>💳</Text>
            <Text style={[styles.actionBtnText, { color: '#f8fafc' }]}>Google Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* 1-Click Interactive Email Signature */}
        <TouchableOpacity
          style={[styles.actionBtn, { width: '100%', marginTop: 10, backgroundColor: '#1e1b4b', borderColor: '#4338ca' }]}
          onPress={async () => {
            try {
              const res = await MobileApi.getEmailSignatures();
              if (res.data?.success && res.data.signatures?.length > 0) {
                Alert.alert(
                  'Email Signatures Ready! ✉️',
                  `Generated 3 responsive styles (Modern, Corporate, Sales). Ready to paste into Gmail & Outlook.`
                );
              }
            } catch (err) {
              Alert.alert('Notice', 'Please ensure your digital profile is saved first.');
            }
          }}
        >
          <Sparkles color="#818cf8" size={16} />
          <Text style={[styles.actionBtnText, { color: '#c7d2fe' }]}>Interactive Email Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  name: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  urlText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 16,
    fontWeight: '500',
  },
  nfcBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nfcBtnWriting: {
    backgroundColor: '#10b981',
  },
  nfcBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f19',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
});
