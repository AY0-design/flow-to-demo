import { Field, Spinner, Tap } from "../runtime/primitives";
import { useLoading, useValue } from "../runtime/FlowContext";
import { PrimaryButton, StatusBar, c } from "./ui";

export function Phone() {
  const phone = useValue("phone");
  const loading = useLoading();
  const valid = phone.replace(/\D/g, "").length >= 10;
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 12px" }}>
        <Tap id="back" label="Back" press="opacity" style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 20 }}>
          <svg width="12" height="20" viewBox="0 0 12 20"><path d="M10 2L2 10l8 8" stroke={c.ink} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Tap>
      </div>
      <div style={{ padding: "8px 24px", flex: 1 }}>
        <h2 style={{ font: "700 30px/36px var(--font-sans)", color: c.ink, margin: "0 0 8px", letterSpacing: -0.5 }}>What's your number?</h2>
        <p style={{ font: "400 16px/24px var(--font-sans)", color: c.sub, margin: "0 0 32px" }}>We'll text you a code to confirm it's you.</p>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ height: 56, padding: "0 16px", borderRadius: 14, background: c.soft, display: "flex", alignItems: "center", font: "500 17px var(--font-sans)", color: c.ink }}>🇳🇬 +234</div>
          <Field
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="Phone number"
            placeholderColor="#A0A5B1"
            caretColor={c.brand}
            style={{ flex: 1, height: 56, padding: "0 16px", borderRadius: 14, background: c.soft, font: "500 17px var(--font-sans)", color: c.ink, boxShadow: `inset 0 0 0 1.5px ${phone ? c.brand : "transparent"}` }}
          />
        </div>
      </div>
      <div style={{ padding: "0 24px 40px" }}>
        <PrimaryButton id="continue" disabled={!valid || loading}>
          {loading ? <Spinner color="#fff" track="rgba(255,255,255,.3)" size={22} /> : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}
