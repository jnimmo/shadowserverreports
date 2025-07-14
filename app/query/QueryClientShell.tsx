"use client";

import { useRef, useState, useTransition, Suspense } from "react";
import GridComponent from "./GridComponent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { takeScreenshot } from "../actions/screenshot";
import { RefObject } from "react";

export default function QueryClientShell() {
  const formRef = useRef<HTMLFormElement>(null) as RefObject<HTMLFormElement>;
  const [modalOpen, setModalOpen] = useState(false);
  const [screenshotIp, setScreenshotIp] = useState<string>("");
  const [screenshotPort, setScreenshotPort] = useState<
    string | number | undefined
  >(undefined);
  const [screenshotHostname, setScreenshotHostname] = useState<string>("");
  const [originalHostname, setOriginalHostname] = useState<string>("");
  const [ssl, setSsl] = useState<boolean>(false);
  const [resolvedIp, setResolvedIp] = useState<string>("");
  const [resolveError, setResolveError] = useState<string>("");
  const [isResolving, setIsResolving] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [result, setResult] = useState<{
    image?: string;
    error?: string;
    contentType?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Called by GridComponent to trigger screenshot modal and form submit
  const handleScreenshotRequest = (args: {
    ip: string;
    port?: string | number;
    hostname?: string;
    ssl: boolean;
  }) => {
    setScreenshotIp(args.ip);
    setScreenshotPort(args.port);
    setOriginalHostname(args.hostname || "");
    setScreenshotHostname(""); // override input is empty by default
    setSsl(args.ssl);
    setResult(null);
    setResolvedIp("");
    setResolveError("");
    setModalOpen(true);
    // If SSL and original hostname, resolve it and set URL accordingly
    if (args.ssl && args.hostname) {
      resolveAndSet(args.hostname, true).then((resolved) => {
        // If resolved IP matches, use hostname in URL, else use IP
        setScreenshotUrl(
          resolved && resolved === args.ip
            ? makeUrl(args.hostname!, args.port, args.ssl)
            : makeUrl(args.ip, args.port, args.ssl)
        );
      });
    } else {
      setScreenshotUrl(makeUrl(args.ip, args.port, args.ssl));
    }
  };

  // Helper to construct the screenshot URL
  function makeUrl(host: string, port?: string | number, ssl?: boolean) {
    const scheme = ssl ? "https://" : "http://";
    return port ? `${scheme}${host}:${port}` : `${scheme}${host}`;
  }

  // Helper to resolve hostname and set state
  async function resolveAndSet(
    hostname: string,
    isOriginal = false
  ): Promise<string | undefined> {
    if (!hostname) {
      setResolvedIp("");
      setResolveError("");
      return;
    }
    setIsResolving(true);
    setResolveError("");
    setResolvedIp("");
    try {
      const res = await fetch("/api/resolve-hostname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname }),
      });
      const data = await res.json();
      if (data.ip) {
        setResolvedIp(data.ip);
        // Only validate if this is an override (not the original hostname)
        if (!isOriginal && screenshotIp && data.ip !== screenshotIp) {
          setResolveError(
            `Resolved IP (${data.ip}) does not match original IP (${screenshotIp})`
          );
        }
        return data.ip;
      } else {
        setResolveError("No A record found");
      }
    } catch {
      setResolveError("Failed to resolve hostname");
    } finally {
      setIsResolving(false);
    }
  }

  async function action(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await takeScreenshot(formData);
      // Normalize result for type safety
      if (res && typeof res === "object") {
        setResult({
          image: typeof res.image === "string" ? res.image : undefined,
          error: typeof res.error === "string" ? res.error : undefined,
          contentType:
            typeof res.contentType === "string" ? res.contentType : undefined,
        });
      } else {
        setResult({ error: "Unknown error" });
      }
    });
  }

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <GridComponent onScreenshotRequest={handleScreenshotRequest} />
      </Suspense>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Take Screenshot</DialogTitle>
            <DialogDescription>
              Enter the URL to screenshot (auto-filled from context menu).
              <br />
              <div className="mt-2">
                <b>Screenshot URL:</b> {screenshotUrl}
              </div>
              {originalHostname && (
                <>
                  <div className="mt-2">
                    <b>Original Hostname:</b> {originalHostname}
                  </div>
                  <div>
                    <b>Original IP:</b> {screenshotIp}
                  </div>
                </>
              )}
              <div className="mt-2">
                <label htmlFor="custom-hostname">
                  <b>Override Hostname (optional):</b>
                </label>
                <input
                  id="custom-hostname"
                  className="border px-2 py-1 ml-2"
                  type="text"
                  value={screenshotHostname}
                  onChange={(e) => {
                    setScreenshotHostname(e.target.value);
                  }}
                  onBlur={async (e) => {
                    const override = e.target.value.trim();
                    if (override) {
                      const resolved = await resolveAndSet(override, false);
                      // If valid, update screenshotUrl to use override hostname
                      if (resolved && resolved === screenshotIp) {
                        setScreenshotUrl(
                          makeUrl(override, screenshotPort, ssl)
                        );
                      } else {
                        setScreenshotUrl(
                          makeUrl(screenshotIp, screenshotPort, ssl)
                        );
                      }
                    } else {
                      // If override is cleared, use original logic
                      if (ssl && originalHostname) {
                        const resolved = await resolveAndSet(
                          originalHostname,
                          true
                        );
                        setScreenshotUrl(
                          resolved && resolved === screenshotIp
                            ? makeUrl(originalHostname, screenshotPort, ssl)
                            : makeUrl(screenshotIp, screenshotPort, ssl)
                        );
                      } else {
                        setScreenshotUrl(
                          makeUrl(screenshotIp, screenshotPort, ssl)
                        );
                      }
                    }
                  }}
                  placeholder="Enter hostname"
                  style={{ minWidth: 200 }}
                />
                {isResolving && (
                  <span className="ml-2 text-gray-500">(resolving...)</span>
                )}
                {resolvedIp && screenshotHostname.trim() !== "" && (
                  <span
                    className={
                      resolvedIp === screenshotIp
                        ? "ml-2 text-green-700"
                        : "ml-2 text-red-600"
                    }
                  >
                    Resolves to: {resolvedIp}
                  </span>
                )}
                {resolveError && (
                  <span className="ml-2 text-red-600">{resolveError}</span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <form ref={formRef} id="screenshot-form" action={action}>
            <input type="hidden" name="url" value={screenshotUrl} />
            <input type="hidden" name="hostname" value={screenshotHostname} />
          </form>
          {isPending && (
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <span>Taking screenshot...</span>
            </div>
          )}
          {result?.image && (
            <div className="flex flex-col items-center gap-2">
              <img
                src={`data:${result.contentType || "image/png"};base64,${
                  result.image
                }`}
                alt="Screenshot"
                style={{ maxWidth: "100%", maxHeight: 400 }}
              />
              <span>Screenshot complete.</span>
            </div>
          )}
          {result?.error && (
            <div className="text-red-500">Error: {result.error}</div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              form="screenshot-form"
              disabled={
                !screenshotUrl ||
                !!isResolving ||
                // If override is entered, require valid resolution and match
                (!!screenshotHostname &&
                  screenshotHostname.trim() !== "" &&
                  (!resolvedIp || !!resolveError))
              }
            >
              Take Screenshot
            </Button>
            <DialogClose asChild>
              <Button type="button" onClick={() => setResult(null)}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
