import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SearchProvider } from "@/contexts/SearchContext";
import { UnifiedViewProvider } from "@/contexts/UnifiedViewContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VyManager",
  description: "Professional VyOS Management Interface",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "interstellar"]}
        >
          <SearchProvider>
            <UnifiedViewProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </UnifiedViewProvider>
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
