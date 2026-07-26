import type { Metadata } from "next";
import { fontVariables } from "@/theme/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twilio Flex SDK Boilerplate",
  description: "Next.js + TypeScript agent desktop foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables}`} suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
