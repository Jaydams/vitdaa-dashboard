import { Metadata } from "next";

// Assuming these are correctly aliased in your tsconfig.json
import PageTitle from "@/components/shared/PageTitle";
import AllMenu from "./_components/menus-table";
import MenuActions from "./_components/MenuActions";
import MenuFilters from "./_components/MenuFilters";
import { fetchMenu } from "@/data/menu";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

// Import your new server action

export const metadata: Metadata = {
  title: "Menu",
};

export default async function MenuPage() {
  // Get ownerId from business owner session (server-side)
  const ownerId = await getServerBusinessOwnerId();
  if (!ownerId) {
    throw new Error(
      "No business owner session found. Please sign in as a business owner."
    );
  }
  // Fetch initial data using the server action, filtered by ownerId
  const { data: menuItems, ...pagination } = await fetchMenu({
    page: 1,
    perPage: 10,
    ownerId,
  }); // Default to page 1

  return (
    <section>
      <PageTitle>Menus</PageTitle>

      {/* These remain client components for UI interactivity */}
      <MenuActions />
      <MenuFilters />

      {/* Pass the fetched data and pagination info to the client component */}
      <AllMenu
        initialData={menuItems}
        initialPagination={pagination}
        ownerId={ownerId}
      />
    </section>
  );
}
