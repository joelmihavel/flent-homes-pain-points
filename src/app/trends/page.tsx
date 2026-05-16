import { tickets } from "@/lib/data";
import { Shell } from "@/components/Shell";
import { TrendsPage } from "@/components/TrendsPage";

export default function Trends() {
  return (
    <Shell>
      <TrendsPage tickets={tickets} />
    </Shell>
  );
}
