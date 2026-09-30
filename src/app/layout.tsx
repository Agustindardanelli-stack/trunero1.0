import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Turnea · Turnos online con seña", template: "%s · Turnea" },
  description:
    "Reservá tu turno online y confirmalo con una seña por Mercado Pago. Menos ausencias, cero superposiciones.",
  applicationName: "Turnea",
};

export const viewport: Viewport = { themeColor: "#4f46e5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${jakarta.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
