import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GearIcon } from "@radix-ui/react-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { setApiConfig } from "../app/actions/api-key";
export function SettingsModal() {
  const [apiKey, setApiKeyState] = useState("");
  const [apiSecret, setApiSecretState] = useState("");
  // Default Geo filter state
  const [defaultGeo, setDefaultGeo] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("default-geo") || "NZ";
    }
    return "NZ";
  });

  const handleSave = async () => {
    await setApiConfig(apiKey, apiSecret);
    setApiKeyState("");
    setApiSecretState("");
    if (typeof window !== "undefined") {
      localStorage.setItem("default-geo", defaultGeo || "NZ");
    }
    window.location.reload();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <GearIcon />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Enter your Shadowserver API key here. This key will only be stored
            in your web browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              API Key
            </Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              API Secret
            </Label>
            <Input
              id="api-secret"
              value={apiSecret}
              onChange={(e) => setApiSecretState(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="default-geo" className="text-right">
              Default Geo Filter
            </Label>
            <Input
              id="default-geo"
              value={defaultGeo}
              onChange={(e) => setDefaultGeo(e.target.value)}
              className="col-span-3"
              placeholder="e.g. NZ"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit" onClick={handleSave}>
              Save changes
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
