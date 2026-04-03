import { useState } from 'react';

const EMOJI_GROUPS = [
  {
    label: '🛒',
    emojis: ['🛒', '📋', '📝', '✅', '🗒️', '📌', '🏷️', '💰'],
  },
  {
    label: '🍎',
    emojis: ['🍎', '🥬', '🥕', '🍌', '🍇', '🍊', '🥑', '🍋', '🍓', '🫐', '🌽', '🧅', '🍅', '🥒', '🥦', '🍆'],
  },
  {
    label: '🥛',
    emojis: ['🥛', '🧀', '🥚', '🧈', '🍦', '🥩', '🍗', '🐟', '🦐', '🥫', '🍞', '🥖', '🥐', '🍕', '🌮', '🥙'],
  },
  {
    label: '🏠',
    emojis: ['🏠', '🧹', '🧴', '🧽', '🧻', '🪥', '💊', '🩹', '👶', '🐕', '🐈', '🪴', '🕯️', '🎂', '🎉', '🎁'],
  },
  {
    label: '📦',
    emojis: ['📦', '🏪', '💳', '🚗', '✈️', '🏖️', '⚽', '🎮', '📱', '💡', '🔑', '❤️', '⭐', '🔥', '💎', '🌈'],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  onClose?: () => void;
}

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
      {/* Category tabs */}
      <div className="flex border-b border-gray-100">
        {EMOJI_GROUPS.map((group, i) => (
          <button
            key={i}
            onClick={() => setActiveGroup(i)}
            className="flex-1 py-2 text-xl"
            style={i === activeGroup ? { background: 'var(--color-primary-bg50)' } : undefined}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0 p-2 max-h-[180px] overflow-y-auto">
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onChange(emoji); onClose?.(); }}
            className={`w-full aspect-square flex items-center justify-center text-2xl rounded-lg ${
              emoji === value ? '' : 'active:bg-gray-100'
            }`}
            style={emoji === value ? { background: 'var(--color-primary-bg50)' } : undefined}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
