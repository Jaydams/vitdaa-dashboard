"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DownloadCloud } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/shared/DatePicker";
import { ORDER_STATUSES, ORDER_METHODS } from "@/constants/orders";

export default function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [method, setMethod] = useState(searchParams.get("method") || "");
  const [limit, setLimit] = useState(searchParams.get("limit") || "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined
  );

  const updateURL = (params: Record<string, string | undefined>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim() !== "") {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    // Reset to page 1 when filters change
    current.delete("page");

    const search = current.toString();
    const query = search ? `?${search}` : "";

    router.push(`/orders${query}`);
  };

  const handleFilter = () => {
    updateURL({
      search: search.trim(),
      status,
      method,
      limit,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    });
  };

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setMethod("");
    setLimit("");
    setStartDate(undefined);
    setEndDate(undefined);
    router.push("/orders");
  };
  return (
    <Card className="mb-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
          <Input
            type="search"
            placeholder="Search by customer name, invoice, or phone"
            className="h-12 md:basis-1/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFilter();
              }
            }}
          />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="capitalize md:basis-1/5">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {ORDER_STATUSES.map((statusOption) => (
                <SelectItem
                  value={statusOption}
                  key={statusOption}
                  className="capitalize"
                >
                  {statusOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger className="md:basis-1/5">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="">All Time</SelectItem>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="capitalize md:basis-1/5">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="">All Methods</SelectItem>
              {ORDER_METHODS.map((methodOption) => (
                <SelectItem
                  value={methodOption}
                  key={methodOption}
                  className="capitalize"
                >
                  {methodOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button className="h-12 flex-shrink-0 md:basis-1/5">
            Download <DownloadCloud className="ml-2 size-4" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-4 lg:gap-6">
          <div className="md:basis-[35%]">
            <Label className="text-muted-foreground font-normal">
              Start date
            </Label>
            <DatePicker date={startDate} onDateChange={setStartDate} />
          </div>

          <div className="md:basis-[35%]">
            <Label className="text-muted-foreground font-normal">
              End date
            </Label>
            <DatePicker date={endDate} onDateChange={setEndDate} />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-4 md:basis-[30%]">
            <Button size="lg" className="h-12 flex-grow" onClick={handleFilter}>
              Filter
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-12 flex-grow"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
