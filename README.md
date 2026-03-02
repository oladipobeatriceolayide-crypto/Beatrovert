# ✦ Service Timer

A lightweight, browser-based service flow timer built for church operators who need to keep a live service on schedule — without the overhead of complex presentation software.

## Problem

Managing time across a live church service is a manual, error-prone process. Operators typically rely on wall clocks, personal phones, or improvised solutions that don't give speakers a clear, real-time signal of where they stand on time — especially when segments run over.

## Solution

Service Timer is a zero-install, single-file web app that gives operators full control over the order of service from a laptop, while projecting a clean, distraction-free countdown to a second screen for speakers to reference in real time.

## Live Demo

Hosted via GitHub Pages — no download required:
👉 `https://yourusername.github.io/service-timer`

*(Replace `yourusername` with your GitHub username)*

## Core User Flows

**Before service** — The operator pre-loads all service segments with names and durations. No account, no sync, no setup beyond opening a file.

**During service** — A large countdown runs per segment. The operator advances manually using the `→` arrow key, staying in control of the pace without being tied to a mouse.

**On overtime** — When a segment exceeds its allotted time, the display flips to an elapsed counter and the screen flashes red — giving speakers an unambiguous visual cue to wrap up, without the operator needing to intervene.

**On the projector** — A dedicated presentation window opens in a separate browser window, designed to run fullscreen on a projector or secondary display. It stays in sync with the operator's control screen in real time.

## Key Design Decisions

- **Manual advancement, not auto-advance** — The operator always decides when to move to the next segment. This is intentional: only a human in the room knows when a speaker has actually finished, regardless of what the clock says.
- **Single HTML file** — No frameworks, no build steps, no server. The entire app ships as one file that works offline.
- **Keyboard-first controls** — `Space` to pause/resume, `→` to advance. Designed to be operated without looking at the screen.

## Getting Started

### Option A — Use it instantly (GitHub Pages)
Just open the live link above in any modern desktop browser. Nothing to install.

### Option B — Run it locally
1. Download `church-timer.html`
2. Open it in any modern desktop browser
3. Enter your service segments and durations
4. Click **Begin Service**
5. Click **⛶ Open Presentation Screen**, drag it to your projector, and press `F11` for fullscreen
6. Use `→` to advance through segments as the service progresses

## Requirements

Any modern desktop browser. No internet connection required if running locally.
