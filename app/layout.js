import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Ki Trello",
  description: "Collaborative boards and tasks",
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
