# Contributing Guide

Thank you for your interest in contributing to Monster Cocktails! This document explains how to set up the project, coding conventions, branching strategy, and how to propose changes.

Getting started
1. Install Godot 4.5 (GL Compatibility renderer)
2. Clone this repository
3. Open one of the projects:
   - Monster-Cocktails-Main/Monster-Cocktails-Main/project.godot (primary)
   - Monster-Cocktails-Menu/cryptocatchers-.../project.godot (snapshot)
4. Press F5 to run

Branching and commits
- main: stable, release-ready
- feature/*: new features
- fix/*: bug fixes
- docs/*: documentation updates
- Use conventional commits where possible (feat:, fix:, docs:, refactor:, chore:)

Coding style
- GDScript 2.0 (Godot 4):
  - Match existing code style (snake_case for functions/vars, PascalCase for classes)
  - Keep functions short and focused; prefer signals to tight coupling
  - Use `@export` for inspector-tunable values
  - Avoid magic numbers; prefer named constants
- Scenes:
  - Keep node trees tidy and named clearly
  - Use `CanvasLayer` for HUD overlays and scene-agnostic UI
- Autoloads:
  - Place globally-used systems here (Transitions, Inventory, Wallet/API/User, Music)
  - Avoid hard dependencies on scene tree nodes from singletons; use signals

Testing
- Manual testing via F5 for scene flows: Loading → Menu → Gameplay → Converter → Selling Spot → Back
- Web export smoke test: confirm wallet connect button works (Phantom installed)
- Validate music switching when entering SearchGame, Converter, and Menu/Game scenes

Documentation
- Update docs in /docs when adding systems or changing flows
- Diagrams are Mermaid; validate them on GitHub or a Mermaid preview tool

Submitting changes
1. Create a branch
2. Make focused commits with descriptive messages
3. Open a Pull Request with:
   - Summary of changes
   - Screenshots/GIFs (if UI)
   - Checklist: scenes tested, wallet/web tested (if applicable)
4. Request review from a maintainer

Release checklist
- Project runs on Godot 4.5 desktop and web
- Wallet connect/auth flow verified (web)
- Input Map covers keyboard + gamepad basics
- Music transitions work across scenes
- Docs updated (Architecture, Scenes, Systems, Networking, Inputs)
