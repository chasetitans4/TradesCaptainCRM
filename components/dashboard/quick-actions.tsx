'use client';

import Link from 'next/link';
import { Plus, UserPlus, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function QuickActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Quick Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/customers/new" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            New Customer
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/jobs/new" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            New Job
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/leads/new" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            New Lead
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/quotes/new" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            New Quote
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/invoices/new" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            New Invoice
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
