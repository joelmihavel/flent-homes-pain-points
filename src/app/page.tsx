import { tickets } from "@/lib/data";
import { Shell } from "@/components/Shell";
import { PainPointsPage } from "@/components/PainPointsPage";

export default function Home() {
  return (
    <Shell>
      <PainPointsPage tickets={tickets} />
    </Shell>
  );
}
