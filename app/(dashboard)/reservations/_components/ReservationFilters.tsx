'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, Filter, X } from 'lucide-react';
import { ReservationFilters } from '@/types/reservation';

interface ReservationFiltersProps {
  onFiltersChange?: (filters: ReservationFilters) => void;
}

export default function ReservationFilters({ onFiltersChange }: ReservationFiltersProps) {
  const [filters, setFilters] = useState<ReservationFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof ReservationFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFiltersChange?.({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="h-4 w-4 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="date-from">Date From</Label>
              <DatePicker
                id="date-from"
                value={filters.date_from}
                onChange={(date) => handleFilterChange('date_from', date)}
                placeholder="Select start date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Date To</Label>
              <DatePicker
                id="date-to"
                value={filters.date_to}
                onChange={(date) => handleFilterChange('date_to', date)}
                placeholder="Select end date"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status?.[0] || ''}
                onValueChange={(value) => handleFilterChange('status', value ? [value] : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="seated">Seated</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={filters.source?.[0] || ''}
                onValueChange={(value) => handleFilterChange('source', value ? [value] : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="Search by name"
                value={filters.customer_name || ''}
                onChange={(e) => handleFilterChange('customer_name', e.target.value)}
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Customer Phone</Label>
              <Input
                id="customer-phone"
                placeholder="Search by phone"
                value={filters.customer_phone || ''}
                onChange={(e) => handleFilterChange('customer_phone', e.target.value)}
              />
            </div>

            {/* Party Size Range */}
            <div className="space-y-2">
              <Label htmlFor="party-size-min">Min Party Size</Label>
              <Input
                id="party-size-min"
                type="number"
                placeholder="Min size"
                value={filters.party_size_min || ''}
                onChange={(e) => handleFilterChange('party_size_min', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-size-max">Max Party Size</Label>
              <Input
                id="party-size-max"
                type="number"
                placeholder="Max size"
                value={filters.party_size_max || ''}
                onChange={(e) => handleFilterChange('party_size_max', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
