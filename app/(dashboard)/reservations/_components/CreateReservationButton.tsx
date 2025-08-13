'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CreateReservationDialog from './CreateReservationDialog';

export default function CreateReservationButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Reservation
      </Button>
      <CreateReservationDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
