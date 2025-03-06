import type { Metadata } from "next";
import "./globals.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Shadowserver API client",
  description:
    "An unofficial web client to query and display reports from Shadowserver",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle>Shadowserver Reports</CardTitle>
              <CardDescription>
                Unofficial web client to query and display reports from the
                Shadowserver API. See{" "}
                <a
                  href={`https://github.com/jnimmo/shadowserverreports/tree/main/`}
                  target="_blank"
                  className="underline hover:no-underline"
                >
                  Github
                </a>{" "}
                for more information.
              </CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
