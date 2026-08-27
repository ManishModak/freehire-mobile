import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSymbol } from '@/components/AppSymbol';
import { ApplicationStagePicker } from '@/components/ApplicationStagePicker';
import { CompanyLogo } from '@/components/CompanyLogo';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { getColors, Radius, Space } from '@/constants/freehire';
import { formatDate, timeAgo } from '@/lib/format';
import {
  canMarkApplied,
  formatSilence,
  groupOf,
  isPrunedJob,
  stageLabel,
  type TrackerStage,
} from '@/lib/tracker';
import type { TrackedJob } from '@/lib/types';
import { useTrackedJobs, useTrackerMutations } from '@/lib/useTracker';

function BackButton({ color }: { color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}>
      <AppSymbol name="chevron.left" size={22} weight="semibold" tintColor={color} />
    </Pressable>
  );
}

export default function TrackerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = getColors(useColorScheme());

  // Resolve board query - never send an orphan ID to GET /me/tracking/:slug
  const { data, isLoading } = useTrackedJobs('board');
  const {
    markApplied,
    updateStage,
    updateNotes,
    moveToSaved,
    removeFromTracker,
    isMarkingApplied,
    isUpdatingStage,
    isUpdatingNotes,
    isMovingToSaved,
    isRemoving,
  } = useTrackerMutations();

  const application: TrackedJob | undefined = useMemo(() => {
    if (!id || !data?.data) return undefined;
    return data.data.find((j) => j.id === id || j.job?.public_slug === id);
  }, [id, data]);

  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string | null;
    confirmVariant?: 'primary' | 'danger' | 'default';
    onConfirm: () => void;
  } | null>(null);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.brand} />
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView edges={['top']} style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        <AppSymbol name="exclamationmark.circle" size={36} tintColor={c.mutedForeground} />
        <Text style={[styles.stateTitle, { color: c.foreground }]}>Application not found</Text>
        <Text style={[styles.stateBody, { color: c.mutedForeground }]}>
          This application may have been removed or is unavailable.
        </Text>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
          accessibilityRole="button"
          accessibilityLabel="Go back to applications"
          style={[styles.primaryButton, { backgroundColor: c.brand, marginTop: Space.md }]}>
          <Text style={[styles.primaryButtonText, { color: c.brandForeground }]}>Back to Tracker</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentApp = application;
  const pruned = isPrunedJob(currentApp);
  const companyName = currentApp.job?.company || currentApp.company_slug || 'Unknown company';
  const roleTitle = currentApp.role_title || currentApp.job?.title || 'Unknown role';
  const group = groupOf(currentApp);
  const currentStage = currentApp.stage;
  const currentStageLabel = currentStage ? stageLabel(currentStage) : group === 'saved' ? 'Saved' : 'Applied';
  const isSavedGroup = group === 'saved';
  const eligibleForApply = canMarkApplied(currentApp);
  const currentNotes = currentApp.notes ?? '';
  const activeNotes = notesDraft !== null ? notesDraft : currentNotes;
  const isNotesDirty = notesDraft !== null && notesDraft !== currentNotes;

  const silenceText = formatSilence(currentApp.days_silent, currentApp.silence_state);
  const appliedDate = formatDate(currentApp.applied_at);
  const followedUpAgo = currentApp.followed_up_at ? timeAgo(currentApp.followed_up_at) : null;
  const cvOpenedAgo = currentApp.cv_opened_at ? timeAgo(currentApp.cv_opened_at) : null;

  function handleMarkAppliedToday() {
    if (!currentApp.job?.public_slug) return;
    setConfirmModal({
      visible: true,
      title: 'Mark as applied today?',
      message: 'This will record today as your application date and move this job to Applied.',
      confirmText: 'Confirm Applied',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await markApplied(currentApp.job!.public_slug, currentApp.id);
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: err?.message ?? 'Failed to mark as applied',
            confirmText: 'OK',
            cancelText: null,
            confirmVariant: 'default',
            onConfirm: () => setConfirmModal(null),
          });
        }
      },
    });
  }

  function handleSetPreparing() {
    updateStage(currentApp.id, 'preparing').catch((err) => {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: err?.message ?? 'Failed to set stage to Preparing',
        confirmText: 'OK',
        cancelText: null,
        confirmVariant: 'default',
        onConfirm: () => setConfirmModal(null),
      });
    });
  }

  function handleSelectStage(stage: TrackerStage) {
    updateStage(currentApp.id, stage, currentApp.notes).catch((err) => {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: err?.message ?? 'Failed to update stage',
        confirmText: 'OK',
        cancelText: null,
        confirmVariant: 'default',
        onConfirm: () => setConfirmModal(null),
      });
    });
  }

  async function handleSaveNotes() {
    try {
      await updateNotes(currentApp.id, activeNotes);
      setNotesDraft(null);
    } catch (err: any) {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: err?.message ?? 'Failed to save notes',
        confirmText: 'OK',
        cancelText: null,
        confirmVariant: 'default',
        onConfirm: () => setConfirmModal(null),
      });
    }
  }

  function handleMoveToSaved() {
    if (pruned || !currentApp.job?.public_slug) return;
    setConfirmModal({
      visible: true,
      title: 'Move to Saved?',
      message: 'This will clear application progress and keep the job in your Saved list.',
      confirmText: 'Move to Saved',
      confirmVariant: 'default',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await moveToSaved(currentApp.job!.public_slug, currentApp.id);
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            title: 'Notice',
            message: err?.message ?? 'Failed to move to Saved',
            confirmText: 'OK',
            cancelText: null,
            confirmVariant: 'default',
            onConfirm: () => setConfirmModal(null),
          });
        }
      },
    });
  }

  function handleRemove() {
    setConfirmModal({
      visible: true,
      title: 'Remove from Tracker?',
      message: 'This will remove the application from your tracking board. Your view history is preserved.',
      confirmText: 'Remove',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await removeFromTracker(currentApp.id);
          if (router.canGoBack()) router.back();
          else router.replace('/' as any);
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: err?.message ?? 'Failed to remove application',
            confirmText: 'OK',
            cancelText: null,
            confirmVariant: 'default',
            onConfirm: () => setConfirmModal(null),
          });
        }
      },
    });
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <BackButton color={c.brandStrong} />
          <View style={styles.headerInfo}>
            <Text numberOfLines={1} style={[styles.headerRole, { color: c.foreground }]}>
              {roleTitle}
            </Text>
            <Text numberOfLines={1} style={[styles.headerCompany, { color: c.mutedForeground }]}>
              {companyName}
              {pruned ? ' · Posting closed' : ''}
            </Text>
          </View>
          {currentApp.job?.public_slug && !pruned ? (
            <Pressable
              onPress={() => router.push(`/jobs/${currentApp.job!.public_slug}`)}
              accessibilityRole="button"
              accessibilityLabel="View original job posting"
              style={[styles.viewJobBtn, { backgroundColor: c.muted }]}>
              <Text style={[styles.viewJobText, { color: c.brandStrong }]}>View Job</Text>
              <AppSymbol name="arrow.up.right" size={13} tintColor={c.brandStrong} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Company Card Header */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.companyRow}>
              <CompanyLogo name={companyName} size={44} />
              <View style={styles.companyMeta}>
                <Text style={[styles.roleTitle, { color: c.foreground }]}>{roleTitle}</Text>
                <Text style={[styles.companySubtitle, { color: c.mutedForeground }]}>{companyName}</Text>
              </View>
            </View>
          </View>

          {/* Lifecycle & Stage Management Card */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.stageHeaderRow}>
              <View>
                <Text style={[styles.cardSectionLabel, { color: c.mutedForeground }]}>Current stage</Text>
                <Text style={[styles.stageValue, { color: c.foreground }]}>{currentStageLabel}</Text>
                {appliedDate ? (
                  <Text style={[styles.appliedDateText, { color: c.mutedForeground }]}>
                    Applied {appliedDate}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => setIsPickerVisible(true)}
                disabled={isUpdatingStage}
                accessibilityRole="button"
                accessibilityLabel="Change application stage"
                style={({ pressed }) => [
                  styles.changeStageButton,
                  { backgroundColor: c.muted, borderColor: c.border },
                  pressed && { opacity: 0.7 },
                ]}>
                <Text style={[styles.changeStageText, { color: c.brandStrong }]}>Change stage</Text>
                <AppSymbol name="chevron.down" size={14} tintColor={c.brandStrong} />
              </Pressable>
            </View>

            {/* If Saved or eligible to mark applied, show explicit quick actions */}
            {eligibleForApply ? (
              <View style={[styles.quickActionsBox, { backgroundColor: c.muted, borderColor: c.border }]}>
                <Text style={[styles.quickActionsTitle, { color: c.foreground }]}>
                  Ready to update?
                </Text>
                <Text style={[styles.quickActionsBody, { color: c.mutedForeground }]}>
                  Mark this application applied only after you submitted your application.
                </Text>

                <View style={styles.applyActionButtons}>
                  <Pressable
                    onPress={handleMarkAppliedToday}
                    disabled={isMarkingApplied}
                    accessibilityRole="button"
                    accessibilityLabel="Mark as applied today"
                    style={({ pressed }) => [
                      styles.markAppliedBtn,
                      { backgroundColor: c.brand },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <Text style={[styles.markAppliedText, { color: c.brandForeground }]}>
                      {isMarkingApplied ? 'Marking...' : 'Mark as applied today'}
                    </Text>
                  </Pressable>

                  {isSavedGroup ? (
                    <Pressable
                      onPress={handleSetPreparing}
                      disabled={isUpdatingStage}
                      accessibilityRole="button"
                      accessibilityLabel="Set stage to preparing"
                      style={({ pressed }) => [
                        styles.setPreparingBtn,
                        { borderColor: c.border },
                        pressed && { opacity: 0.7 },
                      ]}>
                      <Text style={[styles.setPreparingText, { color: c.foreground }]}>
                        Or set Preparing
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          {/* Notes Card */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.notesHeader}>
              <Text style={[styles.cardSectionLabel, { color: c.mutedForeground }]}>Notes</Text>
              {isNotesDirty ? (
                <Pressable
                  onPress={handleSaveNotes}
                  disabled={isUpdatingNotes}
                  accessibilityRole="button"
                  accessibilityLabel="Save notes"
                  style={[styles.saveNotesBtn, { backgroundColor: c.brand }]}>
                  <Text style={[styles.saveNotesBtnText, { color: c.brandForeground }]}>
                    {isUpdatingNotes ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <TextInput
              value={activeNotes}
              onChangeText={setNotesDraft}
              placeholder="Add interview dates, contacts, or referral details…"
              placeholderTextColor={c.mutedForeground}
              multiline
              numberOfLines={4}
              style={[
                styles.notesInput,
                { color: c.foreground, borderColor: c.border, backgroundColor: c.muted },
              ]}
            />
          </View>

          {/* Signals & History Card */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardSectionLabel, { color: c.mutedForeground }]}>Signals & Activity</Text>

            <View style={styles.signalsList}>
              {silenceText ? (
                <View style={styles.signalItem}>
                  <AppSymbol name="clock" size={16} tintColor="#ffbd66" />
                  <View style={styles.signalItemText}>
                    <Text style={[styles.signalItemTitle, { color: c.foreground }]}>Silence status</Text>
                    <Text style={[styles.signalItemSub, { color: '#ffbd66' }]}>{silenceText}</Text>
                  </View>
                </View>
              ) : null}

              {cvOpenedAgo ? (
                <View style={styles.signalItem}>
                  <AppSymbol name="doc.text" size={16} tintColor={c.brandStrong} />
                  <View style={styles.signalItemText}>
                    <Text style={[styles.signalItemTitle, { color: c.foreground }]}>CV opened</Text>
                    <Text style={[styles.signalItemSub, { color: c.mutedForeground }]}>
                      Opened {cvOpenedAgo}
                    </Text>
                  </View>
                </View>
              ) : null}

              {followedUpAgo ? (
                <View style={styles.signalItem}>
                  <AppSymbol name="arrow.uturn.right" size={16} tintColor={c.brandStrong} />
                  <View style={styles.signalItemText}>
                    <Text style={[styles.signalItemTitle, { color: c.foreground }]}>Followed up</Text>
                    <Text style={[styles.signalItemSub, { color: c.mutedForeground }]}>
                      Chased {followedUpAgo}
                    </Text>
                  </View>
                </View>
              ) : null}

              {currentApp.email_count > 0 ? (
                <View style={styles.signalItem}>
                  <AppSymbol name="text.bubble" size={16} tintColor={c.brandStrong} />
                  <View style={styles.signalItemText}>
                    <Text style={[styles.signalItemTitle, { color: c.foreground }]}>Linked emails</Text>
                    <Text style={[styles.signalItemSub, { color: c.mutedForeground }]}>
                      {currentApp.email_count} {currentApp.email_count === 1 ? 'message' : 'messages'}
                    </Text>
                  </View>
                </View>
              ) : null}

              {!silenceText && !cvOpenedAgo && !followedUpAgo && currentApp.email_count === 0 ? (
                <Text style={[styles.noSignalsText, { color: c.mutedForeground }]}>
                  No active signals recorded yet.
                </Text>
              ) : null}
            </View>
          </View>

          {/* Secondary Actions / Danger Zone */}
          <View style={styles.actionsSection}>
            {!isSavedGroup && !pruned ? (
              <Pressable
                onPress={handleMoveToSaved}
                disabled={isMovingToSaved}
                accessibilityRole="button"
                accessibilityLabel="Move to Saved list"
                style={({ pressed }) => [
                  styles.secondaryActionBtn,
                  { borderColor: c.border, backgroundColor: c.card },
                  pressed && { opacity: 0.7 },
                ]}>
                <AppSymbol name="bookmark" size={16} tintColor={c.foreground} />
                <Text style={[styles.secondaryActionText, { color: c.foreground }]}>
                  Move to Saved
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleRemove}
              disabled={isRemoving}
              accessibilityRole="button"
              accessibilityLabel="Remove from Tracker"
              style={({ pressed }) => [
                styles.removeButton,
                { borderColor: '#ff777c', backgroundColor: '#3a1719' },
                pressed && { opacity: 0.7 },
              ]}>
              <AppSymbol name="trash" size={16} tintColor="#ff777c" />
              <Text style={[styles.removeButtonText, { color: '#ff777c' }]}>
                Remove from Tracker
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Stage Picker Modal */}
      <ApplicationStagePicker
        visible={isPickerVisible}
        currentStage={currentStage}
        onSelectStage={handleSelectStage}
        onClose={() => setIsPickerVisible(false)}
      />

      {/* Themed Confirmation Modal */}
      {confirmModal ? (
        <ConfirmationModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          confirmVariant={confirmModal.confirmVariant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    gap: Space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Space.sm,
  },
  back: {
    padding: Space.xs,
  },
  headerInfo: {
    flex: 1,
  },
  headerRole: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerCompany: {
    fontSize: 12,
  },
  viewJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: 5,
  },
  viewJobText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: Space.lg,
    gap: Space.md,
    paddingBottom: Space.xl,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Space.md,
    gap: Space.sm,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  companyMeta: {
    flex: 1,
    gap: 2,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  companySubtitle: {
    fontSize: 14,
  },
  stageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stageValue: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  appliedDateText: {
    fontSize: 12,
    marginTop: 2,
  },
  changeStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 6,
  },
  changeStageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionsBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Space.md,
    marginTop: Space.sm,
    gap: Space.xs,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  applyActionButtons: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.xs,
    flexWrap: 'wrap',
  },
  markAppliedBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  markAppliedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  setPreparingBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  setPreparingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveNotesBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 4,
  },
  saveNotesBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Space.sm,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  signalsList: {
    gap: Space.sm,
    marginTop: Space.xs,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  signalItemText: {
    flex: 1,
  },
  signalItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  signalItemSub: {
    fontSize: 12,
  },
  noSignalsText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actionsSection: {
    gap: Space.sm,
    marginTop: Space.sm,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  stateBody: {
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
