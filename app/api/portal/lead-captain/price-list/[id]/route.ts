// =====================================================
// PORTAL LEAD CAPTAIN PRICE LIST BY ID API
// PATCH /api/portal/lead-captain/price-list/[id] - Update price item
// DELETE /api/portal/lead-captain/price-list/[id] - Delete price item
// =====================================================

import { NextResponse } from 'next/server';

export async function PATCH() {
  // SECURITY: Portal customers must not modify business price lists.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });
}

export async function DELETE() {
  // SECURITY: Portal customers must not delete business price lists.
  return NextResponse.json({ error: 'Endpoint disabled for security reasons' }, { status: 403 });
}
