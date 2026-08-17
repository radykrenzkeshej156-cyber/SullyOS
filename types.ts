
export enum AppID {
  Launcher = 'launcher',
  Settings = 'settings',
  Character = 'character',
  Chat = 'chat',
  GroupChat = 'group_chat', 
  Gallery = 'gallery',
  Music = 'music',
  Browser = 'browser',
  ThemeMaker = 'thememaker',
  Appearance = 'appearance',
  Date = 'date',
  User = 'user',
  Journal = 'journal',
  Schedule = 'schedule',
  Room = 'room',
  CheckPhone = 'check_phone',
  Social = 'social',
  Study = 'study',
  FAQ = 'faq',
  Game = 'game',
  Worldbook = 'worldbook', 
  Novel = 'novel',
  SpecialMoments = 'special_moments', // Valentine's Day & future events
  Call = 'call', // 语音电话测试（MiniMax TTS）
  VoiceDesigner = 'voice_designer', // 捏声音 — MiniMax 音色设计器
  Guidebook = 'guidebook', // 攻略本 — 角色攻略用户小游戏
  LifeSim = 'lifesim', // 模拟人生 — 与角色共同经营的小世界
  MemoryPalace = 'memory_palace', // 记忆宫殿 — 七个房间可视化
  Handbook = 'handbook', // 手账 — 跨角色聚合的生活留痕本（LLM 代笔 + 角色生活流陪伴）
  QQBridge = 'qq_bridge', // QQ 桥接 — 通过 NapCat 把 QQ 私聊接入当前角色，共享 IndexedDB 上下文
  VRWorld = 'vrworld', // 彼方 — 角色自主登入的虚拟世界（定时驱动，房间里看小说/听歌/留言，产出活动卡注入聊天+记忆）
  CharCreatorDev = 'char_creator_dev', // 捏脸系统开发模式 — 仅开发模式可见，向捏人器指定类目追加自定义部件
}

export interface SystemLog {
    id: string;
    timestamp: number;
    type: 'error' | 'network' | 'system';
    source: string;
    message: string;
    detail?: string;
}

export interface AppConfig {
  id: AppID;
  name: string;
  icon: string;
  color: string;
}

export interface DesktopDecoration {
  id: string;
  type: 'image' | 'preset';
  content: string; // data URI for image, SVG data URI or emoji for preset
  x: number;       // percentage 0-100
  y: number;       // percentage 0-100
  scale: number;   // multiplier (0.2 - 3)
  rotation: number; // degrees (-180 to 180)
  opacity: number;  // 0-1
  zIndex: number;
  flip?: boolean;
}
