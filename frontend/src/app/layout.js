import "./globals.css";
import { UIProvider } from "@/components/ui";

export const metadata = {
  title: "WhatsApp Automation Dashboard",
  description: "Admin panel for the WhatsApp automation bot"
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
