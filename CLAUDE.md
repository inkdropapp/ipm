# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inkdrop is an extensible Markdown-based note-taking application, built on top of Electron and React.
Inkdrop supports extending its functionality and appearance through custom packages, registered on the IPM registry.
The Inkdrop packages look similar to npm packages, which has `package.json` with its dependencies and metadata.

This module is the Inkdrop Package Manager (IPM), which is a helper module for dealing with Inkdrop packages and themes for the desktop app, such as installing, updating, and uninstalling packages.
It is an ES module, written in TypeScript, and is configured with modern TypeScript tooling.

## Journaling workflow for AI Agent

You have to report what you did in this project at each end of the task in my Inkdrop note.
Create one in the "Journal" notebook with the title "Log: Create a simple package manager for Inkdrop".
Update this note at each end of the task with the following format:

```
## Log: <task title>

- **Prompt**: <prompt you received>
- **Issue**: <issue description>

### What I did: <brief description of what you did>

...

### How I did it: <brief description of how you did it>

...

```

## Features

Check out @README

## Development Commands

This project uses **pnpm**.

- **Linting**: `pnpm run lint` - Run oxlint on TypeScript files
- **Linting and fixing**: `pnpm run lint:fix` - Run oxlint on TypeScript files and automatically fix issues
- **Type checking**: `pnpm run typecheck` - Check TypeScript types without emitting files
- **Format code**: `pnpm run format` - Format code with oxfmt
- **Run tests**: `pnpm run test` - Run tests with Vitest
- **Build**: `pnpm run build` - Bundle with tsdown

## Project Structure

- `src/index.ts` - Main entry point
- `.oxlintrc.json` - oxlint configuration
- `.oxfmtrc.json` - oxfmt configuration
- `tsdown.config.ts` - Build (bundler) configuration
- `vitest.config.ts` - Test runner configuration
- `package.json` - Project configuration with ES module type

## Development Notes

- The project uses TypeScript 6.x
- oxlint is configured to ignore unused variables/parameters prefixed with underscore
- The build step bundles `src/index.ts` to `lib/` (ESM + declarations) via tsdown
