// Simple, direct approach to check if member can be deleted
import { db } from './db';
import { donations, batches } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function canDeleteMember(memberId: number, churchId: string): Promise<{
  canDelete: boolean;
  openCounts: string[];
}> {
  try {
    // Direct query: find any donations for this member in open batches
    const openDonations = await db
      .select({
        batchName: batches.name
      })
      .from(donations)
      .innerJoin(batches, eq(donations.batchId, batches.id))
      .where(
        and(
          eq(donations.memberId, memberId),
          eq(batches.churchId, churchId),
          eq(batches.status, 'OPEN')
        )
      );

    const uniqueBatchNames = [...new Set(openDonations.map(d => d.batchName))];

    return {
      canDelete: uniqueBatchNames.length === 0,
      openCounts: uniqueBatchNames
    };
  } catch (error) {
    console.error('Error checking member deletion:', error);
    // On error, be conservative and don't allow deletion
    return {
      canDelete: false,
      openCounts: ['Error checking batches']
    };
  }
}