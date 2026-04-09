import { useState, useRef, useEffect } from 'react'
import { Search, Clock, Smile, Heart, Coffee, Plane, Music, Lightbulb, Flag, X } from 'lucide-react'

const EMOJI_CATEGORIES: { id: string; label: string; icon: any; emojis: string[] }[] = [
  {
    id: 'recent', label: 'Recently Used', icon: Clock,
    emojis: [] // populated dynamically
  },
  {
    id: 'smileys', label: 'Smileys & People', icon: Smile,
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚',
      '😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭',
      '🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶',
      '🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤',
      '😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵',
      '🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟',
      '🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧',
      '😨','😰','😥','😢','😭','😱','😖','😣','😞','😓',
      '😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀',
      '☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺',
      '😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉',
      '🙊','👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴',
      '👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈',
      '👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊',
      '🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️',
      '💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀',
      '🫁','🦷','🦴','👀','👁️','👅','👄','🫦','💋'
    ]
  },
  {
    id: 'hearts', label: 'Hearts & Love', icon: Heart,
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
      '🫶','💑','💏','👫','👬','👭','🌹','🌷','🌸','💐'
    ]
  },
  {
    id: 'food', label: 'Food & Drink', icon: Coffee,
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
      '🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦',
      '🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔',
      '🍞','🥐','🥖','🫓','🥨','🥯','🧇','🥞','🧈','🍳',
      '🍕','🍔','🍟','🌭','🥪','🌮','🌯','🫔','🥙','🧆',
      '🥗','🍜','🍝','🍿','🧂','☕','🍵','🧃','🥤','🍺',
      '🍻','🥂','🍷','🍸','🍹','🧋','🍶','🫗'
    ]
  },
  {
    id: 'travel', label: 'Travel & Places', icon: Plane,
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
      '✈️','🛫','🛬','🚀','🛸','🚁','🛶','⛵','🚤','🛥️',
      '🗺️','🗼','🗽','🏰','🏯','🏗️','🏠','🏡','🏢','🏣',
      '🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','⛪','🕌',
      '🌍','🌎','🌏','🌐','🗻','⛰️','🏔️','🌋','🏝️','🏖️',
      '🌅','🌄','🌆','🌇','🌃','🌉','🌌','🎆','🎇'
    ]
  },
  {
    id: 'activities', label: 'Activities', icon: Music,
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
      '🏓','🏸','🏒','🥅','⛳','🏹','🎣','🤿','🥊','🥋',
      '🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎪','🎭','🎨',
      '🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕',
      '🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🧩'
    ]
  },
  {
    id: 'objects', label: 'Objects', icon: Lightbulb,
    emojis: [
      '📱','💻','⌨️','🖥️','🖨️','🖱️','💽','💾','💿','📀',
      '📷','📸','📹','🎥','📞','☎️','📟','📠','📺','📻',
      '⏰','⏲️','⏱️','🕰️','⌛','⏳','📡','🔋','🔌','💡',
      '🔦','🕯️','📔','📕','📖','📗','📘','📙','📚','📓',
      '📃','📄','📰','📝','✏️','🖊️','🖋️','✒️','📎','🖇️',
      '📐','📏','📌','📍','✂️','🗑️','🔒','🔓','🔑','🗝️',
      '💰','💴','💵','💶','💷','💳','💎','⚖️','🛠️','🔧',
      '🔨','⚒️','🪛','🔩','⚙️','🧲','🪜','📦','📫','📬'
    ]
  },
  {
    id: 'symbols', label: 'Symbols & Flags', icon: Flag,
    emojis: [
      '✅','❌','❓','❗','‼️','⁉️','💯','🔥','✨','⭐',
      '🌟','💫','🎉','🎊','🎁','🏷️','🔔','🔕','📢','📣',
      '💬','💭','🗯️','♻️','⚜️','🔰','⭕','✳️','❇️','🔴',
      '🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧',
      '🟨','🟩','🟦','🟪','🟫','⬛','⬜','◻️','◼️','◽',
      '▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘',
      '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🇺🇸','🇬🇧','🇫🇷','🇩🇪',
      '🇨🇦','🇦🇺','🇯🇵','🇰🇷','🇧🇷','🇮🇳','🇳🇬','🇿🇦','🇰🇪','🇬🇭'
    ]
  }
]

const RECENT_KEY = 'chat-recent-emojis'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) setRecentEmojis(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const handlePick = (emoji: string) => {
    onSelect(emoji)
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 30)
    setRecentEmojis(updated)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)) } catch {}
  }

  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis)
  const filtered = search
    ? allEmojis.filter(e => e.includes(search))
    : null

  const categories = EMOJI_CATEGORIES.map(c =>
    c.id === 'recent' ? { ...c, emojis: recentEmojis } : c
  ).filter(c => c.emojis.length > 0)

  return (
    <div ref={panelRef} className="emoji-picker-panel">
      <div className="emoji-picker-header">
        <div className="emoji-search-wrap">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search emoji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className="emoji-search-clear" onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {!search && (
        <div className="emoji-category-tabs">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                className={`emoji-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.label}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      )}

      <div className="emoji-grid-container">
        {filtered ? (
          <>
            <div className="emoji-category-label">Search Results</div>
            <div className="emoji-grid">
              {filtered.length === 0 ? (
                <div className="emoji-empty">No emojis found</div>
              ) : (
                filtered.map((e, i) => (
                  <button key={i} className="emoji-item" onClick={() => handlePick(e)}>
                    {e}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          categories
            .filter(c => activeCategory === c.id || activeCategory === 'all')
            .map(cat => (
              <div key={cat.id} id={`emoji-cat-${cat.id}`}>
                <div className="emoji-category-label">{cat.label}</div>
                <div className="emoji-grid">
                  {cat.emojis.map((e, i) => (
                    <button key={i} className="emoji-item" onClick={() => handlePick(e)}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
