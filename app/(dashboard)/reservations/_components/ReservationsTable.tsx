'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { MoreHorizontal, Edit, Trash2, Eye, Calendar, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReservation, updateReservationStatus } from '@/actions/reservation-actions';
import { Reservation } from '@/types/reservation';
import { formatAmount } from '@/helpers/formatAmount';

interface ReservationsTableProps {
  initialReservations: Reservation[];
}

export default function ReservationsTable({ initialReservations }: ReservationsTableProps) {
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [loading, setLoading] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      seated: { color: 'bg-blue-100 text-blue-800', label: 'Seated' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      no_show: { color: 'bg-orange-100 text-orange-800', label: 'No Show' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: string) => {
    const sourceConfig = {
      phone: { color: 'bg-blue-100 text-blue-800', label: 'Phone' },
      online: { color: 'bg-green-100 text-green-800', label: 'Online' },
      walk_in: { color: 'bg-purple-100 text-purple-800', label: 'Walk-in' },
      third_party: { color: 'bg-orange-100 text-orange-800', label: 'Third Party' },
    };

    const config = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.phone;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    setLoading(reservationId);
    try {
      await updateReservationStatus(reservationId, newStatus);
      setReservations(prev => 
        prev.map(res => 
          res.id === reservationId ? { ...res, status: newStatus as any } : res
        )
      );
      toast.success('Reservation status updated successfully');
    } catch (error) {
      toast.error('Failed to update reservation status');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (reservationId: string) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    
    setLoading(reservationId);
    try {
      await deleteReservation(reservationId);
      setReservations(prev => prev.filter(res => res.id !== reservationId));
      toast.success('Reservation deleted successfully');
    } catch (error) {
      toast.error('Failed to delete reservation');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Party Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No reservations found
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reservation.customer_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {reservation.customer_phone}
                        </div>
                        {reservation.customer_email && (
                          <div className="text-sm text-muted-foreground">
                            {reservation.customer_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(reservation.reservation_date)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reservation.venue?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {reservation.venue?.venue_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{reservation.party_size} guests</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(reservation.status)}
                    </TableCell>
                    <TableCell>
                      {getSourceBadge(reservation.source)}
                    </TableCell>
                    <TableCell>
                      {reservation.total_amount > 0 ? formatAmount(reservation.total_amount) : '-'}
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
                          <DropdownMenuItem onClick={() => router.push(`/reservations/${reservation.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/reservations/${reservation.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          
                          {/* Status Change Options */}
                          {reservation.status !== 'confirmed' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                              disabled={loading === reservation.id}
                            >
                              <Badge className="mr-2 h-4 w-4 bg-green-100 text-green-800">✓</Badge>
                              Mark Confirmed
                            </DropdownMenuItem>
                          )}
                          
                          {reservation.status !== 'seated' && reservation.status === 'confirmed' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(reservation.id, 'seated')}
                              disabled={loading === reservation.id}
                            >
                              <Badge className="mr-2 h-4 w-4 bg-blue-100 text-blue-800">👥</Badge>
                              Mark Seated
                            </DropdownMenuItem>
                          )}
                          
                          {reservation.status !== 'completed' && (reservation.status === 'seated' || reservation.status === 'confirmed') && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(reservation.id, 'completed')}
                              disabled={loading === reservation.id}
                            >
                              <Badge className="mr-2 h-4 w-4 bg-gray-100 text-gray-800">✓</Badge>
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          
                          {reservation.status !== 'cancelled' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                              disabled={loading === reservation.id}
                            >
                              <Badge className="mr-2 h-4 w-4 bg-red-100 text-red-800">✕</Badge>
                              Cancel
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => handleDelete(reservation.id)}
                            disabled={loading === reservation.id}
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
