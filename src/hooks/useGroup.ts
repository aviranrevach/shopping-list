import { useEffect, useState, useCallback } from 'react';
import type { Group, GroupMember } from '../types';
import { getOrCreateGroup } from '../data/groups';

interface GroupState {
  group: Group | null;
  member: GroupMember | null;
  loading: boolean;
  error: Error | null;
}

export function useGroup(userId: string | undefined) {
  const [state, setState] = useState<GroupState>({
    group: null,
    member: null,
    loading: true,
    error: null,
  });

  const load = useCallback((uid: string) => {
    getOrCreateGroup(uid, 'User')
      .then(({ group, member }) => {
        setState({ group, member, loading: false, error: null });
      })
      .catch((error) => {
        setState({ group: null, member: null, loading: false, error });
      });
  }, []);

  useEffect(() => {
    if (!userId) {
      setState({ group: null, member: null, loading: false, error: null });
      return;
    }
    load(userId);
  }, [userId, load]);

  const refreshMember = useCallback(() => {
    if (userId) load(userId);
  }, [userId, load]);

  return { ...state, refreshMember };
}
