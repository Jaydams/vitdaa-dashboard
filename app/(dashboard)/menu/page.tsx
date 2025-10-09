import { Metadata } from "next";

// Assuming these are correctly aliased in your tsconfig.json
import PageTitle from "@/components/shared/PageTitle";
import MenuActions from "./_components/MenuActions";
import MenuFilters from "./_components/MenuFilters";
import { fetchMenu } from "@/data/menu";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { MenuGridWithOrder } from "./_components/MenuGridWithOrder";

// Import your new server action

export const metadata: Metadata = {
  title: "Menu",
};

interface MenuPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  // Get ownerId from business owner session (server-side)
  const ownerId = await getServerBusinessOwnerId();
  if (!ownerId) {
    throw new Error(
      "No business owner session found. Please sign in as a business owner."
    );
  }

  // Extract search parameters
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;

  // Fetch initial data using the server action, filtered by ownerId and search
  const { data: menuItems, ...pagination } = await fetchMenu({
    page,
    perPage: 10,
    ownerId,
    search,
  });

  return (
    <section>
      <PageTitle>Menus</PageTitle>

      {/* These remain client components for UI interactivity */}
      <MenuActions />
      <MenuFilters />

      {/* New grid layout with integrated order functionality */}
      <MenuGridWithOrder
        initialData={menuItems}
        initialPagination={pagination}
        ownerId={ownerId}
      />
    </section>
  );
}
