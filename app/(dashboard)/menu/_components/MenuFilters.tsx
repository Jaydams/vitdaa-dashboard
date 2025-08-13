"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query"; // Kept useQuery in case you add client-side category fetching later

// Assuming correct alias paths
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";

import { useState } from "react";

export default function MenuFilters() {
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Handles the filter form submission.
   * In a full Next.js application with server-side filtering,
   * you would update the URL search parameters here.
   * For example: `router.push(`/menu?page=1&search=${searchTerm}`);`
   */
  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    console.log("Filtering by search term:", searchTerm);
    // TODO: Implement actual filtering logic, likely by updating URL search params
    // and letting the server component (page.tsx) re-fetch data based on them.
  };

  /**
   * Handles resetting the filter form.
   * Clears the search term.
   */
  const handleReset = () => {
    setSearchTerm(""); // Clear the input field
    console.log("Resetting filters");
    // TODO: Implement actual reset logic, e.g., clearing URL search params
    // and letting the server component re-fetch default data.
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
