import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { supabase } from '../lib/supabase';
import { updateItem } from '../data/items';
import { fetchItemImages, uploadItemImage, deleteItemImage, getImageUrl } from '../data/images';
import { Avatar } from './Avatar';
import { CATEGORIES, UNITS } from '../types';
import type { Item, ItemImage, GroupMember } from '../types';

interface ItemDetailSheetProps {
  itemId: string;
  onClose: () => void;
}

export function ItemDetailSheet({ itemId, onClose }: ItemDetailSheetProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<ItemImage[]>([]);
  const [addedBy, setAddedBy] = useState<GroupMember | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Drag-to-dismiss (swipe right to close, since sheet slides in from left)
  const dragStart = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    supabase.from('items').select('*').eq('id', itemId).single().then(({ data }) => {
      if (data) setItem(data as Item);
    });
    fetchItemImages(itemId).then(setImages);

    // Double rAF to ensure the browser has painted the initial (closed) state
    // before transitioning to open — prevents the sheet appearing without animation.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpen(true);
      });
    });
  }, [itemId]);

  useEffect(() => {
    if (!item?.added_by) return;
    supabase.from('group_members').select('*').eq('user_id', item.added_by).single().then(({ data }) => {
      if (data) setAddedBy(data as GroupMember);
    });
  }, [item?.added_by]);

  function handleClose() {
    setIsOpen(false);
    // Let the CSS transition play (translateX(100%)) before unmounting
    setTimeout(onClose, 350);
  }

  async function handleUpdate(updates: Partial<Item>) {
    if (!item) return;
    const updated = await updateItem(itemId, updates);
    setItem(updated);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !group) return;
    setUploading(true);
    try {
      const image = await uploadItemImage(group.id, itemId, file);
      setImages((prev) => [...prev, image]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteImage(img: ItemImage) {
    await deleteItemImage(img);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
  }

  // Drag-to-dismiss: swipe towards right (positive dx) to close — sheet slides back out
  function handleSheetPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-sheet-body]')) return;
    dragStart.current = e.clientX;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }

  function handleSheetPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !sheetRef.current) return;
    const dx = e.clientX - dragStart.current;
    // Positive dx = dragging right = closing direction (sheet slides right to exit)
    if (dx > 0) {
      sheetRef.current.style.transform = `translateX(${dx}px)`;
    }
  }

  function handleSheetPointerUp(e: React.PointerEvent) {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    const dx = e.clientX - dragStart.current;
    if (dx > 100) {
      handleClose();
    } else {
      sheetRef.current.style.transition = 'transform 0.25s ease';
      sheetRef.current.style.transform = 'translateX(0%)';
    }
  }

  const timeStr = item ? new Date(item.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-colors duration-300 ${isOpen ? 'bg-black/50' : 'bg-black/0'}`}
        style={{ backdropFilter: isOpen ? 'blur(2px)' : 'none', WebkitBackdropFilter: isOpen ? 'blur(2px)' : 'none' }}
        onClick={handleClose}
      />

      {/* Full-screen sheet — slides in from the right (start side in RTL) */}
      <div
        ref={sheetRef}
        className="fixed inset-0 z-[51] bg-white"
        style={{
          transform: isOpen ? 'translateX(0%)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          overflowY: 'auto',
          paddingTop: 'env(safe-area-inset-top, 20px)',
        }}
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={handleSheetPointerUp}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          {/* Close button (left side, acts as "back") */}
          <button onClick={handleClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <h2 className="text-[17px] font-semibold text-gray-900 flex-1 text-center">{item?.name ?? ''}</h2>

          <div className="flex items-center gap-1.5 min-w-[60px] justify-end">
            {addedBy && <Avatar name={addedBy.display_name} avatarUrl={addedBy.avatar_url} size="sm" />}
            <span className="text-xs text-gray-300">{timeStr}</span>
          </div>
        </div>

        {/* Body */}
        <div data-sheet-body className="p-4 space-y-4 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
        {!item ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
          {/* Quantity + Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.quantity')}</label>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <button onClick={() => handleUpdate({ quantity: Math.max(1, item.quantity - 1) })} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <span className="text-xl font-bold text-gray-900">{item.quantity}</span>
                <button onClick={() => handleUpdate({ quantity: item.quantity + 1 })} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.unit')}</label>
              <select value={item.unit ?? 'unit'} onChange={(e) => handleUpdate({ unit: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-700">
                {UNITS.map((u) => (<option key={u} value={u}>{t(`units.${u}`)}</option>))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.category')}</label>
            <select value={item.category} onChange={(e) => handleUpdate({ category: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-700">
              {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{t(`categories.${cat}`)}</option>))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.note')}</label>
            <textarea value={item.note ?? ''} onChange={(e) => handleUpdate({ note: e.target.value || null })} placeholder="..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-700 resize-none" />
          </div>

          {/* Images */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.images')}</label>
            <div className="space-y-2">
              {images.map((image) => (
                <div key={image.id} className="relative rounded-xl overflow-hidden">
                  <img src={getImageUrl(image.storage_path)} alt="" className="w-full h-auto rounded-xl" />
                  <button onClick={() => handleDeleteImage(image)} className="absolute top-2 end-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full h-14 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    {t('item_detail.add_image')}
                  </>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
            </div>
          </div>
          </>
        )}
        </div>
      </div>
    </>,
    document.body
  );
}
