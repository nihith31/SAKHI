import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../services/themeContext';
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
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

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
      const response = await fetch(`${API_URL}/api/lab-reports/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned status ${response.status}: ${errorText}`);
      }

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
      case 'normal': return colors.secondary || '#8FAB96';
      case 'mildly_abnormal': return '#F5A623';
      case 'significantly_abnormal': return colors.primary || '#E67E80';
      default: return colors.textLight;
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
          <View style={[styles.analysisStatusBadge, { backgroundColor: hasAnalysis ? colors.secondaryLight : colors.primaryLight }]}>
            <Text style={[styles.analysisStatusText, { color: hasAnalysis ? colors.secondary : colors.primary }]}>
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
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.pendingText}>{t('AnalysisPending', 'AI analysis in progress... Pull to refresh.')}</Text>
              </View>
            )}

            {/* Key Findings */}
            {keyFindings.length > 0 && (
              <View style={styles.findingsSection}>
                <Text style={styles.sectionHeading}>{t('KeyFindings', 'Key Findings')}</Text>
                {keyFindings.map((finding, i) => (
                  <View key={i} style={styles.listRow}>
                    <Text style={[styles.listBullet, { color: colors.primary }]}>•</Text>
                    <Text style={styles.listText}>{finding}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggested Follow-up */}
            {suggestions.length > 0 && (
              <View style={[styles.findingsSection, { backgroundColor: colors.secondaryLight }]}>
                <Text style={[styles.sectionHeading, { color: colors.textDark }]}>{t('SuggestedFollowup', 'Suggested Next Steps')}</Text>
                {suggestions.map((s, i) => (
                  <View key={i} style={styles.listRow}>
                    <Text style={[styles.listBullet, { color: colors.secondary }]}>💡</Text>
                    <Text style={[styles.listText, { color: colors.textMedium }]}>{s}</Text>
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
      <LinearGradient colors={colors.canvasGradient} style={{ flex: 1 }}>
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
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.uploadButtonText}>{t('PickAndUpload', 'Select & Upload Report 📤')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <Text style={styles.sectionTitle}>{t('PastReports', 'Your Reports')}</Text>

        {loadingReports ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMedium,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  uploadCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  uploadDesc: {
    fontSize: 13,
    color: colors.textMedium,
    lineHeight: 18,
    marginBottom: 16,
  },
  supportedFormats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  formatTag: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 15,
  },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  reportCardSelected: {
    borderColor: colors.primary,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  reportCardDate: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  analysisStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  analysisStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  analysisContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  valuesSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  hormoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hormoneNameContainer: {
    flex: 1,
  },
  hormoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  hormoneValue: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  summarySection: {
    marginBottom: 20,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 20,
  },
  pendingText: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 10,
    fontWeight: '500',
  },
  findingsSection: {
    marginBottom: 20,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
  },
  listRow: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingRight: 10,
  },
  listBullet: {
    fontSize: 14,
    marginRight: 8,
  },
  listText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20,
    flex: 1,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  reanalyzeBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reanalyzeBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  disclaimerBanner: {
    backgroundColor: isDark ? '#2D1B1E' : '#FFF2F2',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBannerText: {
    fontSize: 11,
    color: isDark ? '#F5C6C8' : '#422D30',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
});
