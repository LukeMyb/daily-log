import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#18181b",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          DL
        </div>
        <div
          style={{
            marginTop: 8,
            width: 56,
            height: 5,
            borderRadius: 3,
            backgroundColor: "#2563eb",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
