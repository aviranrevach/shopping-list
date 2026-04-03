interface SuggestionChipsProps {
  suggestions: { name: string; category: string }[];
  onSelect: (suggestion: { name: string; category: string }) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-gray-100 border-t border-gray-200 scrollbar-hide">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.name}
          onClick={() => onSelect(suggestion)}
          className="flex-shrink-0 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 text-sm text-gray-700 active:bg-gray-50"
        >
          {suggestion.name}
        </button>
      ))}
    </div>
  );
}
