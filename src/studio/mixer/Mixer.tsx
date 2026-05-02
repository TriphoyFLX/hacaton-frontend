import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Volume2, Headphones, Zap, Settings } from 'lucide-react';
import { FL_COLORS, FL_SHADOWS } from '../styles/flStudioColors';

export function Mixer() {
  const { channels, updateChannel } = useStudioStore();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const handleVolumeChange = (channelId: string, volume: number) => {
    updateChannel(channelId, { volume });
  };

  const handlePanChange = (channelId: string, pan: number) => {
    updateChannel(channelId, { pan });
  };

  const handleMuteToggle = (channelId: string) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      updateChannel(channelId, { muted: !channel.muted });
    }
  };

  const handleSoloToggle = (channelId: string) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      updateChannel(channelId, { solo: !channel.solo });
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: FL_COLORS.MIXER_BG }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: FL_COLORS.BORDER_DARK, backgroundColor: FL_COLORS.PANEL_BG }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ 
            backgroundColor: FL_COLORS.ACCENT_ORANGE + '20',
            borderColor: FL_COLORS.ACCENT_ORANGE + '50'
          }}>
            <Volume2 className="w-4 h-4" style={{ color: FL_COLORS.ACCENT_ORANGE }} />
            <span className="text-sm font-bold tracking-wide" style={{ color: FL_COLORS.TEXT_PRIMARY }}>MIXER</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded transition-colors"
            style={{ 
              backgroundColor: FL_COLORS.BUTTON_BG,
              color: FL_COLORS.TEXT_SECONDARY
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
              e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_BG;
              e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
            }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Channel Strips */}
      <div className="flex gap-2 p-4 overflow-x-auto" style={{ backgroundColor: FL_COLORS.MIXER_BG }}>
        {/* Channel Strips */}
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`flex flex-col items-center w-20 rounded-lg border-2 transition-all duration-150 ${
              selectedChannel === channel.id
                ? ''
                : ''
            }`}
            style={{
              backgroundColor: FL_COLORS.CHANNEL_BG,
              borderColor: selectedChannel === channel.id ? FL_COLORS.ACCENT_BLUE : FL_COLORS.BORDER_DARK,
              boxShadow: selectedChannel === channel.id ? FL_SHADOWS.GLOW : 'none'
            }}
            onClick={() => setSelectedChannel(channel.id)}
          >
            {/* Channel Name */}
            <div className="text-xs truncate w-full text-center px-1 py-2 border-b" style={{ 
              color: FL_COLORS.TEXT_MUTED,
              borderColor: FL_COLORS.BORDER_DARK
            }}>
              {channel.name}
            </div>

            {/* Peak Meter */}
            <div className="flex-1 relative w-full py-2">
              <div className="absolute inset-x-0 top-0 bottom-0 rounded" style={{ backgroundColor: FL_COLORS.METER_BG }}>
                <div 
                  className="absolute bottom-0 left-0 right-0 rounded transition-all duration-100"
                  style={{ 
                    height: `${channel.volume * 100}%`,
                    background: `linear-gradient(to top, ${FL_COLORS.METER_GREEN}, ${FL_COLORS.METER_YELLOW}, ${FL_COLORS.METER_RED})`
                  }}
                />
              </div>
            </div>

            {/* Volume Fader */}
            <div className="w-full px-2 py-2">
              <div className="relative" style={{ height: '80px' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={channel.volume}
                  onChange={(e) => handleVolumeChange(channel.id, parseFloat(e.target.value))}
                  className="absolute w-16 h-1"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                    left: '-8px',
                    top: '40px',
                    accentColor: FL_COLORS.FADER_HANDLE
                  }}
                />
              </div>
              <div className="text-xs text-center" style={{ color: FL_COLORS.TEXT_MUTED }}>
                {Math.round(channel.volume * 100)}
              </div>
            </div>

            {/* Pan Control */}
            <div className="w-full px-2 pb-2">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={channel.pan}
                onChange={(e) => handlePanChange(channel.id, parseFloat(e.target.value))}
                className="w-full h-1"
                style={{ accentColor: FL_COLORS.ACCENT_GREEN }}
              />
              <div className="text-xs text-center" style={{ color: FL_COLORS.TEXT_MUTED }}>
                {channel.pan > 0 ? `R${Math.abs(Math.round(channel.pan * 10))}` : 
                 channel.pan < 0 ? `L${Math.abs(Math.round(channel.pan * 10))}` : 'C'}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-1 pb-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMuteToggle(channel.id);
                }}
                className="flex-1 px-1 py-1 text-xs rounded transition-colors"
                style={{
                  backgroundColor: channel.muted ? FL_COLORS.CHANNEL_MUTE : FL_COLORS.BUTTON_BG,
                  color: channel.muted ? FL_COLORS.TEXT_PRIMARY : FL_COLORS.TEXT_SECONDARY
                }}
                onMouseEnter={(e) => {
                  if (!channel.muted) {
                    e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
                    e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!channel.muted) {
                    e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_BG;
                    e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
                  }
                }}
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSoloToggle(channel.id);
                }}
                className="flex-1 px-1 py-1 text-xs rounded transition-colors"
                style={{
                  backgroundColor: channel.solo ? FL_COLORS.CHANNEL_SOLO : FL_COLORS.BUTTON_BG,
                  color: channel.solo ? FL_COLORS.TEXT_PRIMARY : FL_COLORS.TEXT_SECONDARY
                }}
                onMouseEnter={(e) => {
                  if (!channel.solo) {
                    e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
                    e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!channel.solo) {
                    e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_BG;
                    e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
                  }
                }}
              >
                S
              </button>
            </div>

            {/* FX Slot */}
            <div className="w-full px-1 pb-2">
              <button 
                className="w-full py-1 rounded text-xs transition-colors flex items-center justify-center gap-1"
                style={{
                  backgroundColor: FL_COLORS.BUTTON_BG,
                  color: FL_COLORS.TEXT_SECONDARY
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
                  e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_BG;
                  e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
                }}
              >
                <Zap className="w-3 h-3" />
                FX
              </button>
            </div>
          </div>
        ))}

        {/* Master Channel */}
        <div 
          className="flex flex-col items-center w-20 rounded-lg border-2"
          style={{
            background: `linear-gradient(to bottom, ${FL_COLORS.CHANNEL_BG}, ${FL_COLORS.PANEL_BG})`,
            borderColor: FL_COLORS.ACCENT_ORANGE,
            boxShadow: FL_SHADOWS.GLOW
          }}
        >
          <div className="text-xs truncate w-full text-center px-1 py-2 border-b font-bold" style={{ 
            color: FL_COLORS.ACCENT_ORANGE,
            borderColor: FL_COLORS.ACCENT_ORANGE + '50'
          }}>
            MASTER
          </div>

          {/* Master Peak Meter */}
          <div className="flex-1 relative w-full py-2">
            <div className="absolute inset-x-0 top-0 bottom-0 rounded" style={{ backgroundColor: FL_COLORS.METER_BG }}>
              <div 
                className="absolute bottom-0 left-0 right-0 rounded" 
                style={{ 
                  height: '80%',
                  background: `linear-gradient(to top, ${FL_COLORS.ACCENT_ORANGE}, ${FL_COLORS.METER_YELLOW}, ${FL_COLORS.METER_RED})`
                }} 
              />
            </div>
          </div>

          {/* Master Volume */}
          <div className="w-full px-2 py-2">
            <div className="relative" style={{ height: '80px' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="0.8"
                className="absolute w-16 h-1"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  left: '-8px',
                  top: '40px',
                  accentColor: FL_COLORS.ACCENT_ORANGE
                }}
              />
            </div>
            <div className="text-xs text-center font-bold" style={{ color: FL_COLORS.ACCENT_ORANGE }}>80</div>
          </div>

          {/* Master Controls */}
          <div className="w-full px-1 pb-2">
            <button 
              className="w-full py-1 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1"
              style={{
                backgroundColor: FL_COLORS.ACCENT_ORANGE,
                color: FL_COLORS.TEXT_PRIMARY
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = FL_COLORS.ACCENT_ORANGE + 'DD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = FL_COLORS.ACCENT_ORANGE;
              }}
            >
              <Headphones className="w-3 h-3" />
              OUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
