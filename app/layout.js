import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Ki Trello",
  description: "Tablero colaborativo para gestion de tareas",
  icons: { icon: "/favicon.png" },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <div className="app-shell">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
