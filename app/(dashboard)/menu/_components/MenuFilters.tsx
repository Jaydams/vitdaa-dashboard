"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function MenuFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize search term from URL params
  useEffect(() => {
    const search = searchParams.get("search") || "";
    setSearchTerm(search);
  }, [searchParams]);

  /**
   * Handles the filter form submission.
   * Updates URL search parameters to trigger data refetch in the grid component.
   */
  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams.toString());

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }

    // Reset to page 1 when filtering
    params.set("page", "1");

    router.push(`/menu?${params.toString()}`);
  };

  /**
   * Handles resetting the filter form.
   * Clears all filter parameters from URL.
   */
  const handleReset = () => {
    setSearchTerm("");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.set("page", "1");

    router.push(`/menu?${params.toString()}`);
  };

  return (
    <Card className="mb-5">
      <form
        className="flex flex-col md:flex-row gap-4 lg:gap-6"
        onSubmit={handleFilter}
      >
        <Input
          type="search"
          placeholder="Search menu item by name..."
          className="h-12 md:basis-[60%]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex flex-wrap sm:flex-nowrap gap-4 md:basis-[40%]">
          <Button size="lg" className="flex-grow" type="submit">
            Filter
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-grow"
            type="button"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
