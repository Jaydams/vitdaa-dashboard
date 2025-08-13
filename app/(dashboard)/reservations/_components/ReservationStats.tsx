'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ReservationStats } from '@/types/reservation';
import { formatAmount } from '@/helpers/formatAmount';

interface ReservationStatsProps {
  stats: ReservationStats;
}

export default function ReservationStats({ stats }: ReservationStatsProps) {
  const cards = [
    {
      title: 'Total Reservations',
      value: stats.total_reservations,
      description: 'All time reservations',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Today',
      value: stats.today_reservations,
      description: "Today's reservations",
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed_reservations,
      description: 'Confirmed reservations',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Revenue',
      value: formatAmount(stats.total_revenue),
      description: 'Total revenue from reservations',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Avg Party Size',
      value: stats.average_party_size.toFixed(1),
      description: 'Average guests per reservation',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Upcoming',
      value: stats.upcoming_reservations,
      description: 'Future reservations',
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
