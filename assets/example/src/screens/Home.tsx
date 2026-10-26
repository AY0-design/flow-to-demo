import { Scroll, Tap } from "../runtime/primitives";
import { StatusBar, c } from "./ui";

const tx = [
  ["Spotify", "Subscription", "-₦2,900"], ["Ada Obi", "Transfer", "+₦40,000"], ["Shoprite", "Groceries", "-₦18,450"],
  ["Uber", "Transport", "-₦4,200"], ["Salary", "Acme Ltd", "+₦650,000"], ["DSTV", "Bills", "-₦12,500"],
  ["Chicken Republic", "Food", "-₦6,800"], ["Tunde A.", "Transfer", "-₦15,000"], ["MTN", "Airtime", "-₦2,000"],
  ["Jumia", "Shopping", "-₦31,990"],
];

export function Home() {
  return (
    <div style={{ height: "100%", background: c.soft, display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <Scroll style={{ flex: 1 }}>
        <div style={{ padding: "8px 20px 32px" }}>
          <div style={{ font: "500 15px var(--font-sans)", color: c.sub }}>Good morning, Tosin</div>
          <div style={{ marginTop: 16, borderRadius: 24, padding: 24, background: c.brand, color: "#fff" }}>
            <div style={{ font: "500 14px var(--font-sans)", opacity: 0.8 }}>Available balance</div>
            <div style={{ font: "700 36px/44px var(--font-sans)", marginTop: 6, letterSpacing: -0.6 }}>₦482,350.00</div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Tap id="send" style={{ flex: 1, height: 44, borderRadius: 12, background: "#fff", color: c.brand, display: "grid", placeItems: "center", font: "600 15px var(--font-sans)" }}>Send</Tap>
              <Tap id="add" style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(255,255,255,.16)", display: "grid", placeItems: "center", font: "600 15px var(--font-sans)" }}>Add money</Tap>
            </div>
          </div>
          <div style={{ font: "600 17px var(--font-sans)", color: c.ink, margin: "28px 0 12px" }}>Recent activity</div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "4px 16px" }}>
            {tx.map(([n, s, a], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: i ? `1px solid ${c.line}` : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: c.soft, display: "grid", placeItems: "center", font: "600 15px var(--font-sans)", color: c.ink }}>{n[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: "600 15px var(--font-sans)", color: c.ink }}>{n}</div>
                  <div style={{ font: "400 13px var(--font-sans)", color: c.sub, marginTop: 2 }}>{s}</div>
                </div>
                <div style={{ font: "600 15px var(--font-sans)", color: a.startsWith("+") ? "#0E9F6E" : c.ink }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </Scroll>
    </div>
  );
}
