import { NextResponse } from "next/server";
import { parse } from "marked";

export const revalidate = 86400;

async function fetchAndParseMarkdown() {
  // Replace with your GitHub raw markdown URL
  const url =
    "https://raw.githubusercontent.com/The-Shadowserver-Foundation/report_schema/refs/heads/main/types.md";
  const response = await fetch(url);
  const markdown = await response.text();

  // Parse markdown to HTML
  const html = parse(markdown) as string;

  // Extract table data using regex
  const tableRegex =
    /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g;
  const matches = [...html.matchAll(tableRegex)];

  // Convert to record set with separate URL field
  const records = matches.reduce((acc, match) => {
    const linkMatch = match[2].match(/<a href="([^"]+)">(.*?)<\/a>/);
    acc[match[1].trim()] = {
      description: linkMatch ? linkMatch[2].trim() : match[2].trim(),
      url: linkMatch ? linkMatch[1] : null,
      severity: match[3].trim(),
    };
    return acc;
  }, {} as Record<string, { description: string; url: string | null; severity: string }>);

  return records;
}

export async function GET() {
  try {
    const data = await fetchAndParseMarkdown();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-max-age=86400, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Failed to fetch and parse markdown",
      },
      { status: 500 }
    );
  }
}
