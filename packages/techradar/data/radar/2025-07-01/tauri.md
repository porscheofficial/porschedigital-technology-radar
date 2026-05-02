---
title: "Tauri"
ring: hold
segment: tools
tags:
  - desktop
  - frontend
teams:
  - macan
featured: false
links:
  - url: https://tauri.app
    name: Official Website
  - url: https://github.com/tauri-apps/tauri
    name: GitHub Repository
  - url: https://tauri.app/docs
    name: Documentation
---

Tauri is a framework for building lightweight desktop applications using web technologies for the UI layer and [[rust]] for the backend. It offers significantly smaller bundles and lower memory footprint compared to Electron by leveraging the OS-native webview instead of bundling Chromium.

The Macan team evaluated Tauri for an internal diagnostic tool that connects to vehicle ECUs over USB. While the Rust backend was a good fit for the low-level USB communication, the evaluation surfaced several concerns:

- **Platform inconsistencies** — rendering differences between WebKit (macOS/Linux) and WebView2 (Windows) required platform-specific CSS workarounds
- **Ecosystem maturity** — fewer plugins and community resources compared to Electron
- **Team skill gap** — Rust proficiency is still ramping up (see [[rust]]), and debugging across the JS/Rust boundary added cognitive overhead

The diagnostic tool was ultimately shipped as a web application with a thin local agent instead. Tauri remains on hold until our Rust competency matures and a use case arises where native desktop distribution is a hard requirement.
