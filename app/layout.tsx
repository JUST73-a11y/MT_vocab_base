import type { Metadata } from "next";
import { Inter, Fredoka } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "react-hot-toast";
import ActiveUserTracker from "@/components/ActiveUserTracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "MT_vocab",
  description: "MT_vocab learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-loading" suppressHydrationWarning>
      <head>
        {/* Instant Zero-Flicker Theme Hydration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cachedS = localStorage.getItem('mt_vocab_student_theme_equipped');
                  var cachedT = localStorage.getItem('mt_vocab_teacher_theme_equipped');
                  var raw = cachedS || cachedT;
                  if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed && parsed.config) {
                      var c = parsed.config;
                      var bgImage = 'none';
                      var bgColor = (c.colors && c.colors.background) ? c.colors.background : '#09090f';
                      var bgPos = 'center';
                      var bgSize = 'cover';
                      var bgOverlayColor = 'transparent';
                      var bgOverlayGradient = 'none';

                      if (c.background) {
                        if (c.background.type === 'color') {
                          bgColor = c.background.color || bgColor;
                        } else if (c.background.type === 'image' && c.background.imageUrl) {
                          bgImage = 'url("' + c.background.imageUrl.replace(/"/g, '\\"') + '")';
                          bgPos = c.background.imagePosition || 'center';
                          bgSize = c.background.imageSize || 'cover';
                          var om = { none: 'transparent', light: 'rgba(0,0,0,0.25)', dark: 'rgba(5,10,25,0.70)', soft: 'rgba(5,10,25,0.45)' };
                          bgOverlayColor = om[c.background.overlay || 'soft'] || 'rgba(5,10,25,0.45)';
                        }
                      }

                      var primary = (c.colors && c.colors.primary) ? c.colors.primary : '#6366f1';
                      var secondary = (c.colors && c.colors.secondary) ? c.colors.secondary : '#8b5cf6';
                      var accent = (c.colors && c.colors.accent) ? c.colors.accent : '#10b981';
                      var surface = (c.colors && c.colors.surface) ? c.colors.surface : '#12121c';
                      var card = (c.colors && c.colors.card) ? c.colors.card : '#181826';
                      var text = (c.colors && c.colors.text) ? c.colors.text : '#ffffff';
                      var textMuted = (c.colors && c.colors.textMuted) ? c.colors.textMuted : 'rgba(255,255,255,0.7)';
                      var border = (c.colors && c.colors.border) ? c.colors.border : 'rgba(255,255,255,0.1)';
                      var btnBg = (c.buttons && c.buttons.primaryBg) ? c.buttons.primaryBg : primary;
                      var navBg = (c.navbar && c.navbar.style === 'solid') ? surface : 'rgba(10, 18, 35, 0.75)';

                      var css = ':root {' +
                        '--theme-primary:' + primary + ';' +
                        '--theme-secondary:' + secondary + ';' +
                        '--theme-accent:' + accent + ';' +
                        '--theme-background:' + bgColor + ';' +
                        '--theme-surface:' + surface + ';' +
                        '--theme-card:' + card + ';' +
                        '--theme-text:' + text + ';' +
                        '--theme-text-muted:' + textMuted + ';' +
                        '--theme-border:' + border + ';' +
                        '--theme-bg-value:' + (bgImage !== 'none' ? bgImage : bgColor) + ';' +
                        '--theme-bg-image:' + bgImage + ';' +
                        '--theme-bg-color:' + bgColor + ';' +
                        '--theme-bg-pos:' + bgPos + ';' +
                        '--theme-bg-size:' + bgSize + ';' +
                        '--theme-bg-overlay-color:' + bgOverlayColor + ';' +
                        '--theme-btn-bg:' + btnBg + ';' +
                        '--theme-nav-bg:' + navBg + ';' +
                        '--color-primary:' + btnBg + ';' +
                        '--bg-base:' + bgColor + ';' +
                        '}';

                      var style = document.createElement('style');
                      style.id = 'mt-vocab-student-theme';
                      style.textContent = css;
                      document.head.appendChild(style);
                    }
                  }
                } catch(e) {}

                // Remove transition-blocking loading class on first frame
                window.addEventListener('DOMContentLoaded', function() {
                  requestAnimationFrame(function() {
                    document.documentElement.classList.remove('theme-loading');
                  });
                });
              })();
            `
          }}
        />
      </head>
      <body className={`${inter.variable} ${fredoka.variable} ${inter.className}`}>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a24',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
        <AuthProvider>
          <ActiveUserTracker />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
