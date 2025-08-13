import { Metadata } from "next";

import PageTitle from "@/components/shared/PageTitle";

import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import CategoryActions from "./_components/CategoryActions";
import AllCategories from "./_components/categories-table";

export const metadata: Metadata = {
  title: "Categories",
};

export default async function CategoriesPage() {
  const ownerId = await getServerBusinessOwnerId();
  if (!ownerId) {
    throw new Error(
      "No business owner session found. Please sign in as a business owner."
    );
  }
  return (
    <section>
      <PageTitle>Menus</PageTitle>
      <CategoryActions ownerId={ownerId} />
      <AllCategories ownerId={ownerId} />
    </section>
  );
}
