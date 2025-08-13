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

export default function StaffFilters({ onOpenCreateDialog }: StaffFiltersProps) {
  return (
    <Card className="mb-5">
      <form className="flex flex-col md:flex-row gap-4 lg:gap-6">
        <Input
          type="search"
          placeholder="Search by name, email or phone"
          className="h-12 md:basis-1/3"
        />

        <Select>
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
          className="h-12 md:basis-1/3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
          onClick={onOpenCreateDialog}
          type="button"
        >
          <Plus className="mr-2 size-4" /> Add Staff
        </Button>

        <div className="flex flex-wrap sm:flex-nowrap gap-4">
          <Button size="lg" className="flex-grow">
            Filter
          </Button>
          <Button size="lg" variant="secondary" className="flex-grow">
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
