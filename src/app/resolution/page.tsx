import { tickets } from "@/lib/data";
import { Shell } from "@/components/Shell";
import ResolutionPage from "@/components/ResolutionPage";

export default function Resolution() {
  return (
    <Shell>
      <ResolutionPage tickets={tickets} />
    </Shell>
  );
}
