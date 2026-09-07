import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10192d",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://talleres-gestion-tecnica.vercel.app"),
  title: "TallerOS — Gestión para técnicos",
  description: "Órdenes, clientes, diagnósticos y cobros para servicios técnicos de computadoras y celulares. Instalable y disponible sin conexión.",
  applicationName: "TallerOS",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TallerOS",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "TallerOS",
    title: "TallerOS — Tu taller, bajo control",
    description: "Gestioná órdenes, clientes, diagnósticos, entregas y cobros desde cualquier dispositivo, incluso offline.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TallerOS, gestión técnica para talleres de computadoras y celulares" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TallerOS — Tu taller, bajo control",
    description: "Órdenes, clientes, cobros y seguimiento técnico en una PWA local-first.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
