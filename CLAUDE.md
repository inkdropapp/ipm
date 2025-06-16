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

- **Linting**: `npx eslint .` - Run ESLint on TypeScript files
- **Type checking**: `npx tsc --noEmit` - Check TypeScript types without emitting files
- **Format code**: `npx prettier --write .` - Format code with Prettier

## Project Structure

- `src/index.ts` - Main entry point (currently empty)
- `eslint.config.js` - ESLint configuration using flat config format
- `package.json` - Project configuration with ES module type

## Development Notes

- The project uses TypeScript 5.8+ with strict ESLint rules
- ESLint is configured to ignore unused variables/parameters prefixed with underscore
- No build step is currently configured - this is a TypeScript source project
- Tests directory exists but no test framework is currently set up

