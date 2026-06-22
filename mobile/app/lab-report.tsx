import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { supabase } from '../services/supabase';
import axios from 'axios';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface LabReport {
  id: string;
  file_url: string;
  report_date: string;
  ai_analysis: string | null;
  extracted_values: any | null;
  language: string;
  created_at: string;
}

export default function LabReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token || ''}`,
    };
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const headers = await getHeaders();
      const res = await axios.get(`${API_URL}/api/lab-reports`, { headers });
      setReports(res.data.reports || []);
    } catch (err) {
      console.log('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        Authorization: `Bearer ${session?.access_token || ''}`,
        'Content-Type': 'multipart/form-data',
      };

      const res = await axios.post(`${API_URL}/api/lab-reports/upload`, formData, { headers });

      Alert.alert(
        t('LabUploadSuccess', 'Uploaded! 🧪'),
        t('LabUploadMessage', 'Your lab report is uploaded. AI analysis is running in the background — check back in a moment.')
      );

      // Poll for analysis after a delay
      setTimeout(() => fetchReports(), 8000);
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert(t('Error', 'Error'), t('LabUploadFailed', 'Failed to upload lab report. Make sure the server is running.'));
    } finally {
      setUploading(false);
    }
  };

  const handleRefreshReport = async (reportId: string) => {
    try {
      const headers = await getHeaders();
      await axios.post(`${API_URL}/api/lab-reports/analyze/${reportId}`, {}, { headers });
      Alert.alert(t('LabReanalyzed', 'Re-analysis Started'), t('LabReanalyzedMsg', 'AI is re-analyzing your report. Pull to refresh in a moment.'));
      setTimeout(() => fetchReports(), 8000);
    } catch (err) {
      console.error('Reanalyze error:', err);
      Alert.alert(t('Error', 'Error'), t('ReanalyzeFailed', 'Failed to re-run analysis.'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return '#8FAB96';
      case 'mildly_abnormal': return '#F5A623';
      case 'significantly_abnormal': return '#E67E80';
      default: return Colors.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return t('Normal', 'Normal ✅');
      case 'mildly_abnormal': return t('MildlyAbnormal', 'Mildly Abnormal ⚠️');
      case 'significantly_abnormal': return t('SignificantlyAbnormal', 'Abnormal 🚨');
      default: return status;
    }
  };

  const renderReportCard = (report: LabReport) => {
    const isSelected = selectedReport?.id === report.id;
    const hasAnalysis = !!report.ai_analysis;
    const extractedValues = report.extracted_values?.extracted_values || {};
    const keyFindings: string[] = report.extracted_values?.key_findings || [];
    const suggestions: string[] = report.extracted_values?.suggested_followup || [];

    return (
      <TouchableOpacity
        key={report.id}
        style={[styles.reportCard, isSelected && styles.reportCardSelected]}
        onPress={() => setSelectedReport(isSelected ? null : report)}
        activeOpacity={0.8}
      >
        {/* Header Row */}
        <View style={styles.reportCardHeader}>
          <View style={styles.reportCardIcon}>
            <Text style={styles.reportIconText}>🧪</Text>
          </View>
          <View style={styles.reportCardMeta}>
            <Text style={styles.reportCardTitle} numberOfLines={1}>
              {t('LabReport', 'Lab Report')} — {report.report_date}
            </Text>
            <Text style={styles.reportCardDate}>
              {t('UploadedOn', 'Uploaded')} {new Date(report.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.analysisStatusBadge, { backgroundColor: hasAnalysis ? Colors.secondaryLight : Colors.primaryLight }]}>
            <Text style={[styles.analysisStatusText, { color: hasAnalysis ? Colors.secondary : Colors.primary }]}>
              {hasAnalysis ? t('Analyzed', 'Analyzed') : t('Pending', 'Pending...')}
            </Text>
          </View>
        </View>

        {/* Expanded Analysis View */}
        {isSelected && (
          <View style={styles.analysisContainer}>
            {/* Hormone Values Table */}
            {Object.keys(extractedValues).length > 0 && (
              <View style={styles.valuesSection}>
                <Text style={styles.sectionHeading}>{t('HormoneValues', 'Extracted Hormone Values')}</Text>
                {Object.entries(extractedValues).map(([hormone, info]: [string, any]) => (
                  <View key={hormone} style={styles.hormoneRow}>
                    <View style={styles.hormoneNameContainer}>
                      <Text style={styles.hormoneName}>{hormone}</Text>
                      <Text style={styles.hormoneValue}>{info.value} {info.unit}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(info.status) + '22' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(info.status) }]}>
                        {getStatusLabel(info.status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* AI Summary */}
            {report.ai_analysis ? (
              <View style={styles.summarySection}>
                <Text style={styles.sectionHeading}>{t('AISummary', 'Sakhi AI Summary')}</Text>
                <Text style={styles.summaryText}>{report.ai_analysis}</Text>
              </View>
            ) : (
              <View style={styles.pendingContainer}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.pendingText}>{t('AnalysisPending', 'AI analysis in progress... Pull to refresh.')}</Text>
              </View>
            )}

            {/* Key Findings */}
            {keyFindings.length > 0 && (
              <View style={styles.findingsSection}>
                <Text style={styles.sectionHeading}>{t('KeyFindings', 'Key Findings')}</Text>
                {keyFindings.map((finding, i) => (
                  <View key={i} style={styles.listRow}>
                    <Text style={[styles.listBullet, { color: Colors.primary }]}>•</Text>
                    <Text style={styles.listText}>{finding}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggested Follow-up */}
            {suggestions.length > 0 && (
              <View style={[styles.findingsSection, { backgroundColor: Colors.secondaryLight }]}>
                <Text style={[styles.sectionHeading, { color: Colors.textDark }]}>{t('SuggestedFollowup', 'Suggested Next Steps')}</Text>
                {suggestions.map((s, i) => (
                  <View key={i} style={styles.listRow}>
                    <Text style={[styles.listBullet, { color: Colors.secondary }]}>💡</Text>
                    <Text style={[styles.listText, { color: Colors.textMedium }]}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              {t('LabDisclaimer', '⚠️ This is an AI-assisted interpretation for informational purposes only and is NOT a medical diagnosis. Please consult your doctor for professional advice.')}
            </Text>

            {/* Re-analyze button */}
            <TouchableOpacity
              style={styles.reanalyzeBtn}
              onPress={() => handleRefreshReport(report.id)}
            >
              <Text style={styles.reanalyzeBtnText}>{t('Reanalyze', 'Re-analyze with AI 🔄')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.canvasGradient as any} style={{ flex: 1 }}>
        {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← {t('Back', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('LabReportsTitle', 'Lab Reports 🧪')}</Text>
        <Text style={styles.subtitle}>{t('LabReportsSubtitle', 'Upload and AI-analyze your PCOS blood reports')}</Text>
      </View>

      {/* Persistent Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerBannerText}>
          ⚠️ {t('persistent_disclaimer_medical')}
        </Text>
      </View>


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={fetchReports}
      >
        {/* Upload Card */}
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>{t('UploadReport', 'Upload a Lab Report')}</Text>
          <Text style={styles.uploadDesc}>
            {t('UploadDesc', 'Upload your blood test PDF or photo. Sakhi AI will extract hormone values and explain what they mean for your PCOS journey.')}
          </Text>
          <View style={styles.supportedFormats}>
            <Text style={styles.formatTag}>PDF</Text>
            <Text style={styles.formatTag}>JPG</Text>
            <Text style={styles.formatTag}>PNG</Text>
          </View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickAndUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.uploadButtonText}>{t('PickAndUpload', 'Select & Upload Report 📤')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <Text style={styles.sectionTitle}>{t('PastReports', 'Your Reports')}</Text>

        {loadingReports ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('NoReports', 'No lab reports uploaded yet.\nUpload your first report above! 🌟')}</Text>
          </View>
        ) : (
          reports.map((report) => renderReportCard(report))
        )}
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  backBtn: {
    marginBottom: 10,
  },
  backBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMedium,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  uploadCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 8,
  },
  uploadDesc: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
    marginBottom: 14,
  },
  supportedFormats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  formatTag: {
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
    marginRight: 8,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 15,
  },
  reportCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  reportCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportIconText: {
    fontSize: 20,
  },
  reportCardMeta: {
    flex: 1,
  },
  reportCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  reportCardDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  analysisStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  analysisStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  analysisContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: 16,
  },
  valuesSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 10,
  },
  hormoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  hormoneNameContainer: {
    flex: 1,
  },
  hormoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  hormoneValue: {
    fontSize: 13,
    color: Colors.textMedium,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  summarySection: {
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 22,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    marginBottom: 14,
  },
  pendingText: {
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
    marginLeft: 10,
  },
  findingsSection: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: Colors.background,
  },
  listRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  listBullet: {
    fontSize: 16,
    marginRight: 10,
    lineHeight: 22,
  },
  listText: {
    fontSize: 14,
    color: Colors.textDark,
    flex: 1,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  reanalyzeBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reanalyzeBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  disclaimerBanner: {
    backgroundColor: '#FFF2F2',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBannerText: {
    fontSize: 11,
    color: '#422D30',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
});

