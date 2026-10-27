import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const metadata = {
  title: "CalaPOS — Point of Sale Toko Snack",
  description: "Sistem Kasir dan Manajemen Toko Snack CalaPOS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f7f8fa] text-slate-800 font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
