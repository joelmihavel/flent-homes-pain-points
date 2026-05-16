import { tickets } from "@/lib/data";
import { Shell } from "@/components/Shell";
import HeatmapPage from "@/components/HeatmapPage";

export default function Heatmap() {
  return (
    <Shell>
      <HeatmapPage tickets={tickets} />
    </Shell>
  );
}
