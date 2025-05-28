// Simple, direct approach to check if member can be deleted
import { db } from './db';
import { donations, counts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function canDeleteMember(memberId: number, churchId: string): Promise<{
  canDelete: boolean;
  openCounts: string[];
}> {
  try {
    // Direct query: find any donations for this member in open counts
    const openDonations = await db
      .select({
        countName: counts.name
      })
      .from(donations)
      .innerJoin(counts, eq(donations.countId, counts.id))
      .where(
        and(
          eq(donations.memberId, memberId),
          eq(counts.churchId, churchId),
          eq(counts.status, 'OPEN')
        )
      );

    const uniqueCountNames = [...new Set(openDonations.map(d => d.countName))];

    return {
      canDelete: uniqueCountNames.length === 0,
      openCounts: uniqueCountNames
    };
  } catch (error) {
    console.error('Error checking member deletion:', error);
    // On error, be conservative and don't allow deletion
    return {
      canDelete: false,
      openCounts: ['Error checking counts']
    };
  }
}