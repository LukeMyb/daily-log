import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
          border: "16px solid #27272a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          DL
        </div>
        <div
          style={{
            marginTop: 16,
            width: 160,
            height: 12,
            borderRadius: 6,
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
