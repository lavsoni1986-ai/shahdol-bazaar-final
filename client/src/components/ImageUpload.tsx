import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, X, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// =========================================================================
// 🔑 STEP 1: APNI CLOUDINARY DETAILS YAHAN BHAREIN (DASHBOARD SE DEKH KAR)
// =========================================================================
const CLOUD_NAME = "dbz0kkwaj";     // <--- Dashboard se 'Cloud Name' yahan copy karein
const UPLOAD_PRESET = "shahdol_preset"; // <--- Settings -> Upload -> Presets se 'Unsigned' wala yahan likhein
// =========================================================================

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  label?: string;
}

declare global {
  interface Window {
    cloudinary: any;
  }
}

export const ImageUpload = ({ value, onChange, onRemove, label }: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const cleanupUIFreeze = useCallback(() => {
    // UI Freeze Fix: Forcefully restore scroll and interaction
    document.body.style.overflow = "auto";
    document.body.style.pointerEvents = "auto";
    document.documentElement.style.overflow = "auto";
    console.log("🛠️ UI Scroll/Interaction Forcefully Restored");
  }, []);

  useEffect(() => {
    if (!window.cloudinary) {
      console.warn("Cloudinary script not found. It should be in index.html");
    }
    return () => cleanupUIFreeze();
  }, [cleanupUIFreeze]);

  const handleUpload = useCallback(() => {
    if (!window.cloudinary) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cloudinary is not loaded. Please refresh.",
      });
      return;
    }

    setIsUploading(true);

    const myWidget = window.cloudinary.createUploadWidget(
      {
        sources: ["local", "camera", "url"],
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        unsigned: true, 
        multiple: false,
        maxFiles: 1,
        zIndex: 99999,
        showCompleted: true,
        clientAllowedFormats: ["jpg", "png", "jpeg", "webp"],
        cropping: false,
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#F97316",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#F97316",
            action: "#F97316",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#F97316",
            complete: "#20B832",
            sourceBg: "#E4EBF1"
          },
          frame: {
            zIndex: 99999
          }
        }
      },
      (error: any, result: any) => {
        // Detailed log for debugging
        if (result && result.event) {
          console.log("📡 Cloudinary Event:", result.event);
          console.log("Full Cloudinary Result:", result);
          
          // Widget load hote hi pointer-events restore karo
          if (result.event === "widget-opened" || result.event === "shown") {
            console.log("🔓 Widget Opened - Restoring Interaction");
            cleanupUIFreeze();
          }
        }

        if (error) {
          console.error("❌ Cloudinary Error:", error);
          cleanupUIFreeze();
          setIsUploading(false);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: error.message || "Upload mein galti hui.",
          });
          return;
        }

        if (result && result.event === "success") {
          console.log("✅ UPLOAD SUCCESS! URL:", result.info.secure_url);
          onChange(result.info.secure_url);
          setIsUploading(false);
          cleanupUIFreeze();
          toast({ title: "Photo upload ho gayi! ✅" });
        }
        
        // Ensure UI is unfrozen on any close/hide event
        if (result && (
          result.event === "close" || 
          result.event === "display-changed" && result.info === "hidden" ||
          result.event === "widget-closed"
        )) {
          console.log("🔒 Widget Closed - Cleaning up UI");
          setIsUploading(false);
          cleanupUIFreeze();
        }
      }
    );

    console.log("🚀 Launching Cloudinary Widget...");
    console.log("Cloud Name:", CLOUD_NAME);
    console.log("Upload Preset:", UPLOAD_PRESET);
    
    myWidget.open();

    // Forcefully restore pointer events immediately after opening
    // This fixes cases where the underlying modal locks the UI
    setTimeout(() => {
      cleanupUIFreeze();
      console.log("⚡ Forceful UI Unlock triggered after open");
    }, 500);
  }, [onChange, toast, cleanupUIFreeze]);

  return (
    <div className="space-y-3 w-full">
      {label && <label className="text-sm font-bold text-slate-700">{label}</label>}
      
      {value ? (
        <div className="relative group">
          <div className="relative h-36 w-full rounded-xl overflow-hidden border-2 border-orange-100 shadow-inner bg-slate-50">
            <img 
              src={value} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
              alt="Preview" 
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full bg-white/90 hover:bg-white text-orange-600 font-bold"
                onClick={handleUpload}
                type="button"
               >
                 Change Photo
               </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={handleUpload}
          className="relative h-48 w-full rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all group overflow-hidden"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Opening Widget...</p>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-orange-50/0 group-hover:bg-orange-50/10 transition-colors" />
              <div className="p-4 bg-orange-100 rounded-full text-orange-600 group-hover:scale-110 transition-transform mb-3 shadow-sm">
                <Camera size={32} />
              </div>
              <div className="text-center px-4 relative z-10">
                <p className="font-bold text-slate-800">Dukan ki Photo Upload Karein</p>
                <p className="text-xs text-slate-500 mt-1">Camera se kheenchiye ya Gallery se chunein</p>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Mobile Friendly</span>
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Cloudinary Secure</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

