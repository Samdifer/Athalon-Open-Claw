import { useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md gap-2 p-0 overflow-hidden">
        <video
          ref={videoRef}
          src="/STG_boost.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full rounded-t-lg"
        />
        <div className="px-6 pt-2 pb-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome</h2>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Enter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
