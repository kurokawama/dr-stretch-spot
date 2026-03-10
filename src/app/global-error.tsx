"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "32px",
            fontFamily: "sans-serif",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>
            予期しないエラーが発生しました
          </h2>
          <p style={{ color: "#666", fontSize: "14px" }}>
            ページの読み込みに失敗しました。再試行してください。
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 24px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "white",
              cursor: "pointer",
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
