import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-face", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Stroopwafel Ventures", template: "%s · Stroopwafel Ventures" },
  description: "Matching & warm introductions for the Stroopwafel Ventures platform team (fictional data).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
