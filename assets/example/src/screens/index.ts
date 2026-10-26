import type { ComponentType } from "react";
import { Welcome } from "./Welcome";
import { Phone } from "./Phone";
import { Home } from "./Home";
import { SendSheet } from "./SendSheet";

export const screens: Record<string, ComponentType> = {
  welcome: Welcome,
  phone: Phone,
  home: Home,
  "send-sheet": SendSheet,
};

export const Toast: ComponentType<{ text: string; p: number }> | null = null;
