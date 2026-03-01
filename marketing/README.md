# AVLY.IO Marketing Assets

This directory contains marketing, pitch, and promotional materials for AVLY.IO and its products.

## Structure

```
marketing/
  pitch-deck/       # Pitch deck slides and supporting materials
  video/
    sixty-second-pitch/   # 60-second Remotion video — grassroots indie startup pitch
```

## 60-Second Pitch Video

Built with [Remotion](https://www.remotion.dev/) (React-based programmatic video framework).

### Quick Start

```bash
cd marketing/video/sixty-second-pitch
npm install
npm run studio    # Opens Remotion Studio for preview
npm run render    # Renders final MP4
```

### Key Files

- `SCRIPT.md` — Polished script with director's notes + original dialog
- `SCENES.md` — Scene-by-scene Remotion technical breakdown
- `src/Video.tsx` — Main composition (assembles all 8 scenes)
- `src/scenes/` — Individual scene components
- `src/components/` — Reusable animation components

### Video Specs

- Resolution: 1920x1080 (Full HD)
- Frame rate: 30fps
- Duration: 60 seconds (1800 frames)
- Style: Grassroots indie startup — fast-paced, authentic, punchy
