import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#070b14] text-slate-100 min-h-screen selection:bg-sky-500/30 selection:text-sky-200 antialiased"
        suppressHydrationWarning
      >
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#070b14] to-[#04060a] -z-10 pointer-events-none" />
        {children}
      </body>
    </html>
  );
}
