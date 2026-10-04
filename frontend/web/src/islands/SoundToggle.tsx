import React, { useEffect, useState } from 'react'
import { isSoundEnabled, toggleSound, subscribeSound } from '../lib/sound'

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(isSoundEnabled())
    return subscribeSound(() => {
      setEnabled(isSoundEnabled())
    })
  }, [])

  return (
    <button
      type="button"
      onClick={() => toggleSound()}
      className={`life-sound-toggle ${!enabled ? 'muted' : ''}`}
      title={enabled ? '微音效已开启（点击静音）' : '微音效已静音（点击开启）'}
      aria-label="切换微音效"
    >
      {enabled ? (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  )
}
