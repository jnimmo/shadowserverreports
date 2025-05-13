import { getApiSettings } from "@/app/actions/api-key";
import { type NextRequest } from "next/server";
import Papa from "papaparse";

export async function GET(request: NextRequest) {
  const apiSettings = await getApiSettings();
  const reportId = request.nextUrl.searchParams.get("id");

  if (!apiSettings.key || !apiSettings.secret) {
    return Response.json({ error: "API key not set" }, { status: 403 });
  }

  if (!reportId) {
    return Response.json({ error: "Report ID not provided" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://dl.shadowserver.org/${reportId}`, {
      headers: {
        Authorization: `Bearer ${apiSettings.key}`,
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch report" },
        { status: response.status }
      );
    }

    const csvText = await response.text();
    const parsedData = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    return Response.json(parsedData.data, {
      headers: {
        "Cache-Control":
          "max-age=604800, s-maxage=604800, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Error processing report:", error);
    return Response.json(
      { error: "Failed to process report" },
      { status: 500 }
    );
  }
}
