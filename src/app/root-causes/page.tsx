import { tickets } from "@/lib/data";
import { Shell } from "@/components/Shell";
import { RootCausesPage } from "@/components/RootCausesPage";

export default function RootCauses() {
  return (
    <Shell>
      <RootCausesPage tickets={tickets} />
    </Shell>
  );
}
