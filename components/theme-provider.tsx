"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// suppressHydrationWarning is needed for next-themes' inline FOUC-prevention script
// which React 19 warns about but cannot be disabled without risking flash of wrong theme.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{ suppressHydrationWarning: true }}
    >
      {children}
    </NextThemesProvider>
  );
}
