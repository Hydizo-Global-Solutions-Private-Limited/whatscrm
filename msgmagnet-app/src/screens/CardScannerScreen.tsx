import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { MobileApi } from '../api/client';
import { enqueueAction } from '../database/offlineDb';
import {
  Zap,
  RotateCcw,
  Layers,
  Check,
  X,
  Phone,
  Mail,
  Briefcase,
  Building,
  User,
  Sparkles,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = CARD_WIDTH * 0.62; // ~3.5:2 standard card aspect ratio

export const CardScannerScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<boolean>(false);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchCount, setBatchCount] = useState<number>(0);
  const [batchImages, setBatchImages] = useState<string[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStatusText, setScanStatusText] = useState<string>('Analyzing business card...');

  // Review Modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [lastContactId, setLastContactId] = useState<number | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const [parsedLead, setParsedLead] = useState<any>({
    name: '',
    mobile: '',
    email: '',
    company: '',
    job_title: '',
    notes: '',
    lead_temperature: 'warm',
    pipeline_stage: 'new_scanned',
  });

  const cameraRef = useRef<any>(null);
  const { activeEventId, isOffline } = useApp();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.permissionText}>Camera permission is required to scan business cards.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (scanning) return;

    try {
      setScanning(true);
      setScanStatusText('Capturing high-res card photo...');
      console.log('[CardScanner] Initiating photo capture...');

      if (!cameraRef.current) {
        Alert.alert('Camera Error', 'Camera lens initializing. Please try again in 1 second.');
        setScanning(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.75,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        Alert.alert('Scan Failed', 'Could not capture image data from camera sensor.');
        setScanning(false);
        return;
      }

      console.log('[CardScanner] Photo captured, length:', photo.base64.length);

      if (isBatchMode) {
        const newBatch = [...batchImages, photo.base64];
        setBatchImages(newBatch);
        setBatchCount(newBatch.length);
        setScanning(false);

        if (newBatch.length >= 10) {
          Alert.alert('Batch Limit Reached', '10 cards captured. Processing batch now...');
          processBatch(newBatch);
        }
      } else {
        // Single Scan Mode
        if (isOffline) {
          await enqueueAction('scan', { image: photo.base64, event_id: activeEventId });
          Alert.alert('Saved Offline', 'Card saved to offline queue. It will be analyzed via Gemini when connected.');
          setScanning(false);
          navigation.goBack();
          return;
        }

        // Online: call backend Vision & OCR engine
        setScanStatusText('⚡ AI Vision OCR extracting contact fields...');
        console.log('[CardScanner] Uploading card to backend...');
        const res = await MobileApi.scanCardImage(photo.base64, activeEventId);
        console.log('[CardScanner] Backend response received:', res.data?.success);

        if (res.data?.success) {
          const lead = res.data.contact || res.data.parsed || {};
          const contactId = res.data.contactId || lead.id || null;
          setLastContactId(contactId);

          setParsedLead({
            name: lead.name || 'Scanned Lead',
            mobile: lead.mobile || '',
            email: lead.email || '',
            company: lead.company || '',
            job_title: lead.job_title || '',
            notes: lead.notes || '',
            lead_temperature: lead.lead_temperature || 'warm',
            pipeline_stage: lead.pipeline_stage || 'new',
          });
          setReviewModalVisible(true);
        } else {
          Alert.alert('AI Processing Error', res.data?.msg || 'Could not parse business card');
        }
        setScanning(false);
      }
    } catch (err: any) {
      console.error('[CardScanner] Capture error:', err);
      Alert.alert('Capture Error', err.message || 'Error snapping business card. Ensure good lighting.');
      setScanning(false);
    }
  };

  // Demo Card test scan (1-tap instant test without paper card)
  const handleDemoScan = async () => {
    if (scanning) return;
    try {
      setScanning(true);
      setScanStatusText('⚡ AI Vision analyzing executive demo card...');

      // 1x1 transparent/dummy base64 pixel to trigger the backend OCR & fallback
      const demoCardBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const res = await MobileApi.scanCardImage(demoCardBase64, activeEventId);
      if (res.data?.success) {
        const lead = res.data.contact || res.data.parsed || {};
        const contactId = res.data.contactId || lead.id || null;
        setLastContactId(contactId);

        setParsedLead({
          name: lead.name !== 'Scanned Contact' ? lead.name : 'Vikram Malhotra',
          mobile: lead.mobile || '+91 98765 43210',
          email: lead.email || 'vikram.m@zenithlogistics.com',
          company: lead.company || 'Zenith Retail Logistics',
          job_title: lead.job_title || 'Procurement & Supply Director',
          notes: 'Captured via AI Card Scanner',
          lead_temperature: 'hot',
          pipeline_stage: 'new',
        });
        setReviewModalVisible(true);
      } else {
        Alert.alert('Error', res.data?.msg || 'Could not process demo card');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Demo scan failed');
    } finally {
      setScanning(false);
    }
  };

  const processBatch = async (imagesToProcess = batchImages) => {
    if (imagesToProcess.length === 0) return;
    try {
      setScanning(true);
      setScanStatusText(`Processing ${imagesToProcess.length} cards via AI Batch Engine...`);
      const res = await MobileApi.batchScan(imagesToProcess, activeEventId);
      if (res.data?.success) {
        Alert.alert(
          'Batch Complete',
          `Successfully processed ${res.data.results?.length || imagesToProcess.length} business cards into CRM!`
        );
        setBatchImages([]);
        setBatchCount(0);
        navigation.navigate('CardsList');
      } else {
        Alert.alert('Batch Failed', res.data?.msg || 'Error processing batch');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Batch scan processing failed');
    } finally {
      setScanning(false);
    }
  };

  const saveConfirmedLead = async () => {
    try {
      setSavingLead(true);
      if (lastContactId) {
        await MobileApi.updateContact(lastContactId, parsedLead);
      }
      setReviewModalVisible(false);
      Alert.alert('Contact Saved', `${parsedLead.name || 'Lead'} has been added to your CRM!`);
      navigation.navigate('CardsList');
    } catch (err: any) {
      console.warn('[CardScanner] Update lead warning:', err.message);
      setReviewModalVisible(false);
      navigation.navigate('CardsList');
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Camera View when screen is focused */}
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          enableTorch={flash}
        />
      )}

      {/* Sibling Overlay for 100% Reliable Android Touch Dispatch */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top Control Bar */}
        <View style={styles.topControlBar}>
          <TouchableOpacity
            style={[styles.controlBtn, flash && styles.controlBtnActive]}
            onPress={() => setFlash(!flash)}
            activeOpacity={0.7}
          >
            <Zap color={flash ? '#fbbf24' : '#ffffff'} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modePill, isBatchMode && styles.modePillActive]}
            onPress={() => {
              setIsBatchMode(!isBatchMode);
              setBatchImages([]);
              setBatchCount(0);
            }}
            activeOpacity={0.7}
          >
            <Layers color={isBatchMode ? '#ffffff' : '#94a3b8'} size={16} />
            <Text style={[styles.modeText, isBatchMode && styles.modeTextActive]}>
              {isBatchMode ? `Batch Mode (${batchCount})` : 'Single Scan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            activeOpacity={0.7}
          >
            <RotateCcw color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Viewfinder Target */}
        <View style={styles.viewfinderContainer} pointerEvents="none">
          <View style={styles.cardBoundingBox}>
            {/* Corner Guides */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {scanning ? (
              <View style={styles.scanningPulseBox}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.scanningPulseText}>{scanStatusText}</Text>
              </View>
            ) : (
              <View style={styles.guideCenter}>
                <Text style={styles.guideText}>Align business card within frame</Text>
                <Text style={styles.guideSubText}>⚡ Auto AI edge detection & OCR</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomControlBar}>
          {/* Left Action: Demo Card / Batch Done */}
          {isBatchMode && batchCount > 0 ? (
            <TouchableOpacity style={styles.batchFinishBtn} onPress={() => processBatch()} activeOpacity={0.7}>
              <Check color="#ffffff" size={20} />
              <Text style={styles.batchFinishText}>Done ({batchCount})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.demoBtn} onPress={handleDemoScan} activeOpacity={0.7}>
              <Sparkles color="#60a5fa" size={16} />
              <Text style={styles.demoBtnText}>Demo</Text>
            </TouchableOpacity>
          )}

          {/* Shutter Button */}
          <TouchableOpacity
            style={[styles.shutterOuter, scanning && styles.shutterDisabled]}
            onPress={handleCapture}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator color="#2563eb" size="large" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>

          {/* Close / Back Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <X color="#ffffff" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Review & Edit Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Card Parsed Successfully</Text>
                <Text style={styles.modalSubTitle}>Review and edit details before saving</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Full Name</Text>
                <View style={styles.modalInputRow}>
                  <User color="#60a5fa" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.name}
                    placeholder="Contact Name"
                    placeholderTextColor="#64748b"
                    onChangeText={(t) => setParsedLead({ ...parsedLead, name: t })}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Mobile / WhatsApp Number</Text>
                <View style={styles.modalInputRow}>
                  <Phone color="#4ade80" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.mobile}
                    placeholder="+1 555 123 4567"
                    placeholderTextColor="#64748b"
                    onChangeText={(t) => setParsedLead({ ...parsedLead, mobile: t })}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Email Address</Text>
                <View style={styles.modalInputRow}>
                  <Mail color="#a855f7" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.email}
                    placeholder="contact@company.com"
                    placeholderTextColor="#64748b"
                    onChangeText={(t) => setParsedLead({ ...parsedLead, email: t })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Company Name</Text>
                <View style={styles.modalInputRow}>
                  <Building color="#f59e0b" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.company}
                    placeholder="Company or Organization"
                    placeholderTextColor="#64748b"
                    onChangeText={(t) => setParsedLead({ ...parsedLead, company: t })}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Designation / Job Title</Text>
                <View style={styles.modalInputRow}>
                  <Briefcase color="#38bdf8" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.job_title}
                    placeholder="Director, Founder, Manager..."
                    placeholderTextColor="#64748b"
                    onChangeText={(t) => setParsedLead({ ...parsedLead, job_title: t })}
                  />
                </View>
              </View>

              {/* Temperature Selector */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Lead Priority Warmth</Text>
                <View style={styles.tempSelector}>
                  {(['hot', 'warm', 'cold'] as const).map((temp) => (
                    <TouchableOpacity
                      key={temp}
                      style={[
                        styles.tempBtn,
                        parsedLead.lead_temperature === temp && styles.tempBtnActive,
                      ]}
                      onPress={() => setParsedLead({ ...parsedLead, lead_temperature: temp })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tempBtnText,
                          parsedLead.lead_temperature === temp && styles.tempBtnTextActive,
                        ]}
                      >
                        {temp.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveLeadBtn}
              onPress={saveConfirmedLead}
              disabled={savingLead}
              activeOpacity={0.8}
            >
              {savingLead ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveLeadBtnText}>Confirm & Add to CRM</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1.5,
    borderColor: '#fbbf24',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modePillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  modeText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBoundingBox: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#38bdf8',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  guideCenter: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  guideText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  guideSubText: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanningPulseBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  scanningPulseText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffffff',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  demoBtnText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
  },
  batchFinishBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  batchFinishText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    color: '#ffffff',
    height: 44,
    fontSize: 14,
  },
  tempSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  tempBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0b0f19',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  tempBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  tempBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  tempBtnTextActive: {
    color: '#ffffff',
  },
  saveLeadBtn: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveLeadBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
