import { NextResponse } from "next/server";
import { parse } from "marked";

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

  // Convert to record set
  const records = matches.map((match) => ({
    type: match[1].trim(),
    description: match[2].trim(),
    severity: match[3].trim(),
  }));

  return records;
}

export async function GET() {
  try {
    const data = await fetchAndParseMarkdown();
    return NextResponse.json(data);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch and parse markdown" },
      { status: 500 }
    );
  }
}
