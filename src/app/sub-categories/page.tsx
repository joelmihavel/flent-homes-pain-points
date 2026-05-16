import { tickets } from "@/lib/data";
import { Shell } from "@/components/Shell";
import { SubCategoriesPage } from "@/components/SubCategoriesPage";

export default function SubCategories() {
  return (
    <Shell>
      <SubCategoriesPage tickets={tickets} />
    </Shell>
  );
}
