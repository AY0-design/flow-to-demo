import type { CSSProperties, ReactNode } from "react";
import { Tap } from "../runtime/primitives";

export const c = { brand: "#1F4BFF", ink: "#0F1115", sub: "#5B6170", line: "#E6E8EE", soft: "#F4F5F8" };

export function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div style={{ height: 47, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px 0 34px", font: "600 16px/1 var(--font-sans)", color: dark ? "#fff" : c.ink }}>
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ width: 18, height: 11, borderRadius: 2, background: "currentColor", opacity: 0.9 }} />
        <span style={{ width: 24, height: 12, borderRadius: 3, border: "1.5px solid currentColor", position: "relative" }}>
          <span style={{ position: "absolute", inset: 1.5, right: 5, background: "currentColor", borderRadius: 1 }} />
        </span>
      </span>
    </div>
  );
}

export function PrimaryButton(props: { id: string; children: ReactNode; disabled?: boolean; style?: CSSProperties }) {
  return (
    <Tap id={props.id} disabled={props.disabled} style={{ height: 56, borderRadius: 16, background: props.disabled ? "#B9C4FF" : c.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "600 17px/1 var(--font-sans)", ...props.style }}>
      {props.children}
    </Tap>
  );
}
