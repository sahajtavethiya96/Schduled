"use client";

import { createContext, useContext, useState } from "react";

const AvatarCtx = createContext<{
  url: string | null;
  setUrl: (url: string | null) => void;
}>({ url: null, setUrl: () => {} });

export function AvatarProvider({
  children,
  initialUrl,
}: {
  children: React.ReactNode;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  return (
    <AvatarCtx.Provider value={{ url, setUrl }}>{children}</AvatarCtx.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarCtx);
}
