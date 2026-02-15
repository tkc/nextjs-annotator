import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ImageSidebarViewProps {
  images: readonly string[];
  currentImage: string | null;
  onSelectImage: (filename: string) => void;
}

export function ImageSidebarView({ images, currentImage, onSelectImage }: ImageSidebarViewProps) {
  const currentIndex = currentImage ? images.indexOf(currentImage) : -1;

  return (
    <div className="w-48 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold">Images</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {currentIndex >= 0 ? `${currentIndex + 1} / ${images.length}` : `${images.length} files`}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {images.map((file, i) => (
            <button
              type="button"
              key={file}
              onClick={() => onSelectImage(file)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-xs truncate transition-colors",
                file === currentImage ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <span className="text-muted-foreground mr-1">{i + 1}.</span>
              {file}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
