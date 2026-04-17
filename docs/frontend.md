# Frontend Architecture

## Overview

The frontend is a React Native application that runs on web, iOS, and Android from a single TypeScript codebase.

The current app is not a generic mobile template. It is a structured operations client for hotel staff with these major areas:

- login and role-based navigation,
- home/dashboard modules,
- offer management,
- daily occupancy / Belegung data,
- assistant chat,
- guest and employee profile screens,
- and a shared design system.

## Bootstrapping

- App entry: `frontend/App.tsx`
- Router: `frontend/src/navigation/Router.tsx`
- Auth provider: `frontend/src/auth/AuthContext.tsx`
- Localization provider: `frontend/src/i18n/I18nContext.tsx`
- Toast provider: `frontend/src/components/ui/Toast.tsx`

The app wraps the full interface in the following order:

1. `SafeAreaProvider`
2. `AuthProvider`
3. `RouterProvider`
4. `I18nProvider`
5. `ToastProvider`
6. screen layout / current route

## Routing Model

The router is intentionally simple and stateful.

Screens currently available:

- `login`
- `home`
- `offers-list`
- `offer-editor`
- `guest-profile`
- `employee-profile`
- `belegung-editor`
- `days-list`
- `staff-manager`
- `chat`

This is enough for the current product and avoids pulling in a heavier client-side navigation framework.

## Layout

### Main Shell

`frontend/src/components/Layout.tsx` renders:

- the sidebar,
- the main scrollable content,
- and the logo/header area.

### Sidebar

`frontend/src/components/Sidebar.tsx` provides:

- module navigation based on the current user role,
- a role badge,
- language switching,
- and logout.

The sidebar is also where the app exposes the German/English toggle.

## Design System

### Centralized Theme

Core brand tokens are in `frontend/src/theme/colors.ts` and `frontend/src/theme/typography.ts`.

Chat-specific tokens live in `frontend/src/theme/chat.ts` so the chat UI can be tuned without scattering values throughout the screen implementation.

### Styling Rules

- Brand colors are warm and subdued, not neon or high-contrast.
- Borders and shadows are soft.
- Typography uses serif accents for headings and a clean sans-serif for interface text.
- Labels and metadata are intentionally subtle.

### Web Compatibility

The web build is a first-class target. This has a few consequences:

- CSS-in-JS values must stay compatible with React Native Web.
- `boxShadow` is preferred in places where web behavior matters.
- browser-only features such as PNG export are guarded by `Platform.OS === 'web'`.

## Localization

`frontend/src/i18n/I18nContext.tsx` provides a small translation layer.

Characteristics:

- locale options: `de` and `en`
- locale is persisted in local storage
- the translation dictionary is centralized
- missing keys fall back to the German source key or the key name itself

This was added to keep the operational UI usable for different staff members without maintaining separate routes or duplicate components.

## API Layer

`frontend/src/api/client.ts` is the only place that should know how to talk to the backend.

Responsibilities:

- attach the JWT token to authenticated requests,
- convert non-OK responses into useful `Error` objects,
- provide typed helpers for offers, guests, employees, Belegung, and assistant calls,
- and expose the offer HTML export endpoint.

Important helpers:

- `api.login()`
- `api.me()`
- `api.listOffers()`
- `api.createOffer()`
- `api.exportOfferHtml()`
- `api.askAssistant()`
- `api.getGuest()`
- `api.getEmployee()`

## Screen Responsibilities

### Login Screen

`frontend/src/screens/LoginScreen.tsx` handles authentication and shows the Bleiche branding.

### Home Screen

`frontend/src/screens/HomeScreen.tsx` shows module cards and a small user-profile summary.

### Offers Screens

- `frontend/src/screens/offers/OffersListScreen.tsx`
- `frontend/src/screens/offers/OfferEditorScreen.tsx`

These handle listing, editing, duplicating, deleting, and exporting offers.

### Belegung Screens

- `frontend/src/screens/belegung/BelegungEditorScreen.tsx`
- `frontend/src/screens/belegung/DaysListScreen.tsx`
- `frontend/src/screens/belegung/StaffManagerScreen.tsx`

These handle the daily occupancy data and its supporting staff list.

### Profile Screens

- `frontend/src/screens/guests/GuestProfileScreen.tsx`
- `frontend/src/screens/employees/EmployeeProfileScreen.tsx`

These screens are linked from assistant references and are intentionally simple detail views.

### Chat Screen

`frontend/src/screens/ChatScreen.tsx` is the assistant entry point.

It supports:

- full conversation thread sending,
- clickable object references,
- message-level copy buttons,
- code-block copy buttons,
- conversation copy,
- temporary conversation image export on web,
- and regenerate/reload for the latest assistant response.

## Clipboard And Export Helpers

- `frontend/src/utils/clipboard.ts` handles native and web clipboard behavior.
- `frontend/src/utils/downloads.ts` handles browser file downloads.
- `frontend/src/utils/exportConversationAsImage.ts` is the temporary web-only image export helper.

## Dependency Notes

Recent frontend additions include:

- `@react-native-clipboard/clipboard`
- `html2canvas`
- `react-native-svg`

These are required for clipboard behavior, image export, and SVG chat icons.

## What To Update First When The UI Changes

If a frontend change affects the user experience, update these in parallel:

- the screen component,
- the shared theme tokens,
- the i18n dictionary if labels changed,
- and the relevant docs in `docs/`.
