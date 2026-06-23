
import DetailsSidebar from "./details/DetailsSidebar";
import { InstalledWallpaper, WorkshopItem } from "@/types/workshop";

interface CommonProps {
  onClose: () => void;
}

interface WorkshopProps extends CommonProps {
  kind: "workshop";
  item: WorkshopItem | null;
  onDownload: (item: WorkshopItem) => void;
}

interface InstalledProps extends CommonProps {
  kind: "installed";
  item: InstalledWallpaper | null;
  onApply: (item: InstalledWallpaper) => void;
  onExtract: (item: InstalledWallpaper) => void;
  onDelete: (item: InstalledWallpaper) => void;
  onOpenFolder: (item: InstalledWallpaper) => void;
  onCopyId: (item: InstalledWallpaper) => void;
}

type Props = WorkshopProps | InstalledProps;

export default function DetailsPanel(props: Props) {
  return <DetailsSidebar {...props} />;
}
