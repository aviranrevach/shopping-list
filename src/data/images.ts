import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';
import type { ItemImage } from '../types';

export async function fetchItemImages(itemId: string): Promise<ItemImage[]> {
  const { data, error } = await supabase
    .from('item_images')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ItemImage[];
}

export async function uploadItemImage(
  groupId: string,
  itemId: string,
  file: File,
): Promise<ItemImage> {
  const compressed = await compressImage(file);
  const filename = `${Date.now()}.jpg`;
  const storagePath = `${groupId}/${itemId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(storagePath, compressed, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('item_images')
    .insert({ item_id: itemId, storage_path: storagePath })
    .select()
    .single();

  if (error) throw error;
  return data as ItemImage;
}

export async function deleteItemImage(image: ItemImage): Promise<void> {
  await supabase.storage.from('item-images').remove([image.storage_path]);
  await supabase.from('item_images').delete().eq('id', image.id);
}

export function getImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from('item-images').getPublicUrl(storagePath);
  return data.publicUrl;
}
