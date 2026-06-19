import "./globals.css";
import { UIProvider } from "@/components/ui";

export const metadata = {
  title: "WhatsApp Automation Dashboard",
  description:
    "Automate WhatsApp conversations, capture leads through a custom flow, hand off to human agents, and track everything from one admin panel.",
  openGraph: {
    title: "WhatsApp Automation Dashboard",
    description:
      "Automate WhatsApp conversations, capture leads, hand off to human agents, and track everything from one admin panel.",
    type: "website"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
