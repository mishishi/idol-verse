# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Virtual idol collection and cultivation game with rhythm gameplay elements. Players collect virtual idols through gacha, cultivate them, interact with them, and play rhythm games for rewards.

## Commands

```bash
# Start both server and client in development
npm start

# Run server only (Node.js + Express on port 3001)
npm run server

# Run client only (Vite dev server on port 5173)
npm run dev

# Build for production
npm run build
```

## Architecture

### Frontend (src/renderer)

- React 18 + TypeScript frontend served by Vite
- Entry point: `src/renderer/main.tsx`, renders into `src/renderer/index.html`
- Component pages in `src/renderer/App.tsx` (page routing handled within)
- Custom hooks: `useRhythmGame.ts`, `useAudio.ts`
- Styles: CSS modules in `src/renderer/styles/`

### Backend (server/)

- Express.js REST API on port 3001
- API routes under `/api/*`: auth, gacha, characters, user, cultivation, friends, support, daily, achievements, ranking, pass, rhythm, outfits
- SQLite database via sql.js (file-based at `data/idol-game.db`)
- JWT-based authentication

### Database Schema (server/db/sqlite.ts)

- **users** - user accounts with login_streak tracking
- **characters** - idol character definitions (N/R/SR/SSR/UR rarities)
- **user_characters** - player-owned characters with level, exp, intimacy, skill_level
- **character_outfits** / **user_outfits** - costume system
- **user_support_slots** - "应援殿" support hall slots
- **user_currency** - holy_stone, summon_ticket, stamina, pity_count
- **friends** / **friend_requests** / **stamina_gifts** - social system
- **character_messages** - fan messages to idols
- **daily_tasks** / **user_daily_progress** - daily task system
- **achievements** / **user_achievements** - achievement tracking
- **user_pass** / **pass_missions** / **user_pass_progress** - battle pass
- **rhythm_songs** / **rhythm_scores** / **rhythm_user_stats** - rhythm game data

### Vite Proxy Configuration

- `/api` → `http://localhost:3001` (backend)
- `/resources` → `http://localhost:3001` (character images, audio)

## Key Implementation Details

- Database is auto-initialized on server start with seed data (characters, outfits, tasks, achievements, rhythm songs)
- Gacha pity system: pity_count tracks pulls toward guaranteed SSR/UR
- Rhythm game uses 3 lanes (0,1,2) with tap and hold note types stored as JSON
- All API responses follow consistent error/success patterns

## Windows File Path Requirements (CRITICAL)

**ALWAYS follow these Windows file path rules to avoid read/write fail loops:**  

- **All file paths MUST use drive letters** (e.g., `C:\Users\Chadsten\...`)  
- **Use backslashes (`\`), NEVER forward slashes for file operations** (Read, Edit, Write)  
- **Use absolute paths, not relative paths** without drive letters  
- Example: `C:\Users\Chadsten\Documents\repos\project\file.tsx` (CORRECT)  
- Example: `./repos/project/file.tsx` (WRONG - will cause errors)  

**WARNING:** Violating these rules causes "File has been unexpectedly modified" errors and infinite read/write loops. This is a critical system requirement on Windows.
