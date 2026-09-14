# 📦 TeraBox Shows (terabox-shows)

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Lucide Icons](https://img.shields.io/badge/Lucide-Icons-F56565?logo=lucide&logoColor=white)](https://lucide.dev/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio-Visualizer-FF6B6B)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

**TeraBox Shows** is a modern, high-performance cloud folder inspector and intelligent multimedia streaming deck built with **Next.js 15 App Router**, **TypeScript**, and **Tailwind CSS**. It is designed to inspect TeraBox shared links and folder directories, extract comprehensive file metadata with precise MB/GB capacity calculations, and provide an interactive media player experience (Spotify-grade Audio Deck & Video Theatre Modal) directly within the browser.

---

## 🎯 Product Scope

This application provides a seamless, dark-mode glassmorphic interface for discovering, inspecting, analyzing, and streaming cloud files without requiring heavy desktop clients or third-party download managers.

### 🚀 Core Objectives

1. **Intelligent Cloud Folder & Link Inspection**: Instantly parse public TeraBox share links (`terabox.com/s/...`, `1024terabox.com`, etc.) and internal folder paths, extracting file trees, folder statistics, ownership details, and hierarchy.
2. **Spotify-Grade Audio Deck & Real-Time Spectrum Visualizer**: Automatic detection of audio collections (`.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`) with continuous playback, interactive seekbars, playback modes (Repeat One, Repeat All, Shuffle, Order), speed control (0.75x - 2x), queue management, and dynamic Canvas-driven audio frequency spectrum visualizer.
3. **Immersive Video Theatre Modal**: Streamlined video playback for `.mp4`, `.mkv`, `.webm`, and `.mov` files with custom cinema controls, direct streaming acceleration, and one-click download handlers.
4. **Precision Storage Capacity Analysis**: Exact file size calculations formatted in MB and GB, aggregated folder metrics, and real-time category distribution breakdowns (Audio, Video, Images, Documents, Archives).
5. **Dual-View Exploration & Live Search**: Smooth toggle between structured **Table List View** and responsive **Glassmorphic Card Grid View**, accompanied by real-time keyword search and category filtering.
6. **Built-in Proxy Stream Engine**: Next.js server-side API proxy routes that bypass CORS restrictions, handle range headers for smooth scrubbing, and deliver optimized multimedia streaming pipelines.

---

## 🧰 Tech Stack Matrix

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15 (App Router)** | Modern React server & client components with optimal rendering speed and static asset caching. |
| **UI Library & Logic** | **React 18 + Hooks** | Component lifecycle, custom player hooks, audio context references, and responsive state synchronization. |
| **Language & Typing** | **TypeScript 5** | Strict type definitions across TeraBox API payloads, media track structures, and component props. |
| **Styling & Design System** | **Tailwind CSS + Glassmorphism** | Dark-mode tailored aesthetic, translucent frosted glass cards, glow effects, and smooth CSS micro-interactions. |
| **Icons & Indicators** | **Lucide React** | Clean, lightweight icon suite for media controls, file extensions, storage indicators, and navigation. |
| **Audio Engine & FX** | **HTML5 Audio API + Canvas 2D** | Low-latency audio streaming engine paired with animated audio frequency spectrum visualizer. |
| **Backend & Proxy Streaming** | **Next.js Route Handlers** | Server-side API endpoints (`/api/terabox/inspect`, `/api/terabox/stream`, `/api/audio/sample`) handling header spoofing & streaming pipes. |
| **File Parser & Utilities** | **Custom TeraBox Parsers & Formatters** | Regex pattern matchers, recursive folder size calculators, time/byte formatters, and filename sanitizers. |

---

## 🏗️ Architecture Overview

The application adopts a modular Next.js App Router architecture, cleanly separating client UI interactions from server-side proxy handling and API inspection pipelines.

```mermaid
graph TD
    User([User / Browser Client]) <--> UI[Next.js Client UI Layer]
    
    subgraph UI Layer
        Search[Link Input & Folder Inspector]
        Stats[Folder Stats & Capacity Header]
        ViewToggle[Table List / Card Grid View]
        AudioDeck[Audio Player Deck + Canvas Spectrum]
        VideoModal[Video Theatre Modal]
    end
    
    UI <--> Search
    UI <--> Stats
    UI <--> ViewToggle
    UI <--> AudioDeck
    UI <--> VideoModal
    
    UI -->|1. Inspect Folder / Share Link| APIInspect[/api/terabox/inspect]
    UI -->|2. Request Media Stream / CORS Bypass| APIStream[/api/terabox/stream]
    
    subgraph Server & Proxy Layer
        APIInspect --> Parser[TeraBox Parser & Share API Engine]
        APIStream --> StreamProxy[Range Request Proxy & Header Handler]
    end
    
    Parser <--> Cloud[TeraBox Cloud Services]
    StreamProxy <--> Cloud
```

---

## 🗂️ Project Structure

```text
├── 📁 public
│   └── 🌐 (Static Assets & Favicons)
├── 📁 src
│   ├── 📁 app
│   │   ├── 📁 api
│   │   │   ├── 📁 audio
│   │   │   │   └── 📁 sample
│   │   │   │       └── 📄 route.ts
│   │   │   └── 📁 terabox
│   │   │       ├── 📁 inspect
│   │   │       │   └── 📄 route.ts
│   │   │       └── 📁 stream
│   │   │           └── 📄 route.ts
│   │   ├── 🎨 globals.css
│   │   ├── 🖼️ icon.svg
│   │   ├── 📄 layout.tsx
│   │   └── 📄 page.tsx
│   ├── 📁 components
│   │   ├── 🎵 AudioPlayerBar.tsx
│   │   ├── 📊 AudioVisualizer.tsx
│   │   ├── 🗂️ FileCard.tsx
│   │   ├── 📋 FileTableRow.tsx
│   │   ├── 📈 FolderStatsHeader.tsx
│   │   ├── 🌲 FolderTree.tsx
│   │   ├── 🔍 LinkInputSection.tsx
│   │   ├── 🧭 Navbar.tsx
│   │   ├── 🔢 Pagination.tsx
│   │   └── 🎬 VideoModal.tsx
│   ├── 📁 lib
│   │   ├── ⚙️ formatters.ts
│   │   ├── 📦 sampleData.ts
│   │   └── 🛠️ teraboxParser.ts
│   └── 📁 types
│       └── 📐 terabox.ts
├── ⚙️ .gitignore
├── 📝 README.md
├── ⚙️ next-env.d.ts
├── ⚙️ next.config.mjs
├── 📦 package-lock.json
├── 📦 package.json
├── 🎨 postcss.config.mjs
├── 🎨 tailwind.config.ts
├── ⚙️ tsconfig.json
└── ⚙️ tsconfig.tsbuildinfo
```

---

## 🚀 Local Development

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18.20+ or v20+ recommended) and `npm`, `pnpm`, or `yarn` installed on your machine.

### 1) Clone and Install Dependencies

Navigate to your workspace directory and install the project dependencies:

```bash
git clone https://github.com/your-username/terabox-shows.git
cd terabox-shows
npm install
```

### 2) Run the Application

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application will hot-reload automatically when source files are modified.

### 3) Build for Production

To create an optimized production build:

```bash
npm run build
```

To run the compiled production build locally:

```bash
npm run start
```

---

## 🧪 Quality Gates & Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Development Server** | `npm run dev` | Runs the Next.js development server at `localhost:3000` |
| **Production Build** | `npm run build` | Compiles TypeScript and builds optimized production bundles |
| **Production Start** | `npm run start` | Launches the pre-built Next.js production server |
| **Code Linting** | `npm run lint` | Runs Next.js ESLint verification across all source files |

---

## 📄 License

Distributed under the [MIT License](LICENSE). Free for personal and educational use.
