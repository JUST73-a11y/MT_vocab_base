import type { ThemeConfig, ImagePosition, ImageSize, ImageOverlay, BlurLevel, NavbarStyle, NavbarBorder } from './themeTypes';
import { DEFAULT_THEME_CONFIG } from './themeDefaults';

// --- Validation helpers -------------------------------------------------------

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const RGBA_RE = /^rgba?\(/;

function isValidColor(v: string): boolean {
  return HEX_RE.test(v) || RGBA_RE.test(v);
}

function safeColor(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  return isValidColor(val) ? val : fallback;
}

function safeEnum<T extends string>(val: unknown, allowed: T[], fallback: T): T {
  if (typeof val === 'string' && allowed.includes(val as T)) return val as T;
  return fallback;
}

const BLUR_MAP: Record<string, string> = {
  none:   'none',
  subtle: 'blur(6px)',
  medium: 'blur(14px)',
  strong: 'blur(26px)',
};

const CARD_BLUR_MAP: Record<string, string> = {
  none:   'none',
  subtle: 'blur(12px)',
  medium: 'blur(24px)',
  strong: 'blur(40px)',
};

const NAV_BG_MAP: Record<string, string> = {
  glass:       'rgba(10, 18, 35, 0.65)',
  solid:       'rgba(10, 15, 28, 0.95)',
  translucent: 'rgba(0, 0, 0, 0.35)',
  floating:    'rgba(15, 20, 35, 0.70)',
  minimal:     'transparent',
};

const NAV_BORDER_MAP: Record<string, string> = {
  none: '1px solid transparent',
  thin: '1px solid rgba(255, 255, 255, 0.10)',
  glow: '1px solid var(--theme-primary, #6366f1)',
};

const NAV_BLUR_MAP: Record<string, string> = {
  none:   'none',
  subtle: 'blur(10px)',
  medium: 'blur(20px)',
  strong: 'blur(36px)',
};

// --- Config Validator / Sanitizer --------------------------------------------
// Never crashes — always returns a valid config

export function sanitizeThemeConfig(raw: unknown): ThemeConfig {
  const d = DEFAULT_THEME_CONFIG;
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const c = r.colors ?? {};
  const bg = r.background ?? {};
  const ty = r.typography ?? {};
  const bu = r.buttons ?? {};
  const ca = r.cards ?? {};
  const nv = r.navbar ?? {};
  const bo = r.borders ?? {};
  const sp = r.spacing ?? {};
  const ef = r.effects ?? {};

  return {
    colors: {
      primary:    safeColor(c.primary,    d.colors.primary),
      secondary:  safeColor(c.secondary,  d.colors.secondary),
      accent:     safeColor(c.accent,     d.colors.accent),
      background: safeColor(c.background, d.colors.background),
      surface:    safeColor(c.surface,    d.colors.surface),
      card:       safeColor(c.card,       d.colors.card),
      text:       safeColor(c.text,       d.colors.text),
      textMuted:  safeColor(c.textMuted,  d.colors.textMuted),
      border:     safeColor(c.border,     d.colors.border),
      success:    safeColor(c.success,    d.colors.success),
      warning:    safeColor(c.warning,    d.colors.warning),
      danger:     safeColor(c.danger,     d.colors.danger),
    },
    background: {
      type:          safeEnum(bg.type,          ['color','gradient','preset','image'],                             d.background.type),
      color:         safeColor(bg.color,        d.background.color),
      gradient:      safeEnum(bg.gradient,      ['sunset','ocean','purple','midnight','forest','rose','custom'],   d.background.gradient),
      preset:        safeEnum(bg.preset,        ['default','ocean','space','forest','sunset','midnight','minimal'], d.background.preset),
      imageUrl:      typeof bg.imageUrl === 'string' && bg.imageUrl.trim() ? bg.imageUrl.trim() : undefined,
      imagePosition: safeEnum<ImagePosition>(bg.imagePosition, ['center','top','bottom'], 'center'),
      imageSize:     safeEnum<ImageSize>(bg.imageSize,         ['cover','contain'],        'cover'),
      overlay:       safeEnum<ImageOverlay>(bg.overlay,       ['none','light','dark','soft'], 'soft'),
      blur:          safeEnum<BlurLevel>(bg.blur,             ['none','subtle','medium','strong'], 'none'),
    },
    typography: {
      fontFamily: safeEnum(ty.fontFamily, ['inter','poppins','nunito','system'], d.typography.fontFamily),
      sizeScale:  safeEnum(ty.sizeScale,  ['small','normal','large'],            d.typography.sizeScale),
      weight:     safeEnum(ty.weight,     ['normal','medium','bold'],            d.typography.weight),
    },
    buttons: {
      style:      safeEnum(bu.style,      ['rounded','pill','square','soft','glass'], d.buttons.style),
      shadow:     safeEnum(bu.shadow,     ['none','soft','medium','strong','glow'],   d.buttons.shadow),
      primaryBg:  bu.primaryBg ? safeColor(bu.primaryBg, c.primary || d.colors.primary) : undefined,
      textColor:  bu.textColor ? safeColor(bu.textColor, '#ffffff') : undefined,
      hoverScale: safeEnum<'minimal' | 'normal' | 'playful'>(bu.hoverScale, ['minimal','normal','playful'], 'normal'),
    },
    cards: {
      style:  safeEnum(ca.style,  ['solid','glass','soft','minimal','elevated'], d.cards.style),
      radius: safeEnum(ca.radius, ['small','medium','large','xl','pill'],         d.cards.radius),
      shadow: safeEnum(ca.shadow, ['none','soft','medium','strong','glow'],       d.cards.shadow),
      blur:   safeEnum<BlurLevel>(ca.blur, ['none','subtle','medium','strong'],   'subtle'),
    },
    navbar: {
      style:  safeEnum<NavbarStyle>(nv.style,  ['glass','solid','translucent','floating','minimal'], d.navbar?.style || 'glass'),
      blur:   safeEnum<BlurLevel>(nv.blur,     ['none','subtle','medium','strong'],                   d.navbar?.blur || 'medium'),
      border: safeEnum<NavbarBorder>(nv.border, ['none','thin','glow'],                               d.navbar?.border || 'thin'),
    },
    borders: {
      style:  safeEnum(bo.style,  ['none','thin','medium','soft'],       d.borders.style),
      radius: safeEnum(bo.radius, ['small','medium','large','xl','pill'], d.borders.radius),
    },
    shadows: safeEnum(r.shadows, ['none','soft','medium','strong','glow'], d.shadows),
    spacing: {
      density: safeEnum(sp.density, ['compact','normal','relaxed'], d.spacing.density),
    },
    effects: {
      animations: safeEnum(ef.animations, ['off','subtle','normal','playful'], d.effects.animations),
      glass:      safeEnum(ef.glass,      ['off','soft','strong'],             d.effects.glass),
      hover:      safeEnum(ef.hover,      ['minimal','normal','playful'],      d.effects.hover),
    },
  };
}

// --- CSS Variable Maps --------------------------------------------------------

const FONT_MAP: Record<string, string> = {
  inter:   "'Inter', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  nunito:  "'Nunito', system-ui, sans-serif",
  system:  "system-ui, -apple-system, sans-serif",
};

const SIZE_SCALE_MAP: Record<string, string> = {
  small:  '14px',
  normal: '16px',
  large:  '18px',
};

const RADIUS_MAP: Record<string, string> = {
  small:  '6px',
  medium: '12px',
  large:  '16px',
  xl:     '24px',
  pill:   '9999px',
};

const BTN_RADIUS_MAP: Record<string, string> = {
  rounded: '12px',
  pill:    '9999px',
  square:  '4px',
  soft:    '8px',
  glass:   '12px',
};

const SHADOW_MAP: Record<string, string> = {
  none:   'none',
  soft:   '0 2px 12px rgba(0,0,0,0.3)',
  medium: '0 4px 24px rgba(0,0,0,0.5)',
  strong: '0 8px 40px rgba(0,0,0,0.7)',
  glow:   '0 0 20px var(--theme-primary, #6366f1)',
};

const CARD_BG_MAP: Record<string, string> = {
  solid:    'rgba(15, 20, 35, 0.75)',
  glass:    'rgba(15, 20, 35, 0.45)',
  soft:     'rgba(20, 25, 45, 0.55)',
  minimal:  'rgba(10, 15, 25, 0.30)',
  elevated: 'rgba(25, 30, 55, 0.80)',
};

const CARD_BORDER_MAP: Record<string, string> = {
  solid:    'rgba(255,255,255,0.12)',
  glass:    'rgba(255,255,255,0.15)',
  soft:     'rgba(255,255,255,0.14)',
  minimal:  'rgba(255,255,255,0.08)',
  elevated: 'rgba(255,255,255,0.20)',
};

const SPACE_DENSITY_MAP: Record<string, { base: string; card: string; section: string }> = {
  compact: { base: '4px', card: '16px',  section: '24px' },
  normal:  { base: '8px', card: '24px',  section: '32px' },
  relaxed: { base: '8px', card: '32px',  section: '48px' },
};

const BORDER_STYLE_MAP: Record<string, string> = {
  none:   '0px',
  thin:   '1px',
  medium: '1.5px',
  soft:   '1px',
};

const GLASS_MAP: Record<string, string> = {
  off:    'none',
  soft:   'blur(16px)',
  strong: 'blur(32px)',
};

const BG_GRADIENT_MAP: Record<string, string> = {
  sunset:   'linear-gradient(135deg, #1a0005 0%, #2a0a00 50%, #1a0010 100%)',
  ocean:    'linear-gradient(135deg, #000d1a 0%, #001a2e 60%, #000d1a 100%)',
  purple:   'linear-gradient(135deg, #030014 0%, #0a0025 60%, #030014 100%)',
  midnight: 'linear-gradient(180deg, #000000 0%, #050505 100%)',
  forest:   'linear-gradient(135deg, #021008 0%, #041a0e 60%, #021008 100%)',
  rose:     'linear-gradient(135deg, #140010 0%, #1f0018 60%, #140010 100%)',
  custom:   '',
};

const BG_PRESET_OVERLAY_MAP: Record<string, string> = {
  default:         `radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.10) 0, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(168,85,247,0.09) 0, transparent 55%)`,
  ocean:           `radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.15) 0, transparent 60%)`,
  space:           `radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.15) 0, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.10) 0, transparent 50%)`,
  forest:          `radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.12) 0, transparent 60%)`,
  sunset:          `radial-gradient(ellipse at 100% 0%, rgba(249,115,22,0.20) 0, transparent 60%)`,
  midnight:        `none`,
  minimal:         `none`,
  cyberpunk:       `radial-gradient(ellipse at 20% 0%, rgba(0,240,255,0.20) 0, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.22) 0, transparent 60%)`,
  matrix:          `radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.22) 0, transparent 65%), radial-gradient(ellipse at 50% 100%, rgba(0,255,157,0.12) 0, transparent 50%)`,
  sunset_gold:     `radial-gradient(ellipse at 80% 0%, rgba(245,158,11,0.25) 0, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(255,107,0,0.18) 0, transparent 55%)`,
  midnight_velvet: `radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(129,140,248,0.10) 0, transparent 50%)`,
};

// --- Main Engine: Config > CSS Variable String --------------------------------

export function buildThemeCSSVars(config: ThemeConfig): string {
  const c = config;
  const spaceDensity = SPACE_DENSITY_MAP[c.spacing.density] || SPACE_DENSITY_MAP.normal;

  // Background
  let bgImage = 'none';
  let bgColor = c.colors.background;
  let bgOverlayGradient = 'none';
  let bgOverlayColor = 'transparent';
  let bgPos = 'center';
  let bgSize = 'cover';

  if (c.background.type === 'color') {
    bgColor = c.background.color;
    bgOverlayGradient = BG_PRESET_OVERLAY_MAP[c.background.preset] || BG_PRESET_OVERLAY_MAP.default;
  } else if (c.background.type === 'gradient') {
    bgImage = BG_GRADIENT_MAP[c.background.gradient] || 'none';
    bgColor = c.colors.background;
    bgOverlayGradient = BG_PRESET_OVERLAY_MAP[c.background.preset] || BG_PRESET_OVERLAY_MAP.default;
  } else if (c.background.type === 'image' && c.background.imageUrl) {
    bgImage = `url(${c.background.imageUrl})`;
    bgPos = c.background.imagePosition || 'center';
    bgSize = c.background.imageSize || 'cover';
    const overlayMap: Record<string, string> = {
      none: 'transparent',
      light: 'rgba(0,0,0,0.25)',
      dark: 'rgba(5,10,25,0.70)',
      soft: 'rgba(5,10,25,0.45)',
    };
    bgOverlayColor = overlayMap[c.background.overlay || 'soft'] || 'rgba(5,10,25,0.45)';
  } else {
    bgColor = c.colors.background;
    bgOverlayGradient = BG_PRESET_OVERLAY_MAP[c.background.preset] || BG_PRESET_OVERLAY_MAP.default;
  }

  const vars: Record<string, string> = {
    // -- Colors
    '--theme-primary':          c.colors.primary,
    '--theme-secondary':        c.colors.secondary,
    '--theme-accent':           c.colors.accent,
    '--theme-background':       c.colors.background,
    '--theme-surface':          c.colors.surface,
    '--theme-card':             c.colors.card,
    '--theme-text':             c.colors.text,
    '--theme-text-muted':       c.colors.textMuted,
    '--theme-border':           c.colors.border,
    '--theme-success':          c.colors.success,
    '--theme-warning':          c.colors.warning,
    '--theme-danger':           c.colors.danger,

    // -- Background
    '--theme-bg-value':         bgImage !== 'none' ? bgImage : bgColor,
    '--theme-bg-image':         bgImage,
    '--theme-bg-color':         bgColor,
    '--theme-bg-pos':           bgPos,
    '--theme-bg-size':          bgSize,
    '--theme-bg-overlay':       bgOverlayGradient,
    '--theme-bg-overlay-color': bgOverlayColor,
    '--theme-bg-blur':          BLUR_MAP[c.background.blur || 'none'] || 'none',

    // -- Typography
    '--theme-font-family':      FONT_MAP[c.typography.fontFamily] || FONT_MAP.inter,
    '--theme-font-size':        SIZE_SCALE_MAP[c.typography.sizeScale] || '16px',

    // -- Radius
    '--theme-radius-btn':       BTN_RADIUS_MAP[c.buttons.style] || '12px',
    '--theme-radius-card':      RADIUS_MAP[c.cards.radius] || '16px',
    '--theme-radius-border':    RADIUS_MAP[c.borders.radius] || '16px',

    // -- Shadows
    '--theme-shadow-global':    SHADOW_MAP[c.shadows] || SHADOW_MAP.soft,
    '--theme-shadow-btn':       SHADOW_MAP[c.buttons.shadow] || SHADOW_MAP.soft,
    '--theme-shadow-card':      SHADOW_MAP[c.cards.shadow] || SHADOW_MAP.soft,

    // -- Buttons styles & colors
    '--theme-btn-bg':           c.buttons?.primaryBg || c.colors.primary,
    '--theme-btn-text':         c.buttons?.textColor || '#ffffff',
    '--theme-btn-radius':       BTN_RADIUS_MAP[c.buttons.style] || '12px',
    '--theme-btn-shadow':       SHADOW_MAP[c.buttons.shadow] || SHADOW_MAP.soft,
    '--theme-btn-hover-scale':  c.buttons?.hoverScale === 'minimal' ? '1.01' : c.buttons?.hoverScale === 'playful' ? '1.06' : '1.03',

    // -- Card styles
    '--theme-card-bg':          CARD_BG_MAP[c.cards.style] || CARD_BG_MAP.glass,
    '--theme-card-border':      CARD_BORDER_MAP[c.cards.style] || CARD_BORDER_MAP.glass,
    '--theme-card-blur':        CARD_BLUR_MAP[c.cards.blur || 'subtle'] || 'blur(16px)',

    // -- Navbar styles
    '--theme-nav-bg':           NAV_BG_MAP[c.navbar?.style || 'glass'] || NAV_BG_MAP.glass,
    '--theme-nav-blur':         NAV_BLUR_MAP[c.navbar?.blur || 'medium'] || 'blur(20px)',
    '--theme-nav-border':       NAV_BORDER_MAP[c.navbar?.border || 'thin'] || '1px solid rgba(255,255,255,0.10)',

    // -- Border width
    '--theme-border-width':     BORDER_STYLE_MAP[c.borders.style] || '1px',

    // -- Spacing
    '--theme-space-base':       spaceDensity.base,
    '--theme-space-card':       spaceDensity.card,
    '--theme-space-section':    spaceDensity.section,

    // -- Glass
    '--theme-glass-blur':       GLASS_MAP[c.effects.glass] || GLASS_MAP.soft,

    // -- Animation speed (respects prefers-reduced-motion via CSS)
    '--theme-transition':       c.effects.animations === 'off' ? '0ms' : c.effects.animations === 'subtle' ? '100ms' : c.effects.animations === 'playful' ? '400ms' : '200ms',
    '--theme-hover-scale':      c.effects.hover === 'minimal' ? '1.01' : c.effects.hover === 'playful' ? '1.06' : '1.03',

    // -- Global Design System Tokens Overrides (Instantly themes buttons, cards, games, dashboards)
    '--color-primary':          c.buttons?.primaryBg || c.colors.primary,
    '--color-primary-hover':    c.buttons?.primaryBg || c.colors.primary,
    '--color-primary-glow':     `${c.buttons?.primaryBg || c.colors.primary}55`,
    '--color-secondary':        c.colors.secondary,
    '--color-accent':           c.colors.accent,
    '--color-accent-glow':      `${c.colors.accent}55`,
    '--color-warning':          c.colors.warning,
    '--color-danger':           c.colors.danger,
    '--color-success':          c.colors.success,
    '--bg-base':                c.colors.background,
    '--bg-surface':             c.colors.surface,
    '--bg-card':                CARD_BG_MAP[c.cards.style] || CARD_BG_MAP.glass,
    '--bg-card-hover':          CARD_BG_MAP[c.cards.style] || CARD_BG_MAP.glass,
    '--border-primary':         `${c.colors.primary}55`,
    '--border-default':         c.colors.border,
    '--border-subtle':          `${c.colors.border}50`,
    '--border-strong':          `${c.colors.primary}90`,
    '--text-primary':           c.colors.text,
    '--text-secondary':         c.colors.textMuted,
    '--radius-sm':              '6px',
    '--radius-md':              BTN_RADIUS_MAP[c.buttons.style] || '12px',
    '--radius-lg':              RADIUS_MAP[c.cards.radius] || '16px',
    '--radius-xl':              RADIUS_MAP[c.cards.radius] || '20px',
    '--radius-2xl':             RADIUS_MAP[c.cards.radius] || '24px',
    '--shadow-primary':         SHADOW_MAP[c.buttons.shadow] || `0 8px 24px -6px ${c.colors.primary}55`,
    '--tt-glow':                `${c.colors.primary}40`,
  };

  return Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
}

// --- Inject into DOM ----------------------------------------------------------

const STYLE_ID = 'mt-vocab-student-theme';

export function applyThemeToDom(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;

  const vars = buildThemeCSSVars(config);
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `:root {\n${vars}\n}`;
}

export function removeThemeFromDom(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(STYLE_ID)?.remove();
}

// --- Access Layer � Future Shop Integration -----------------------------------
// The Shop will simply set canCreateCustomTheme to true via entitlements
// No Shop logic should ever go inside ThemeCreator

export function canAccessThemeCreator(_studentId: string): boolean {
  // For now: always true (open during local development)
  // Future: check entitlement granted by Shop purchase
  return true;
}
