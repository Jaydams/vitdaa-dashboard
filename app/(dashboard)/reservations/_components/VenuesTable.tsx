'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { ReservationVenue } from '@/types/reservation';

interface VenuesTableProps {
  initialVenues: ReservationVenue[];
}

export default function VenuesTable({ initialVenues }: VenuesTableProps) {

  const [venues, setVenues] = useState<ReservationVenue[]>(initialVenues);
  const [loading, setLoading] = useState<string | null>(null);

  const getVenueTypeBadge = (venueType: string) => {
    const typeConfig = {
      table: { color: 'bg-blue-100 text-blue-800', label: 'Table' },
      room: { color: 'bg-green-100 text-green-800', label: 'Room' },
      hall: { color: 'bg-purple-100 text-purple-800', label: 'Hall' },
      outdoor: { color: 'bg-orange-100 text-orange-800', label: 'Outdoor' },
      private: { color: 'bg-indigo-100 text-indigo-800', label: 'Private' },
      bar: { color: 'bg-pink-100 text-pink-800', label: 'Bar' },
    };

    const config = typeConfig[venueType as keyof typeof typeConfig] || typeConfig.table;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const handleDelete = async (venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    
    setLoading(venueId);
    try {
      // TODO: Implement delete venue action
      setVenues(prev => prev.filter(venue => venue.id !== venueId));
      toast.success('Venue deleted successfully');
    } catch (error) {
      toast.error('Failed to delete venue');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venues</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No venues found. Create your first venue to get started.
                  </TableCell>
                </TableRow>
              ) : (
                venues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{venue.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getVenueTypeBadge(venue.venue_type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{venue.capacity} guests</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(venue.is_active)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {venue.description || 'No description'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Venue
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(venue.id)}
                            disabled={loading === venue.id}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
