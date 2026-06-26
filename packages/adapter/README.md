# @theermite/morphic-adapter

Adaptateur React pour le [Morphic Adaptation Engine](../engine).

**Version** : `2.0.0-beta.1`  
**Statut** : Adaptateur React livré. Adaptateurs Vanilla, Astro et Web Components non implémentés.

## Install

```bash
pnpm add @theermite/morphic-adapter @theermite/morphic-engine react react-dom
```

Peer deps : `react ^19`, `react-dom ^19`, `@theermite/morphic-engine ^2.0.0-beta.0`.

## Quick start (Next.js 16 App Router)

Wrappez votre root layout (ou un sous-arbre) avec `<MorphicProvider>` :

```tsx
// app/layout.tsx
import { MorphicProvider } from '@theermite/morphic-adapter';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <MorphicProvider>{children}</MorphicProvider>
      </body>
    </html>
  );
}
```

Pour éviter le flash de contenu non adapté (FOUC) à l'hydratation, injectez le snippet head-read du moteur dans `<head>` (voir README `@theermite/morphic-engine`). Le provider est le fallback pour les montages client-only et maintient la réactivité des hooks.

## CSS

Deux feuilles CSS optionnelles sont exposées :

```ts
import '@theermite/morphic-adapter/morphic.css';  // variables CSS de base
import '@theermite/morphic-adapter/ui.css';        // styles du composant MorphicButton
```

## Hooks

### Par axe — tuple `[choice, setter]`

```tsx
'use client';
import {
  useMorphicTheme,
  useMorphicMotion,
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontSize,
  useMorphicFontFamily,
} from '@theermite/morphic-adapter';

export function ThemeToggle() {
  const [theme, setTheme] = useMorphicTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Theme : {theme ?? 'auto'}
    </button>
  );
}
```

`choice` est la préférence persistée de l'utilisateur (peut inclure `'auto'`) ou `null` si aucune n'est stockée. Le setter proxie vers le moteur **et** déclenche un re-render de tous les consommateurs de hooks via le compteur interne du provider.

### Agrégé — `useMorphic()`

```tsx
import { useMorphic } from '@theermite/morphic-adapter';

export function MorphicDebug() {
  const snap = useMorphic();
  return <pre>{JSON.stringify(snap, null, 2)}</pre>;
}
```

Retourne le snapshot en lecture seule des 6 axes (`theme`, `motion`, `contrast`, `density`, `fontSize`, `fontFamily`).

## Composant UI

Le sous-package `./ui` expose `MorphicButton`, un bouton pré-stylé respectant les axes actifs du moteur :

```tsx
import { MorphicButton } from '@theermite/morphic-adapter/ui';
import '@theermite/morphic-adapter/ui.css';

<MorphicButton axis="theme" />
```

## Contrat

- Tous les hooks lèvent une erreur explicite s'ils sont utilisés hors `<MorphicProvider>`.
- `<MorphicProvider>` est un wrapper transparent — il n'injecte aucun DOM.
- Le provider exécute `morphicInit()` une seule fois au premier montage client (idempotent — sûr en cas de remontage et en Strict Mode double-effect).
- SSR-safe : le provider ne touche pas le DOM pendant le rendu ; les getters du moteur gardent déjà `typeof document`.

## Couverture

Seuil minimum : 80 %. Couverture actuelle : **100 %** (14 tests — lignes, branches, fonctions, instructions).

## License

AGPL-3.0-or-later. Voir la racine du repo.
