import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!userId) {
      setState({ group: null, member: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    getOrCreateGroup(userId, 'User')
      .then(({ group, member }) => {
        if (!cancelled) setState({ group, member, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ group: null, member: null, loading: false, error });
      });

    return () => { cancelled = true; };
  }, [userId]);

  return state;
}
