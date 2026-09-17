import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 0.6; // ~3.5:2 aspect ratio

export const CardScannerScreen = ({ navigation }: any) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<boolean>(false);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchCount, setBatchCount] = useState<number>(0);
  const [batchImages, setBatchImages] = useState<string[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);

  // Review Modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
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
    if (!cameraRef.current || scanning) return;

    try {
      setScanning(true);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo.base64) {
        Alert.alert('Scan Failed', 'Could not capture image data');
        setScanning(false);
        return;
      }

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

        // Online: call Gemini Vision OCR
        const res = await MobileApi.scanCardImage(photo.base64, activeEventId);
        if (res.data?.success) {
          const lead = res.data.contact || res.data.parsed || {};
          setParsedLead({
            name: lead.name || '',
            mobile: lead.mobile || '',
            email: lead.email || '',
            company: lead.company || '',
            job_title: lead.job_title || '',
            notes: lead.notes || '',
            lead_temperature: lead.lead_temperature || 'warm',
            pipeline_stage: lead.pipeline_stage || 'new_scanned',
          });
          setReviewModalVisible(true);
        } else {
          Alert.alert('AI Processing Error', res.data?.msg || 'Could not parse business card');
        }
        setScanning(false);
      }
    } catch (err: any) {
      console.error('Capture error:', err);
      Alert.alert('Capture Error', err.message || 'Error snapping business card');
      setScanning(false);
    }
  };

  const processBatch = async (imagesToProcess = batchImages) => {
    if (imagesToProcess.length === 0) return;
    try {
      setScanning(true);
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

  const saveConfirmedLead = () => {
    setReviewModalVisible(false);
    Alert.alert('Contact Saved', `${parsedLead.name || 'Lead'} has been added to your CRM!`);
    navigation.navigate('CardsList');
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={flash}
      >
        {/* Darkened Mask with Card Aspect Ratio Viewfinder */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topControlBar}>
            <TouchableOpacity
              style={[styles.controlBtn, flash && styles.controlBtnActive]}
              onPress={() => setFlash(!flash)}
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
            >
              <Layers color={isBatchMode ? '#ffffff' : '#94a3b8'} size={16} />
              <Text style={[styles.modeText, isBatchMode && styles.modeTextActive]}>
                {isBatchMode ? `Batch Mode (${batchCount})` : 'Single Scan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <RotateCcw color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>

          {/* Viewfinder Target */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.cardBoundingBox}>
              {/* Corner Guides */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <View style={styles.guideCenter}>
                <Text style={styles.guideText}>Align business card within frame</Text>
                <Text style={styles.guideSubText}>Gemini AI Vision edge auto-detection</Text>
              </View>
            </View>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomControlBar}>
            {isBatchMode && batchCount > 0 ? (
              <TouchableOpacity style={styles.batchFinishBtn} onPress={() => processBatch()}>
                <Check color="#ffffff" size={20} />
                <Text style={styles.batchFinishText}>Done ({batchCount})</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}

            {/* Shutter Button */}
            <TouchableOpacity
              style={[styles.shutterOuter, scanning && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color="#2563eb" size="large" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <X color="#ffffff" size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {/* Review & Edit Modal */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Card Parsed Successfully</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Full Name</Text>
                <View style={styles.modalInputRow}>
                  <User color="#60a5fa" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.name}
                    onChangeText={(t) => setParsedLead({ ...parsedLead, name: t })}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Mobile / WhatsApp</Text>
                <View style={styles.modalInputRow}>
                  <Phone color="#4ade80" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.mobile}
                    onChangeText={(t) => setParsedLead({ ...parsedLead, mobile: t })}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Email</Text>
                <View style={styles.modalInputRow}>
                  <Mail color="#a855f7" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.email}
                    onChangeText={(t) => setParsedLead({ ...parsedLead, email: t })}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Company</Text>
                <View style={styles.modalInputRow}>
                  <Building color="#f59e0b" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.company}
                    onChangeText={(t) => setParsedLead({ ...parsedLead, company: t })}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Job Title</Text>
                <View style={styles.modalInputRow}>
                  <Briefcase color="#38bdf8" size={18} />
                  <TextInput
                    style={styles.modalInput}
                    value={parsedLead.job_title}
                    onChangeText={(t) => setParsedLead({ ...parsedLead, job_title: t })}
                  />
                </View>
              </View>

              {/* Temperature Selector */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Lead Warmth</Text>
                <View style={styles.tempSelector}>
                  {(['hot', 'warm', 'cold'] as const).map((temp) => (
                    <TouchableOpacity
                      key={temp}
                      style={[
                        styles.tempBtn,
                        parsedLead.lead_temperature === temp && styles.tempBtnActive,
                      ]}
                      onPress={() => setParsedLead({ ...parsedLead, lead_temperature: temp })}
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

            <TouchableOpacity style={styles.saveLeadBtn} onPress={saveConfirmedLead}>
              <Text style={styles.saveLeadBtnText}>Confirm & Add to CRM</Text>
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
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3b82f6',
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
  },
  guideText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  guideSubText: {
    color: '#93c5fd',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  bottomControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
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
