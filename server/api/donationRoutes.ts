import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Delete a donation
router.delete('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || !user.churchId) {
      console.error(`User with ID ${userId} not found or has no church ID`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    const donationId = parseInt(req.params.id);
    
    if (isNaN(donationId)) {
      return res.status(400).json({ message: 'Invalid donation ID' });  
    }
    
    // Delete the donation
    const deletedDonation = await storage.deleteDonation(donationId, user.churchId);
    
    if (!deletedDonation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    console.log(`Donation ${donationId} deleted successfully by user ${userId}`);
    res.json({ success: true, message: 'Donation deleted successfully', donation: deletedDonation });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

export default router;