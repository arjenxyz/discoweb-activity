import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
// BU SATIR OLMAZSA HER ŞEY BEYAZ GÖRÜNÜR:
import "./globals.css";
import CartProvider from "../lib/cart";
import CartDrawer from "../components/CartDrawer";
import FrameIdTracker from "./components/FrameIdTracker";
import ThemeBootstrap from "./components/ThemeBootstrap";
import DiscordUrlPatch from "../components/DiscordUrlPatch";
import ErrorCollector from "./components/ErrorCollector";
import { LocaleProvider } from "@/contexts/LocaleContext";
import GlobalErrorReporter from "@/components/GlobalErrorReporter";
import SpoilerWarningModal from "./components/SpoilerWarningModal";
import MiniSplashOverlay from "./components/MiniSplashOverlay";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#5865F2",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "DiscoWeb - Discord Activity",
  description: "Discord sunucunuz için bakiye yönetimi ve rol satın alma Activity uygulaması.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-[#0b0d12]`}>
        {/* ThemeBootstrap applies persisted theme on client mount; removed pre-hydration inline script
          to prevent React hydration mismatches. This may cause a very short FOUC but avoids warnings. */}
        <ThemeBootstrap />
        <DiscordUrlPatch />
        <ErrorCollector />
        <LocaleProvider>
          <CartProvider>
            <FrameIdTracker />
            <SpoilerWarningModal />
            {children}
            <CartDrawer />
            <GlobalErrorReporter />
            <MiniSplashOverlay />
          </CartProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}