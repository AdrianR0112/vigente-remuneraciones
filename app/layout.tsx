import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vigente | Remuneraciones",
  description: "Gestión demostrativa de remuneraciones para una empresa privada ecuatoriana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
