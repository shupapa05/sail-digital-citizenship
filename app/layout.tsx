import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SchoolTask 2.0",
  description: "학급경영과 학교업무를 함께 관리하는 SchoolTask 2.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
