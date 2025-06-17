# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inkdrop is an extensible Markdown-based note-taking application, built on top of Electron and React.
Inkdrop supports extending its functionality and appearance through custom packages, registered on the IPM registry.
The Inkdrop packages look similar to npm packages, which has `package.json` with its dependencies and metadata.

This module is the Inkdrop Package Manager (IPM), which is a helper module for dealing with Inkdrop packages and themes for the desktop app, such as installing, updating, and uninstalling packages.
It is an ES module, written in TypeScript, and is configured with modern TypeScript tooling.

## Features

Check out @README

## Development Commands

- **Linting**: `npm run lint` - Run ESLint on TypeScript files
- **Linting and fixing**: `npm run lint:fix` - Run ESLint on TypeScript files and automatically fix issues
- **Type checking**: `npm run typecheck` - Check TypeScript types without emitting files
- **Format code**: `npm run format` - Format code with Prettier
- **Run tests**: `npm run test` - Run tests with Jest

## Project Structure

- `src/index.ts` - Main entry point (currently empty)
- `eslint.config.js` - ESLint configuration using flat config format
- `package.json` - Project configuration with ES module type

## Development Notes

- The project uses TypeScript 5.8+ with strict ESLint rules
- ESLint is configured to ignore unused variables/parameters prefixed with underscore
- No build step is currently configured - this is a TypeScript source project
- Tests directory exists but no test framework is currently set up

## Journaling

You have to report what you did in this project at each end of the task in my Inkdrop note.
Create one in the "Journal" notebook with the title "Log: Create a simple package manager for Inkdrop".
Update this note at each end of the task with the following format:

```
## Log: <task title>

- **Date**: YYYY-MM-DD HH:mm
- **Prompt**: <prompt you received>
- **Issue**: <issue description>

### What I did: <brief description of what you did>

...

### How I did it: <brief description of how you did it>

...

```

