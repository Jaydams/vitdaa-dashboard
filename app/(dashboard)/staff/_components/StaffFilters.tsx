"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

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

interface StaffFiltersProps {
  onOpenCreateDialog?: () => void;
}

export default function StaffFilters({
  onOpenCreateDialog,
}: StaffFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  const handleReset = () => {
    setSearchTerm("");
    setSelectedRole("");
  };

  return (
    <Card className="mb-5">
      <form className="flex flex-col md:flex-row gap-4 lg:gap-6">
        <Input
          type="search"
          placeholder="Search by name, email or phone"
          className="h-12 md:basis-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="md:basis-1/3">
            <SelectValue placeholder="Role" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="reception">Reception</SelectItem>
            <SelectItem value="kitchen">Kitchen</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
            <SelectItem value="accountant">Accountant</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="lg"
          className="h-12 md:basis-1/3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
          onClick={onOpenCreateDialog}
          type="button"
        >
          <Plus className="mr-2 size-4" /> Add Staff
        </Button>

        <div className="flex flex-wrap sm:flex-nowrap gap-4">
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
