import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MHive - 미스터리 사건사고 위키",
  description: "미스터리, 범죄, 사고, 음모론을 연결하는 인터랙티브 그래프 위키",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
