import React from 'react';
import { MessageSquare, Wand2, Settings } from 'lucide-react';

interface BottomNavBarProps {
  selectedTab: number;
  onSelectTab: (tab: number) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  selectedTab,
  onSelectTab
}) => {
  return (
    <nav
      data-testid="bottom_nav_bar"
      className="bg-[#121824] border-t border-[#2d3748] px-6 py-2 flex items-center justify-around shrink-0 z-40"
    >
      {/* Tab 0: Chat */}
      <button
        type="button"
        onClick={() => onSelectTab(0)}
        data-testid="nav_tab_chat"
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
          selectedTab === 0
            ? 'text-[#00e5ff] bg-[#00e5ff]/10 font-bold scale-105'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[11px]">Czat AI</span>
      </button>

      {/* Tab 1: Routines */}
      <button
        type="button"
        onClick={() => onSelectTab(1)}
        data-testid="nav_tab_routines"
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
          selectedTab === 1
            ? 'text-[#8b5cf6] bg-[#8b5cf6]/10 font-bold scale-105'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Wand2 className="w-5 h-5" />
        <span className="text-[11px]">Rutyny</span>
      </button>

      {/* Tab 2: Settings */}
      <button
        type="button"
        onClick={() => onSelectTab(2)}
        data-testid="nav_tab_settings"
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
          selectedTab === 2
            ? 'text-[#00e5ff] bg-[#00e5ff]/10 font-bold scale-105'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[11px]">Ustawienia</span>
      </button>
    </nav>
  );
};
