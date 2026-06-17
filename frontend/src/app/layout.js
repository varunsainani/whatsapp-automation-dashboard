import "./globals.css";

export const metadata = {
  title: "WhatsApp Automation Dashboard",
  description: "Admin panel for the WhatsApp automation bot"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
