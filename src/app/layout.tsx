import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from "@/context/I18nContext";

export const metadata: Metadata = {
  title: "TeraBox Shows - Folder Inspector & Intelligent Media Player",
  description: "Aplikasi modern untuk memeriksa isi folder TeraBox, mendeteksi file audio dan video, menampilkan ukuran file dalam MB, serta memutar lagu dan video secara langsung.",
  keywords: ["terabox", "terabox player", "terabox audio player", "terabox shows", "terabox inspector"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Anti-FOUC Theme Bootstrap Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('teraplay_theme') || 'dark';
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = saved === 'dark' || (saved === 'system' && prefersDark);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 min-h-screen selection:bg-sky-500/30 selection:text-sky-700 dark:selection:text-sky-200 antialiased transition-colors duration-200"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <I18nProvider>
            {/* Ambient Background Gradient for Light and Dark mode */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100/60 via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-[#070b14] dark:to-[#04060a] -z-10 pointer-events-none transition-colors duration-300" />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

