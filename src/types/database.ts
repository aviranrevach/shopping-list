export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  display_name: string;
  avatar_url: string | null;
}

export interface List {
  id: string;
  group_id: string;
  name: string;
  icon: string;
  created_by: string;
  created_at: string;
}

export interface Item {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  checked: boolean;
  checked_by: string | null;
  added_by: string;
  note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ItemImage {
  id: string;
  item_id: string;
  storage_path: string;
  created_at: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}

export interface ListInvite {
  id: string;
  list_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  joined_at: string;
}
