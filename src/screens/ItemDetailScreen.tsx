import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { supabase } from '../lib/supabase';
import { updateItem } from '../data/items';
import { fetchItemImages, uploadItemImage, deleteItemImage, getImageUrl } from '../data/images';
import { Avatar } from '../components/Avatar';
import { CATEGORIES, UNITS } from '../types';
import type { Item, ItemImage, GroupMember } from '../types';

export function ItemDetailScreen() {
  const { t } = useI18n();
  const { listId, itemId } = useParams<{ listId: string; itemId: string }>();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<ItemImage[]>([]);
  const [addedBy, setAddedBy] = useState<GroupMember | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!itemId) return;

    supabase.from('items').select('*').eq('id', itemId).single().then(({ data }) => {
      if (data) setItem(data as Item);
    });

    fetchItemImages(itemId).then(setImages);
  }, [itemId]);

  useEffect(() => {
    if (!item?.added_by) return;
    supabase.from('group_members').select('*').eq('user_id', item.added_by).single().then(({ data }) => {
      if (data) setAddedBy(data as GroupMember);
    });
  }, [item?.added_by]);

  async function handleUpdate(updates: Partial<Item>) {
    if (!itemId || !item) return;
    const updated = await updateItem(itemId, updates);
    setItem(updated);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !group || !itemId) return;
    setUploading(true);
    try {
      const image = await uploadItemImage(group.id, itemId, file);
      setImages((prev) => [...prev, image]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteImage(image: ItemImage) {
    await deleteItemImage(image);
    setImages((prev) => prev.filter((i) => i.id !== image.id));
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const createdDate = new Date(item.created_at);
  const timeStr = createdDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex items-center">
        <div className="flex items-center gap-1.5 min-w-[60px]">
          {addedBy && <Avatar name={addedBy.display_name} avatarUrl={addedBy.avatar_url} size="sm" />}
          <span className="text-xs text-gray-300">{timeStr}</span>
        </div>
        <h1 className="text-base font-semibold text-gray-900 flex-1 text-center">{item.name}</h1>
        <div className="min-w-[60px] flex justify-end">
          <button onClick={() => navigate(`/lists/${listId}`)} className="p-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quantity + Unit */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.quantity')}</label>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <button
                onClick={() => handleUpdate({ quantity: Math.max(1, item.quantity - 1) })}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="text-lg font-bold text-gray-900">{item.quantity}</span>
              <button
                onClick={() => handleUpdate({ quantity: item.quantity + 1 })}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.unit')}</label>
            <select
              value={item.unit ?? 'unit'}
              onChange={(e) => handleUpdate({ unit: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none text-gray-700"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{t(`units.${u}`)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.category')}</label>
          <select
            value={item.category}
            onChange={(e) => handleUpdate({ category: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none text-gray-700"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
            ))}
          </select>
          <p className="text-xs text-gray-300 mt-1">{t('item_detail.category_hint')}</p>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.note')}</label>
          <textarea
            value={item.note ?? ''}
            onChange={(e) => handleUpdate({ note: e.target.value || null })}
            placeholder="..."
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none text-gray-700 resize-none"
          />
        </div>

        {/* Images */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.images')}</label>
          <div className="space-y-2">
            {images.map((image) => (
              <div key={image.id} className="relative rounded-xl overflow-hidden">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt=""
                  className="w-full h-auto rounded-xl"
                />
                <button
                  onClick={() => handleDeleteImage(image)}
                  className="absolute top-2 end-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('item_detail.add_image')}
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
