// --- Theme Configuration Types -----------------------------------------------
// Students provide structured config  NEVER raw CSS or JS

export type ThemeSource = 'SYSTEM' | 'STUDENT';

export type BgType = 'color' | 'gradient' | 'preset' | 'image';
export type GradientPreset =
  | 'sunset' | 'ocean' | 'purple' | 'midnight' | 'forest' | 'rose' | 'custom';
export type BgPreset =
  | 'default' | 'ocean' | 'space' | 'forest' | 'sunset' | 'midnight' | 'minimal' | 'kids' | 'teen' | 'adult'
  | 'cyberpunk' | 'matrix' | 'sunset_gold' | 'midnight_velvet';
export type ImagePosition = 'center' | 'top' | 'bottom';
export type ImageSize = 'cover' | 'contain';
export type ImageOverlay = 'none' | 'light' | 'dark' | 'soft';
export type BlurLevel = 'none' | 'subtle' | 'medium' | 'strong';

export type FontFamily = 'inter' | 'poppins' | 'nunito' | 'system';
export type SizeScale = 'small' | 'normal' | 'large';
export type FontWeight = 'normal' | 'medium' | 'bold';

export type ButtonStyle = 'rounded' | 'pill' | 'square' | 'soft' | 'glass';
export type ShadowLevel = 'none' | 'soft' | 'medium' | 'strong' | 'glow';
export type CardStyle = 'solid' | 'glass' | 'soft' | 'minimal' | 'elevated';
export type RadiusPreset = 'small' | 'medium' | 'large' | 'xl' | 'pill';
export type BorderStyle = 'none' | 'thin' | 'medium' | 'soft';
export type SpacingDensity = 'compact' | 'normal' | 'relaxed';
export type AnimationLevel = 'off' | 'subtle' | 'normal' | 'playful';
export type GlassLevel = 'off' | 'soft' | 'strong';
export type HoverEffect = 'minimal' | 'normal' | 'playful';

export type NavbarStyle = 'glass' | 'solid' | 'translucent' | 'floating' | 'minimal';
export type NavbarBorder = 'none' | 'thin' | 'glow';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeBackground {
  type: BgType;
  color: string;
  gradient: GradientPreset;
  preset: BgPreset;
  imageUrl?: string;
  imagePosition?: ImagePosition;
  imageSize?: ImageSize;
  overlay?: ImageOverlay;
  blur?: BlurLevel;
}

export interface ThemeTypography {
  fontFamily: FontFamily;
  sizeScale: SizeScale;
  weight: FontWeight;
}

export interface ThemeButtons {
  style: ButtonStyle;
  shadow: ShadowLevel;
  primaryBg?: string;
  textColor?: string;
  hoverScale?: 'minimal' | 'normal' | 'playful';
}

export interface ThemeCards {
  style: CardStyle;
  radius: RadiusPreset;
  shadow: ShadowLevel;
  blur?: BlurLevel;
}

export interface ThemeNavbar {
  style: NavbarStyle;
  blur: BlurLevel;
  border: NavbarBorder;
}

export interface ThemeBorders {
  style: BorderStyle;
  radius: RadiusPreset;
}

export interface ThemeSpacing {
  density: SpacingDensity;
}

export interface ThemeEffects {
  animations: AnimationLevel;
  glass: GlassLevel;
  hover: HoverEffect;
}

export interface ThemeConfig {
  colors: ThemeColors;
  background: ThemeBackground;
  typography: ThemeTypography;
  buttons: ThemeButtons;
  cards: ThemeCards;
  navbar?: ThemeNavbar;
  borders: ThemeBorders;
  shadows: ShadowLevel;
  spacing: ThemeSpacing;
  effects: ThemeEffects;
}

export interface StudentTheme {
  _id: string;
  studentId: string;
  name: string;
  config: ThemeConfig;
  isEquipped: boolean;
  source: ThemeSource;
  createdAt: string;
  updatedAt: string;
}

export interface StudentThemeContextValue {
  equippedTheme: StudentTheme | null;
  themes: StudentTheme[];
  loading: boolean;
  refresh: () => Promise<void>;
  equipTheme: (id: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export interface TeacherTheme {
  _id: string;
  teacherId: string;
  name: string;
  config: ThemeConfig;
  isEquipped: boolean;
  source: 'SYSTEM' | 'TEACHER';
  createdAt: string;
  updatedAt: string;
}

export interface TeacherThemeContextValue {
  equippedTheme: TeacherTheme | null;
  themes: TeacherTheme[];
  loading: boolean;
  refresh: () => Promise<void>;
  equipTheme: (id: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

