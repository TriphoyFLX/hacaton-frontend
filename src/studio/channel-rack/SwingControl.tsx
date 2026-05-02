import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Gauge } from 'lucide-react';

export function SwingControl() {
  const { ui, setSwing } = useStudioStore();
  const [swing, setLocalSwing] = useState(ui.swing || 0);

  const handleSwingChange = (value: number) => {
    setLocalSwing(value);
    setSwing(value);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
      <Gauge className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-300 font-medium">Swing</span>
      <input
        type="range"
        min={0}
        max={100}
        value={swing}
        onChange={(e) => handleSwingChange(parseInt(e.target.value))}
        className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
      <span className="text-xs text-gray-400 font-mono w-10 text-right">{swing}%</span>
    </div>
  );
}
