import type { Metadata } from "next";
import { Anek_Latin, Eczar } from "next/font/google";
import "./globals.css";

const eczar = Eczar({
  variable: "--font-eczar",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

// The width axis lets the lettering on the house be set a little narrower.
const anek = Anek_Latin({
  variable: "--font-anek",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Poetry Designs",
  description: "Your home with Poetry Designs: what is agreed, what is next, and what a change would cost.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${eczar.variable} ${anek.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
