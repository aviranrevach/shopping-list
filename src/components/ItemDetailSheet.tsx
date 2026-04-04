import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { supabase } from '../lib/supabase';
import { updateItem, deleteItem } from '../data/items';
import { fetchItemImages, uploadItemImage, deleteItemImage, getImageUrl } from '../data/images';
import { Avatar } from './Avatar';
import { UNITS } from '../types';
import { useCategories } from '../hooks/useCategories';
import { createCustomCategory } from '../data/categories';
import type { Item, ItemImage, GroupMember } from '../types';

const CATEGORY_TINTS: Record<string, { bg: string; color: string; activeBg: string }> = {
  produce:   { bg: '#f0fdf4', color: '#166534', activeBg: '#bbf7d0' },
  dairy:     { bg: '#eff6ff', color: '#1d4ed8', activeBg: '#bfdbfe' },
  meat_fish: { bg: '#fef2f2', color: '#b91c1c', activeBg: '#fecaca' },
  bakery:    { bg: '#fffbeb', color: '#92400e', activeBg: '#fde68a' },
  frozen:    { bg: '#f0f9ff', color: '#0369a1', activeBg: '#bae6fd' },
  canned:    { bg: '#fff7ed', color: '#c2410c', activeBg: '#fed7aa' },
  snacks:    { bg: '#fdf4ff', color: '#7e22ce', activeBg: '#e9d5ff' },
  household: { bg: '#f0fdfa', color: '#0f766e', activeBg: '#99f6e4' },
  hygiene:   { bg: '#fdf2f8', color: '#be185d', activeBg: '#fbcfe8' },
  spices:    { bg: '#fefce8', color: '#a16207', activeBg: '#fef08a' },
  baking:    { bg: '#fff1f2', color: '#be123c', activeBg: '#fda4af' },
  other:     { bg: '#f8fafc', color: '#475569', activeBg: '#cbd5e1' },
};

function getTint(key: string) {
  return CATEGORY_TINTS[key] ?? { bg: '#f5f5f5', color: '#555', activeBg: '#e0e0e0' };
}

interface ItemDetailSheetProps {
  itemId: string;
  onClose: () => void;
  onDelete?: () => void;
}

export function ItemDetailSheet({ itemId, onClose, onDelete }: ItemDetailSheetProps) {
  const { t } = useI18n();
  const { scheme } = useTheme();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const { allCategories, addCategory } = useCategories(group?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<ItemImage[]>([]);
  const [addedBy, setAddedBy] = useState<GroupMember | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Local state for text fields — sync to Supabase on blur, not on every keystroke
  const [localName, setLocalName] = useState('');
  const [localNote, setLocalNote] = useState('');

  // Category pills
  const [catExpanded, setCatExpanded] = useState(false);
  const catPillsRef = useRef<HTMLDivElement>(null);
  const [catCollapseHeight, setCatCollapseHeight] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState('');

  // Drag-to-dismiss: swipe right (positive dx) to close — sheet slides back to the right (where it came from)
  const dragStart = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    supabase.from('items').select('*').eq('id', itemId).single().then(({ data }) => {
      if (data) {
        setItem(data as Item);
        setLocalName(data.name);
        setLocalNote(data.note ?? '');
      }
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

  useEffect(() => {
    if (!catPillsRef.current) return;
    const pills = Array.from(catPillsRef.current.children) as HTMLElement[];
    if (pills.length < 3) return;
    let rowCount = 1;
    let lastTop = pills[0].offsetTop;
    for (const pill of pills) {
      if (pill.offsetTop > lastTop + 4) {
        rowCount++;
        lastTop = pill.offsetTop;
        if (rowCount === 3) {
          setCatCollapseHeight(pill.offsetTop - 2);
          break;
        }
      }
    }
  }, [allCategories, item]);

  function handleClose() {
    setIsOpen(false);
    // Let the CSS transition play (sheet slides back to translateX(-100%)) before unmounting
    setTimeout(onClose, 350);
  }

  async function handleDelete() {
    await deleteItem(itemId);
    setIsOpen(false);
    setTimeout(() => { onClose(); onDelete?.(); }, 350);
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

  // Drag-to-dismiss: swipe left (negative dx) to close — sheet slides back to the left
  function handleSheetPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-sheet-body]')) return;
    dragStart.current = e.clientX;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }

  function handleSheetPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !sheetRef.current) return;
    const dx = e.clientX - dragStart.current;
    // Negative dx = dragging left = closing direction (sheet slides left to exit)
    if (dx < 0) {
      sheetRef.current.style.transform = `translateX(${dx}px)`;
    }
  }

  function handleSheetPointerUp(e: React.PointerEvent) {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    const dx = e.clientX - dragStart.current;
    if (dx < -100) {
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

      {/* Full-screen sheet — slides in from the LEFT */}
      <div
        ref={sheetRef}
        className="fixed inset-0 z-[51] bg-white"
        style={{
          transform: isOpen ? 'translateX(0%)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          overflowY: 'auto',
          paddingTop: 'env(safe-area-inset-top, 20px)',
        }}
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={handleSheetPointerUp}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10" style={{ direction: 'rtl' }}>
          {/* Back */}
          <button type="button" onClick={handleClose} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Title */}
          <h2 className="text-[17px] font-semibold text-gray-900 flex-1 text-center">{item?.name ?? ''}</h2>

          {/* Avatar + time stacked, top-aligned */}
          {addedBy && (
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ alignSelf: 'flex-start', paddingTop: 2 }}>
              <Avatar name={addedBy.display_name} avatarUrl={addedBy.avatar_url} size="sm" />
              <span className="text-[9px] text-gray-300">{timeStr}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div data-sheet-body className="p-4 space-y-4 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
        {!item ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: scheme.primaryLight, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
          {/* Name + Note — combined box */}
          <div>
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>פריט</label>
            <div className="bg-gray-50 border border-gray-200 rounded-[13px] overflow-hidden">
              <input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={() => {
                  if (localName !== item.name) handleUpdate({ name: localName });
                }}
                className="w-full bg-transparent px-4 py-3 text-base font-semibold text-gray-900 outline-none border-b border-gray-200"
                style={{ direction: 'rtl' }}
              />
              <textarea
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                onBlur={() => {
                  const val = localNote || null;
                  if (val !== (item.note ?? null)) handleUpdate({ note: val });
                }}
                placeholder="הוסף הערה..."
                rows={2}
                className="w-full bg-transparent px-4 py-2.5 text-sm text-gray-500 outline-none resize-none placeholder:text-gray-300"
                style={{ direction: 'rtl' }}
              />
            </div>
          </div>

          {/* Quantity + Unit */}
          <div>
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>{t('item_detail.quantity')}</label>

            {/* Main row */}
            <div className="bg-gray-50 border border-gray-200 rounded-[13px] px-3 py-2.5 flex items-center">
              <button
                type="button"
                onClick={() => handleUpdate({ quantity: Math.max(1, item.quantity - 1) })}
                className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
              <span className="text-2xl font-black text-gray-900 min-w-[44px] text-center">{item.quantity}</span>
              <button
                type="button"
                onClick={() => setShowUnitPicker(p => !p)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-white flex-shrink-0 mx-2"
                style={{ background: scheme.primary }}
              >
                {t(`units.${item.unit ?? 'unit'}`)} {showUnitPicker ? '▴' : '▾'}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => handleUpdate({ quantity: item.quantity + 1 })}
                className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>

            {/* Unit picker — appears below when open */}
            {showUnitPicker && (
              <div
                className="mt-1.5 rounded-[13px] p-2 grid grid-cols-3 gap-1.5"
                style={{ border: `1.5px solid ${scheme.primaryLight}`, background: '#fafaf8' }}
              >
                {UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => { handleUpdate({ unit: u }); setShowUnitPicker(false); }}
                    className="py-2 rounded-xl text-sm font-semibold text-center"
                    style={
                      (item.unit ?? 'unit') === u
                        ? { background: scheme.primary, color: '#fff' }
                        : { background: '#fff', color: '#666', border: '1px solid #e5e7eb' }
                    }
                  >
                    {t(`units.${u}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>קטגוריה</label>

            <div
              ref={catPillsRef}
              className="flex flex-wrap"
              style={{
                gap: '5px',
                maxHeight: catExpanded || catCollapseHeight === null ? 'none' : `${catCollapseHeight}px`,
                overflow: catExpanded || catCollapseHeight === null ? 'visible' : 'hidden',
              }}
            >
              {allCategories.map((cat) => {
                const active = cat.key === item.category;
                const tint = getTint(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleUpdate({ category: cat.key })}
                    className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-[10px] text-[13px] whitespace-nowrap"
                    style={{
                      flex: '1 1 auto',
                      background: active ? tint.activeBg : tint.bg,
                      color: tint.color,
                      border: active ? '1.5px solid rgba(0,0,0,0.28)' : '1px solid rgba(0,0,0,0.10)',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                    {cat.isCustom ? cat.key : t(`categories.${cat.key}`)}
                  </button>
                );
              })}

              {catExpanded && (
                <div
                  className="flex items-center gap-1 px-2.5 py-2 rounded-[10px]"
                  style={{ flex: '1 1 auto', border: '1.5px dashed #d1d5db', minWidth: 120 }}
                >
                  <span style={{ fontSize: 14, color: '#9ca3af' }}>＋</span>
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newCatName.trim() && group) {
                        const created = await createCustomCategory(group.id, newCatName.trim(), '📦');
                        addCategory(created);
                        handleUpdate({ category: created.name });
                        setNewCatName('');
                        setCatExpanded(false);
                      }
                    }}
                    placeholder="קטגוריה חדשה"
                    className="flex-1 bg-transparent outline-none text-[13px] text-gray-400 placeholder:text-gray-300 min-w-0"
                    style={{ direction: 'rtl' }}
                  />
                </div>
              )}
            </div>

            {catCollapseHeight !== null && (
              <button
                type="button"
                onClick={() => setCatExpanded(p => !p)}
                className="mt-1.5 w-full text-center text-xs font-semibold"
                style={{ color: scheme.primary }}
              >
                {catExpanded ? '▴ פחות' : '+ עוד ▾'}
              </button>
            )}
          </div>

{/* Images */}
          <div>
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>תמונות</label>
            <div className="flex gap-2 flex-wrap">
              {images.map((image) => (
                <div key={image.id} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
                  <img src={getImageUrl(image.storage_path)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-[72px] h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 text-xs flex-shrink-0"
                style={{ border: '1.5px dashed #d1d5db' }}
              >
                {uploading
                  ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: scheme.primaryLight, borderTopColor: 'transparent' }} />
                  : <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      הוסף
                    </>
                }
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Delete — full width at bottom */}
          <button
            type="button"
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[13px] text-[15px] font-semibold text-red-500"
            style={{ background: '#fff0f0', marginTop: 4 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            מחק פריט
          </button>
          </>
        )}
        </div>
      </div>
    </>,
    document.body
  );
}
