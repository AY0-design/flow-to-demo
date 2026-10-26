import { Tap } from "../runtime/primitives";
import { c } from "./ui";

const people = [["contact-ada", "Ada Obi", "Access Bank •• 4412"], ["contact-tunde", "Tunde Adeyemi", "GTBank •• 0921"], ["contact-zainab", "Zainab Bello", "Kuda •• 7783"]];

export function SendSheet() {
  return (
    <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", padding: "10px 20px 40px" }}>
      <div style={{ width: 40, height: 5, borderRadius: 3, background: c.line, margin: "0 auto 18px" }} />
      <div style={{ font: "700 22px var(--font-sans)", color: c.ink, marginBottom: 6 }}>Send money</div>
      <div style={{ font: "400 15px var(--font-sans)", color: c.sub, marginBottom: 16 }}>Choose a recent recipient</div>
      {people.map(([id, n, b]) => (
        <Tap key={id} id={id} press="opacity" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#E8EDFF", color: c.brand, display: "grid", placeItems: "center", font: "600 16px var(--font-sans)" }}>{n[0]}</div>
          <div>
            <div style={{ font: "600 16px var(--font-sans)", color: c.ink }}>{n}</div>
            <div style={{ font: "400 13px var(--font-sans)", color: c.sub, marginTop: 2 }}>{b}</div>
          </div>
        </Tap>
      ))}
    </div>
  );
}
