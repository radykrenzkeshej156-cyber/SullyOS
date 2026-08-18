import React, { useMemo, useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { isPaperWallpaper, useOS } from '../context/OSContext';
import { INSTALLED_APPS, DOCK_APPS } from '../constants';
import { isDevDebugAvailable, subscribeDevDebugAvailability } from '../utils/devDebug';
import AppIcon from '../components/os/AppIcon';
import { DB } from '../utils/db';
import { CharacterProfile, AppID, DailySchedule } from '../types';
import { ScheduleHomeWidget, ScheduleFullscreenViewer } from '../components/schedule/ScheduleHomeWidget';
import { getDailyScheduleForChar } from '../utils/dailySchedule';
import { useLocalDateKey } from '../hooks/useLocalDateKey';
import { resolveCharTimeZone } from '../utils/timezone';
import { trackEvent } from '../utils/analytics';

const CompanionHome = React.lazy(() => import('../components/os/CompanionHome'));

// --- App IDs for the new layout ---
const PAGE_1_APPS: AppID[] = [
    AppID.Character, AppID.User, AppID.Worldbook, AppID.MemoryPalace,
    AppID.Call, AppID.Date, AppID.Room, AppID.CheckPhone,
];

const PAGE_2_APPS: AppID[] = [
    AppID.GroupChat, AppID.Schedule, AppID.VRWorld, AppID.Study,
    AppID.Gallery, AppID.Music, AppID.ThemeMaker, AppID.Appearance,
    AppID.Novel, AppID.Guidebook, AppID.Game, AppID.SpecialMoments,
    AppID.FAQ,
];

// --- Isolated Components to prevent full re-renders ---\n\n// 1. Clock Component (Consumes virtualTime)
const DesktopClock = React.memo(() => {
    const { virtualTime, theme } = useOS();
    const contentColor = theme.contentColor || '#ffffff';
    const paper = theme.skin !== 'animalcrossing' && theme.skin !== 'mobilegame' && theme.skin !== 'tamagotchi' && isPaperWallpaper(theme.wallpaper);

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateNum = now.getDate().toString().padStart(2, '0');
    const yearNum = now.getFullYear();

    const greeting = virtualTime.hours < 5 ? 'Good Night'
        : virtualTime.hours < 12 ? 'Good Morning'
        : virtualTime.hours < 18 ? 'Good Afternoon'
        : 'Good Evening';

    const hh = virtualTime.hours.toString().padStart(2, '0');
    const mm = virtualTime.minutes.toString().padStart(2, '0');

    if (theme.skin === 'animalcrossing') {
        const weekdayTitle = dayName.charAt(0) + dayName.slice(1).toLowerCase();
        const monthTitle = monthName.charAt(0) + monthName.slice(1).toLowerCase();
        return (
            <div className="mt-7 mb-5 text-center animate-fade-in select-none">
                <div className="text-[13px] font-extrabold tracking-wide" style={{ color: '#8a7a5c' }}>
                    🍃 {greeting}, Resident
                </div>
                <div className="text-[3.5rem] font-extrabold leading-none mt-1.5 tracking-[2px]" style={{ color: '#8b7355' }}>
                    {hh}<span className="animate-pulse" style={{ color: '#cfcab2' }}>:</span>{mm}
                </div>
                <div className="text-[15px] font-bold mt-1.5" style={{ color: '#725C4E' }}>
                    {weekdayTitle} · {monthTitle} {Number(dateNum)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col mb-5 mt-5 relative animate-fade-in" style={{ color: contentColor }}>
            <div className="flex items-center gap-2 mb-3 opacity-90">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                        background: paper ? 'rgba(224,221,215,0.30)' : 'rgba(255,255,255,0.28)',
                        border: paper ? '1px solid rgba(91,72,51,0.07)' : '1px solid rgba(255,255,255,0.18)',
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: paper ? '#788369' : '#4ade80', boxShadow: paper ? 'none' : '0 0 6px #4ade80' }} />
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase">System Online</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-current to-transparent opacity-30" />
                <span className="text-[9px] tracking-[0.2em] uppercase opacity-60">{yearNum}</span>
            </div>
            <div className="text-[11px] tracking-[0.25em] uppercase opacity-55 font-semibold mb-1">
                {greeting}
            </div>
            <div className="flex items-end gap-4">
                <div className="relative">
                    <div className={`${paper ? 'text-[5.65rem] font-semibold tracking-[-0.055em] drop-shadow-[0_2px_0_rgba(255,255,255,0.34)]' : 'text-[6.25rem] font-black tracking-tighter drop-shadow-2xl'} leading-[0.84]`}
                        style={{ fontFamily: paper ? `'Iowan Old Style', 'Baskerville', 'Times New Roman', serif` : `'Space Grotesk', 'SF Pro Display', sans-serif`, fontFeatureSettings: '\"tnum\"' }}>
                        <span>{virtualTime.hours.toString().padStart(2, '0')}</span>
                        <span className="opacity-35 font-thin mx-0.5 animate-pulse">:</span>
                        <span>{virtualTime.minutes.toString().padStart(2, '0')}</span>
                    </div>
                    {!paper && <div className="absolute -top-2 -right-3 w-8 h-8 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)' }} />}
                </div>
                <div className="flex flex-col justify-end pb-2.5 gap-0.5">
                    <div className="text-[10px] font-bold tracking-[0.22em] opacity-85">{dayName}</div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-black leading-none" style={{ fontFamily: `'Space Grotesk', sans-serif` }}>{dateNum}</div>
                        <div className="text-[10px] font-bold tracking-[0.2em] opacity-70\">{monthName}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// 2. Character Widget
const CharacterWidget = React.memo(({
    char,
    unreadCount,
    lastMessage,
    onClick,
    contentColor,
    paper = false,
}: {
    char: CharacterProfile | null,
    unreadCount: number,
    lastMessage: string,
    onClick: () => void,
    contentColor: string,
    paper?: boolean,
}) => {
    const { theme } = useOS();
    const acnh = theme.skin === 'animalcrossing';

    if (acnh) {
        return (
            <div className="mb-4 animate-fade-in" onClick={onClick}>
                <div className="flex items-end gap-2.5 cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="relative w-[60px] h-[60px] shrink-0 rounded-[26%] overflow-hidden bg-[#e8e2d6]"
                        style={{ border: '3px solid #ffffff', boxShadow: '0 4px 10px -2px rgba(61,52,40,0.28)' }}>
                        {char?.avatar
                            ? <img src={char.avatar} className="w-full h-full object-cover" alt="char" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🍃</div>}
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#fc736d] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ border: '2px solid #fff' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </div>
                    <div className="relative flex-1 min-w-0 mb-1">
                        <div className="absolute -left-1.5 bottom-3 w-3 h-3 rotate-45"
                            style={{ background: '#FFFBF2', borderLeft: '2px solid #ece0c8', borderBottom: '2px solid #ece0c8' }} />
                        <div className="relative rounded-2xl px-3.5 py-2.5"
                            style={{ background: '#FFFBF2', border: '2px solid #ece0c8', boxShadow: '0 4px 12px -5px rgba(120,90,40,0.25)' }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[13px] font-extrabold truncate" style={{ color: '#725d42' }}>{char?.name || 'Resident'}</span>
                                <span className="text-[11px] leading-none">{unreadCount > 0 ? '💬' : '🍃'}</span>
                            </div>
                            <div className="text-[11px] leading-snug line-clamp-2" style={{ color: '#9f8b68' }}>{lastMessage}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-3 group animate-fade-in">
             <div
                className="relative h-24 w-full overflow-hidden rounded-3xl cursor-pointer transition-transform duration-300 active:scale-[0.98]"
                onClick={onClick}
                style={paper ? {
                    background: 'rgba(224,221,215,0.40)',
                    border: '1px solid rgba(91,72,51,0.07)',
                    boxShadow: '0 5px 16px rgba(91,72,51,0.055)',
                } : acnh ? {
                    background: 'rgb(247,243,223)',
                    border: '2px solid #e8e2d6',
                    boxShadow: '0 8px 24px 0 rgba(61,52,40,0.14)',
                } : {
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(24px) saturate(1.4)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
             >
                 {!acnh && !paper && char?.avatar && (
                     <div className="absolute inset-0 opacity-25 pointer-events-none"
                         style={{
                             backgroundImage: `url(${char.avatar})`,
                             backgroundSize: 'cover',
                             backgroundPosition: 'center',
                             filter: 'blur(30px) saturate(1.6)',
                             transform: 'scale(1.3)',
                         }} />
                 )}
                 <div className="relative flex items-center p-3 gap-3 h-full">
                     <div className={`w-[68px] h-[68px] shrink-0 rounded-2xl overflow-hidden relative ${paper ? 'bg-[#ded2c1]' : 'bg-slate-800'}`}
                         style={{
                             border: paper ? '1px solid rgba(91,72,51,0.14)' : acnh ? '2px solid #e8e2d6' : '1.5px solid rgba(255,255,255,0.25)',
                             boxShadow: paper ? '0 5px 14px rgba(91,72,51,0.13)' : acnh ? '0 4px 12px -4px rgba(61,52,40,0.25)' : '0 4px 14px rgba(0,0,0,0.25)',
                         }}>
                         {char ? (
                             <img src={char.avatar} className="w-full h-full object-cover" alt="char" loading="lazy" />
                         ) : <div className="w-full h-full bg-white/10 animate-pulse" />}
                         {unreadCount > 0 ? (
                            <div className="absolute bottom-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-red-500 rounded-full border border-white/30 shadow-sm flex items-center justify-center text-[9px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                         ) : (
                            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white/60" style={{ background: paper ? '#788369' : '#4ade80', boxShadow: paper ? 'none' : '0 0 6px #4ade80' }}></div>
                         )}
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-center gap-1" style={{ color: contentColor }}>
                         <div className="flex items-center gap-1.5">
                             <h3 className={`text-[15px] font-bold tracking-wide truncate ${paper ? '' : 'drop-shadow-md'}`}>{char?.name || 'NO SIGNAL'}</h3>
                             {unreadCount > 0 ? (
                                 <div className="px-1.5 py-px rounded-full text-[8px] font-bold uppercase tracking-[0.15em]"
                                     style={{ background: 'rgba(239,68,68,0.9)', color: 'white' }}>NEW</div>
                             ) : (
                                 <div className="px-1.5 py-px rounded-full text-[8px] font-bold uppercase tracking-[0.15em]"
                                     style={paper ? { background: 'rgba(120,131,105,0.16)', color: '#68725b' } : acnh ? { background: '#7cba4c', color: 'white' } : { background: 'rgba(255,255,255,0.18)' }}>Online</div>
                             )}
                         </div>
                         <div className="text-xs font-medium leading-relaxed opacity-85 flex items-start gap-1.5">
                            <span aria-hidden="true" className="shrink-0 mt-[0.42em] opacity-45" style={{ width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: '4px solid currentColor' }} />
                            <span className="line-clamp-2">{lastMessage}</span>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
});

// 3. Grid Page Component
const AppGridPage = React.memo(({
    apps,
    openApp,
    acnh = false,
    editing = false,
    className = '',
}: {
    apps: typeof INSTALLED_APPS,
    openApp: (id: AppID) => void,
    acnh?: boolean,
    editing?: boolean,
    className?: string,
}) => {
    return (
        <div className={`grid place-items-center animate-fade-in relative ${acnh ? 'grid-cols-4 gap-y-6 gap-x-2' : 'grid-cols-4 gap-y-6 gap-x-2'} ${className}`}>
             {apps.map(app => (
                 <div
                    key={app.id}
                    data-launcher-item={app.id}
                    data-launcher-kind="app"
                    className={`relative transition-transform duration-200 active:scale-95 ${editing ? 'launcher-edit-item' : ''}`}
                 >
                     <AppIcon app={app} onClick={() => { if (!editing) openApp(app.id); }} size="md" />
                 </div>
             ))}
        </div>
    );
});

// --- Persist scroll page across remounts ---
let _lastPageIndex = 0;

// --- Main Launcher ---
const Launcher: React.FC = () => {
  const { openApp, characters, activeCharacterId, theme, updateTheme, lastMsgTimestamp, isDataLoaded, unreadMessages } = useOS();

  const [widgetChar, setWidgetChar] = useState<CharacterProfile | null>(null);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<DailySchedule | null>(null);
  const [scheduleCharId, setScheduleCharId] = useState<string | null>(null);
  const [scheduleViewerOpen, setScheduleViewerOpen] = useState(false);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const layoutPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutPointer = useRef<{
      pointerId: number;
      key: string;
      kind: string;
      x: number;
      y: number;
      active: boolean;
      element: HTMLElement;
      ghost?: HTMLElement;
      grabOffsetX?: number;
      grabOffsetY?: number;
      lastTarget?: string;
      targetElement?: HTMLElement;
  } | null>(null);
  const suppressLayoutClickUntil = useRef(0);

  const [activePageIndex, setActivePageIndex] = useState(_lastPageIndex);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragMoved = useRef(0);

  const [devDebugVisible, setDevDebugVisible] = useState(() => isDevDebugAvailable());
  useEffect(() => subscribeDevDebugAvailability(setDevDebugVisible), []);

  const normalizeOrder = useCallback((saved: string[] | undefined, available: string[]) => {
      const valid = new Set(available);
      return [...(saved || []).filter((id, index, all) => valid.has(id) && all.indexOf(id) === index), ...available.filter(id => !(saved || []).includes(id))];
  }, []);

  const [launcherDockOrder, setLauncherDockOrder] = useState<string[]>(() => normalizeOrder(theme.launcherDockOrder, DOCK_APPS));
  const launcherDockOrderRef = useRef(launcherDockOrder);
  
  // App configurations for the two pages
  const page1AppConfigs = useMemo(() => {
    const byId = new Map(INSTALLED_APPS.map(app => [app.id, app]));
    return PAGE_1_APPS.map(id => byId.get(id)).filter(Boolean) as typeof INSTALLED_APPS;
  }, []);

  const page2AppConfigs = useMemo(() => {
    const byId = new Map(INSTALLED_APPS.map(app => [app.id, app]));
    return PAGE_2_APPS.map(id => byId.get(id)).filter(Boolean) as typeof INSTALLED_APPS;
  }, []);

  const dockAppsConfig = useMemo(() => {
      const byId = new Map(INSTALLED_APPS.map(app => [app.id, app]));
      return launcherDockOrder.map(id => byId.get(id as AppID)).filter(Boolean) as typeof INSTALLED_APPS;
  }, [launcherDockOrder]);

  const totalPages = 2;

  useEffect(() => {
      const loadData = async () => {
          if (!characters || characters.length === 0) {
              setWidgetChar(null);
              setLastMessage('No Character Connected');
              return;
          }
          const targetChar = characters.find(c => c.id === activeCharacterId) || characters[0];
          setWidgetChar(targetChar);
          try {
              const msgs = await DB.getMessagesByCharId(targetChar.id);
              if (msgs.length > 0) {
                  const visibleMsgs = msgs.filter(m => m.role !== 'system');
                  if (visibleMsgs.length > 0) {
                      const last = visibleMsgs[visibleMsgs.length - 1];
                      const cleanContent = last.content.replace(/\\[.*?\\]/g, '').trim();
                      setLastMessage(cleanContent || (last.type === 'image' ? '[图片]' : '[消息]'));
                  } else {
                      setLastMessage(targetChar.description || "System Ready.");
                  }
              } else {
                  setLastMessage(targetChar.description || "System Ready.");
              }
          } catch (e) {
              console.error(e);
          }
      };
      if (isDataLoaded) loadData();
  }, [activeCharacterId, lastMsgTimestamp, isDataLoaded, characters]);

  const scheduleChar = useMemo(() => {
      if (!characters || characters.length === 0) return null;
      if (scheduleCharId) return characters.find(c => c.id === scheduleCharId) || characters[0];
      return characters.find(c => c.id === activeCharacterId) || characters[0];
  }, [characters, scheduleCharId, activeCharacterId]);
  const scheduleDateKey = useLocalDateKey(resolveCharTimeZone(scheduleChar));

  useEffect(() => {
      if (!scheduleChar || !isDataLoaded) return;
      getDailyScheduleForChar(scheduleChar).then(s => setScheduleData(s)).catch(() => {});
  }, [scheduleChar, isDataLoaded, scheduleDateKey]);

  useLayoutEffect(() => {
      const el = scrollContainerRef.current;
      if (el && _lastPageIndex > 0) {
          el.style.scrollBehavior = 'auto';
          el.scrollLeft = el.clientWidth * _lastPageIndex;
          requestAnimationFrame(() => { el.style.scrollBehavior = 'smooth'; });
      }
  }, []);

  const handleScroll = () => {
      if (scrollContainerRef.current) {
          const width = scrollContainerRef.current.clientWidth;
          const scrollLeft = scrollContainerRef.current.scrollLeft;
          const index = Math.round(scrollLeft / width);
          setActivePageIndex(index);
          _lastPageIndex = index;
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!scrollContainerRef.current || layoutEditing) return;
      isDragging.current = true;
      dragMoved.current = 0;
      startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
      scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.style.scrollBehavior = 'auto';
      scrollContainerRef.current.style.scrollSnapType = 'none';
      scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (layoutEditing || !isDragging.current || !scrollContainerRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollContainerRef.current.offsetLeft;
      const walk = (x - startX.current);
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
      dragMoved.current = Math.abs(x - (startX.current + scrollContainerRef.current.offsetLeft));
  };

  const handleMouseUp = () => {
      if (!isDragging.current || !scrollContainerRef.current) return;
      isDragging.current = false;
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
      scrollContainerRef.current.style.scrollSnapType = 'x mandatory';
      scrollContainerRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => { if (isDragging.current) handleMouseUp(); };
  const handleClickCapture = (e: React.MouseEvent) => {
      if (dragMoved.current > 5 || Date.now() < suppressLayoutClickUntil.current) {
          e.stopPropagation();
          e.preventDefault();
      }
  };

  const contentColor = theme.contentColor || '#ffffff';
  const acnh = theme.skin === 'animalcrossing';
  const paper = theme.skin !== 'animalcrossing' && theme.skin !== 'mobilegame' && theme.skin !== 'tamagotchi' && isPaperWallpaper(theme.wallpaper);
  const launcherBottomInset = '1.25rem';
  const totalUnread = Object.values(unreadMessages).reduce((a, b) => a + b, 0);
  const widgetUnread = widgetChar && unreadMessages[widgetChar.id] ? unreadMessages[widgetChar.id] : 0;
  
  // Special full-screen themes
  if (theme.skin === 'mobilegame') return <MobileGameHome />;
  if (theme.skin === 'tamagotchi') return <TamagotchiHome />;
  if (theme.skin === 'companion') {
    return (
      <React.Suspense fallback={<div className="h-full w-full bg-[#100d1c]" />}>
        <CompanionHome />
      </React.Suspense>
    );
  }

  // Default Launcher UI
  return (
    <div
      className="h-full w-full flex flex-col relative z-10 overflow-hidden font-sans select-none"
      onContextMenu={(e) => { if ((e.target as HTMLElement).closest('[data-launcher-item]')) e.preventDefault(); }}
    >
      {!acnh && (
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full" style={{ background: paper ? 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 68%)' : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }}></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full" style={{ background: paper ? 'radial-gradient(circle, rgba(123,104,78,0.06) 0%, transparent 68%)' : 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }}></div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
        style={{
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'none',
            touchAction: 'pan-x pan-y',
            willChange: 'scroll-position',
            contain: 'layout paint',
            transform: 'translateZ(0)',
            WebkitOverflowScrolling: 'touch',
        }}
      >
          {/* Page 1: Clock, Character Widget, and bottom apps */}
          <div
            className="w-full flex-shrink-0 snap-center snap-always flex flex-col px-6 pt-12 pb-8 h-full"
            style={{ contentVisibility: 'auto', contain: 'layout paint', transform: 'translateZ(0)' }}
          >
            <DesktopClock />
            <CharacterWidget
                char={widgetChar}
                unreadCount={widgetUnread}
                lastMessage={lastMessage}
                onClick={() => openApp(AppID.Chat)}
                contentColor={contentColor}
                paper={paper}
            />
            <div className="flex-1" />
            <AppGridPage apps={page1AppConfigs} openApp={openApp} acnh={acnh} editing={layoutEditing} />
          </div>

          {/* Page 2: Schedule Widget and all other apps */}
          <div
            className="w-full flex-shrink-0 snap-center snap-always flex flex-col px-6 pt-12 pb-8 h-full"
            style={{ contentVisibility: 'auto', contain: 'layout paint', transform: 'translateZ(0)' }}
          >
              <div className="flex-1 min-h-0 w-full flex flex-col gap-5 justify-center">
                  {scheduleChar && (
                      <ScheduleHomeWidget
                          schedule={scheduleData}
                          character={scheduleChar}
                          contentColor={contentColor}
                          onOpen={() => { setScheduleViewerOpen(true); trackEvent('打开角色日程面板'); }}
                          acnh={acnh}
                          paper={paper}
                      />
                  )}
                  <AppGridPage apps={page2AppConfigs} openApp={openApp} acnh={acnh} editing={layoutEditing} />
              </div>
          </div>
      </div>

      <div
          className="absolute left-0 w-full flex justify-center gap-1 pointer-events-none z-20"
          style={{ bottom: `calc(${launcherBottomInset} + 5.5rem)` }}
          aria-hidden="true"
      >
          {Array.from({ length: totalPages }).map((_, i) => (
              <div key={i} className="flex h-1.5 w-4 shrink-0 items-center justify-center">
                  <div
                    className={`h-1.5 rounded-full transform-gpu transition-[width,opacity] duration-300 ${activePageIndex === i ? 'w-4 opacity-100' : 'w-1.5 opacity-40'}`}
                    style={{ backgroundColor: contentColor }}
                  />
              </div>
          ))}
      </div>

      <div
           className="mt-auto flex justify-center w-full px-4 relative z-30"
           style={{ paddingBottom: launcherBottomInset }}
      >
           <div
             className={`rounded-[1.75rem] px-4 py-3 flex gap-3 sm:gap-6 items-center mx-auto max-w-full justify-between overflow-x-auto no-scrollbar transform-gpu ${acnh || paper ? '' : 'bg-white/30 border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]'}`}
             style={acnh ? { background: 'transparent' } : paper ? {
               background: 'rgba(224,221,215,0.42)',
               border: '1px solid rgba(91,72,51,0.07)',
               boxShadow: '0 6px 18px rgba(91,72,51,0.065)',
             } : undefined}
           >
               {dockAppsConfig.map(app => (
                   <div key={app.id} data-launcher-item={app.id} data-launcher-kind="dock" className={`relative ${layoutEditing ? 'launcher-edit-item' : ''}`}>
                        <AppIcon app={app} onClick={() => { if (!layoutEditing) openApp(app.id); }} variant="dock" size="md" />
                        {app.id === 'chat' && totalUnread > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center border-2 border-white/20 shadow-sm font-bold pointer-events-none animate-pop-in">
                                {totalUnread > 9 ? '9+' : totalUnread}
                            </div>
                        )}
                   </div>
               ))}
           </div>
      </div>

      <ScheduleFullscreenViewer
          open={scheduleViewerOpen}
          onClose={() => setScheduleViewerOpen(false)}
          characters={characters}
          activeCharId={scheduleChar?.id || null}
          onSwitchCharacter={(id) => setScheduleCharId(id)}
          schedule={scheduleData}
          activeCharacter={scheduleChar}
          contentColor={contentColor}
      />
    </div>
  );
};

export default Launcher;
