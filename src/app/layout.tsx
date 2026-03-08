import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

// Configure the global Inter font for the entire application
const inter = Inter({ subsets: ["latin"] });

// Define default metadata for the application
export const metadata: Metadata = {
  title: "TrackAdemia | Research Tracking System",
  description: "Manage and monitor research progress for students and advisers.",
};

// Root layout that wraps every page in the application
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // Render the HTML structure used across all pages
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}