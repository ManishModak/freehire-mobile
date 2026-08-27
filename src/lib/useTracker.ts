import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  clearApplicationStage,
  getTrackedJobs,
  getTrackingPipeline,
  markJobApplied,
  saveJob,
  trackApplication,
  untrackApplication,
} from './api';
import { useAuth } from './authStore';
import { privateKeys } from './queryKeys';
import {
  optimisticMoveToSaved,
  optimisticPatchApplied,
  optimisticPatchNotes,
  optimisticPatchStage,
  optimisticRemoveJob,
} from './tracker';
import type { TrackingPage, UserJob } from './types';
import type { SessionOwner } from '@/features/auth/model/authTypes';

export function useTrackedJobs(filter: string = 'board') {
  const { user, sessionEpoch } = useAuth();
  const queryKey = user
    ? privateKeys.trackerList(user.id, filter)
    : (['private', 'none', 'tracker', 'list', filter] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => getTrackedJobs(filter, 500, 0, sessionEpoch, signal),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useTrackingPipeline() {
  const { user, sessionEpoch } = useAuth();
  const queryKey = user
    ? privateKeys.trackerPipeline(user.id)
    : (['private', 'none', 'tracker', 'pipeline'] as const);

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => getTrackingPipeline(sessionEpoch, signal),
    enabled: !!user,
    staleTime: 30_000,
  });
}

type MutationTransport = { signal: AbortSignal; release: () => void };

type MarkAppliedVars = {
  slug: string;
  id: string;
  appliedOn?: string;
  owner: SessionOwner;
  transport: MutationTransport;
};

type UpdateStageVars = {
  id: string;
  stage: string;
  notes?: string | null;
  owner: SessionOwner;
  transport: MutationTransport;
};

type UpdateNotesVars = {
  id: string;
  notes: string;
  owner: SessionOwner;
  transport: MutationTransport;
};

type MoveToSavedVars = {
  slug: string;
  id: string;
  owner: SessionOwner;
  transport: MutationTransport;
};

type RemoveVars = {
  id: string;
  owner: SessionOwner;
  transport: MutationTransport;
};

export function useTrackerMutations() {
  const { user, sessionEpoch, isOwnerCurrent, createPrivateMutation } = useAuth();
  const queryClient = useQueryClient();

  const invalidateTracker = useCallback(
    (owner: SessionOwner) => {
      if (!isOwnerCurrent(owner)) return;
      void queryClient.invalidateQueries({
        queryKey: privateKeys.tracker(owner.userId),
      });
      void queryClient.invalidateQueries({
        queryKey: privateKeys.savedJobs(owner.userId),
        exact: true,
      });
    },
    [isOwnerCurrent, queryClient],
  );

  const markAppliedMutation = useMutation({
    mutationFn: ({ slug, appliedOn, owner, transport }: MarkAppliedVars) =>
      markJobApplied(slug, owner.sessionEpoch, appliedOn, transport.signal),
    onMutate: async (vars) => {
      if (!isOwnerCurrent(vars.owner)) return;
      const listKey = privateKeys.trackerList(vars.owner.userId, 'board');
      await queryClient.cancelQueries({ queryKey: listKey });
      if (!isOwnerCurrent(vars.owner)) return;
      const previous = queryClient.getQueryData<TrackingPage>(listKey);
      queryClient.setQueryData<TrackingPage>(listKey, (old) =>
        optimisticPatchApplied(old, vars.id, new Date().toISOString()),
      );
      return { previous, owner: vars.owner };
    },
    onError: (_err, _vars, context) => {
      if (context && isOwnerCurrent(context.owner)) {
        queryClient.setQueryData(
          privateKeys.trackerList(context.owner.userId, 'board'),
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      vars.transport.release();
      invalidateTracker(vars.owner);
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage, notes, owner, transport }: UpdateStageVars) =>
      trackApplication(id, stage, notes, owner.sessionEpoch, transport.signal),
    onMutate: async (vars) => {
      if (!isOwnerCurrent(vars.owner)) return;
      const listKey = privateKeys.trackerList(vars.owner.userId, 'board');
      await queryClient.cancelQueries({ queryKey: listKey });
      if (!isOwnerCurrent(vars.owner)) return;
      const previous = queryClient.getQueryData<TrackingPage>(listKey);
      queryClient.setQueryData<TrackingPage>(listKey, (old) =>
        optimisticPatchStage(old, vars.id, vars.stage, vars.notes),
      );
      return { previous, owner: vars.owner };
    },
    onError: (_err, _vars, context) => {
      if (context && isOwnerCurrent(context.owner)) {
        queryClient.setQueryData(
          privateKeys.trackerList(context.owner.userId, 'board'),
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      vars.transport.release();
      invalidateTracker(vars.owner);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes, owner, transport }: UpdateNotesVars) =>
      trackApplication(id, undefined, notes, owner.sessionEpoch, transport.signal),
    onMutate: async (vars) => {
      if (!isOwnerCurrent(vars.owner)) return;
      const listKey = privateKeys.trackerList(vars.owner.userId, 'board');
      await queryClient.cancelQueries({ queryKey: listKey });
      if (!isOwnerCurrent(vars.owner)) return;
      const previous = queryClient.getQueryData<TrackingPage>(listKey);
      queryClient.setQueryData<TrackingPage>(listKey, (old) =>
        optimisticPatchNotes(old, vars.id, vars.notes),
      );
      return { previous, owner: vars.owner };
    },
    onError: (_err, _vars, context) => {
      if (context && isOwnerCurrent(context.owner)) {
        queryClient.setQueryData(
          privateKeys.trackerList(context.owner.userId, 'board'),
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      vars.transport.release();
      invalidateTracker(vars.owner);
    },
  });

  const moveToSavedMutation = useMutation({
    mutationFn: async ({ slug, id, owner, transport }: MoveToSavedVars) => {
      // Step 1: Save the job
      await saveJob(slug, owner.sessionEpoch, transport.signal);
      // Step 2: Clear the application stage
      try {
        await clearApplicationStage(id, owner.sessionEpoch, transport.signal);
      } catch (err) {
        // Honest partial failure: the job was saved, but clear stage failed
        throw new Error(
          "Saved to bookmarks, but couldn't clear application progress. Please try again.",
          { cause: err },
        );
      }
    },
    onMutate: async (vars) => {
      if (!isOwnerCurrent(vars.owner)) return;
      const listKey = privateKeys.trackerList(vars.owner.userId, 'board');
      await queryClient.cancelQueries({ queryKey: listKey });
      if (!isOwnerCurrent(vars.owner)) return;
      const previous = queryClient.getQueryData<TrackingPage>(listKey);
      queryClient.setQueryData<TrackingPage>(listKey, (old) =>
        optimisticMoveToSaved(old, vars.id, new Date().toISOString()),
      );
      return { previous, owner: vars.owner };
    },
    onError: (_err, _vars, context) => {
      if (context && isOwnerCurrent(context.owner)) {
        queryClient.setQueryData(
          privateKeys.trackerList(context.owner.userId, 'board'),
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      vars.transport.release();
      invalidateTracker(vars.owner);
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, owner, transport }: RemoveVars) =>
      untrackApplication(id, owner.sessionEpoch, transport.signal),
    onMutate: async (vars) => {
      if (!isOwnerCurrent(vars.owner)) return;
      const listKey = privateKeys.trackerList(vars.owner.userId, 'board');
      await queryClient.cancelQueries({ queryKey: listKey });
      if (!isOwnerCurrent(vars.owner)) return;
      const previous = queryClient.getQueryData<TrackingPage>(listKey);
      queryClient.setQueryData<TrackingPage>(listKey, (old) =>
        optimisticRemoveJob(old, vars.id),
      );
      return { previous, owner: vars.owner };
    },
    onError: (_err, _vars, context) => {
      if (context && isOwnerCurrent(context.owner)) {
        queryClient.setQueryData(
          privateKeys.trackerList(context.owner.userId, 'board'),
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      vars.transport.release();
      invalidateTracker(vars.owner);
    },
  });

  const markApplied = useCallback(
    async (slug: string, id: string, appliedOn?: string): Promise<UserJob> => {
      if (!user) throw new Error('Unauthenticated');
      const owner = { userId: user.id, sessionEpoch };
      const transport = createPrivateMutation(owner);
      return markAppliedMutation.mutateAsync({ slug, id, appliedOn, owner, transport });
    },
    [user, sessionEpoch, createPrivateMutation, markAppliedMutation],
  );

  const updateStage = useCallback(
    async (id: string, stage: string, notes?: string | null): Promise<UserJob> => {
      if (!user) throw new Error('Unauthenticated');
      const owner = { userId: user.id, sessionEpoch };
      const transport = createPrivateMutation(owner);
      return updateStageMutation.mutateAsync({ id, stage, notes, owner, transport });
    },
    [user, sessionEpoch, createPrivateMutation, updateStageMutation],
  );

  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<UserJob> => {
      if (!user) throw new Error('Unauthenticated');
      const owner = { userId: user.id, sessionEpoch };
      const transport = createPrivateMutation(owner);
      return updateNotesMutation.mutateAsync({ id, notes, owner, transport });
    },
    [user, sessionEpoch, createPrivateMutation, updateNotesMutation],
  );

  const moveToSaved = useCallback(
    async (slug: string, id: string): Promise<void> => {
      if (!user) throw new Error('Unauthenticated');
      const owner = { userId: user.id, sessionEpoch };
      const transport = createPrivateMutation(owner);
      await moveToSavedMutation.mutateAsync({ slug, id, owner, transport });
    },
    [user, sessionEpoch, createPrivateMutation, moveToSavedMutation],
  );

  const removeFromTracker = useCallback(
    async (id: string): Promise<UserJob> => {
      if (!user) throw new Error('Unauthenticated');
      const owner = { userId: user.id, sessionEpoch };
      const transport = createPrivateMutation(owner);
      return removeMutation.mutateAsync({ id, owner, transport });
    },
    [user, sessionEpoch, createPrivateMutation, removeMutation],
  );

  return {
    markApplied,
    updateStage,
    updateNotes,
    moveToSaved,
    removeFromTracker,
    isMarkingApplied: markAppliedMutation.isPending,
    isUpdatingStage: updateStageMutation.isPending,
    isUpdatingNotes: updateNotesMutation.isPending,
    isMovingToSaved: moveToSavedMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
