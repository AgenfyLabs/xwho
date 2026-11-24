import { ImageResponse } from "next/og";

export const alt = "XWho 中文 X 黄皮书";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f8f5ee", color: "#30291f", padding: "72px" }}>
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#67472f" }}>XWHO.ORG</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 128, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>XWho</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 36, color: "#67472f" }}>xwho.org</div>
      </div>
    </div>,
    { ...size },
  );
}
