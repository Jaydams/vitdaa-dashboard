'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CreateVenueDialog from './CreateVenueDialog';

export default function CreateVenueButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Venue
      </Button>
      <CreateVenueDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
