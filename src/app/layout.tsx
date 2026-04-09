import type { Metadata } from "next";
import "@/styles/globals.css";

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
      <body style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
