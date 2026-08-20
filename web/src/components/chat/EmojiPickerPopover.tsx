import React from 'react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  '😊', '😂', '👍', '❤️', '🔥', '🎉', '🙏', '👏', '😍', '🙌',
  '🤔', '😎', '✅', '🚀', '💯', '👌', '💪', '⭐', '✨', '💡',
  '👀', '📌', '🤝', '💼', '📊', '⚡', '🥳', '🎯', '📢', '💬'
];

export const EmojiPickerPopover: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '60px',
        right: '10px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: '0.75rem',
        zIndex: 1000,
        width: '260px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Emoji</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.35rem' }}>
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            style={{
              fontSize: '1.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '4px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
