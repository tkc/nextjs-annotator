"use client";

import { useShallow } from "zustand/react/shallow";
import { ImageSidebarView } from "@/components/views/image-sidebar-view";
import { useAnnotationStore } from "@/lib/stores/annotation-store";

export function ImageSidebar() {
  const { images, currentImage } = useAnnotationStore(
    useShallow((s) => ({ images: s.images, currentImage: s.currentImage })),
  );
  const setCurrentImage = useAnnotationStore((s) => s.setCurrentImage);

  return <ImageSidebarView images={images} currentImage={currentImage} onSelectImage={setCurrentImage} />;
}
