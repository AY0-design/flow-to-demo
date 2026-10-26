import logo from "../assets/logo.svg";
import { PrimaryButton, StatusBar, c } from "./ui";

export function Welcome() {
  return (
    <div style={{ height: "100%", background: "linear-gradient(180deg,#1F4BFF 0%,#1435C7 100%)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <StatusBar dark />
      <div style={{ flex: 1, padding: "80px 28px 0" }}>
        <img src={logo} width={64} height={64} alt="Wallet" />
        <h1 style={{ font: "700 40px/46px var(--font-sans)", margin: "40px 0 16px", letterSpacing: -0.8 }}>Money that moves at your speed.</h1>
        <p style={{ font: "400 17px/25px var(--font-sans)", opacity: 0.8, margin: 0 }}>Send, save and spend with a wallet built for everyday life.</p>
      </div>
      <div style={{ padding: "0 24px 48px" }}>
        <PrimaryButton id="get-started" style={{ background: "#fff", color: c.brand }}>Get started</PrimaryButton>
      </div>
    </div>
  );
}
