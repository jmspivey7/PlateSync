// Simple, straightforward donation deletion handler
const express = require('express');
const router = express.Router();

// Add the donation deletion endpoint
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const user = await req.app.locals.storage.getUser(userId);
    if (!user || !user.churchId) {
      return res.status(404).json({ message: 'User not found or has no church ID' });
    }
    
    const donationId = parseInt(req.params.id);
    if (isNaN(donationId)) {
      return res.status(400).json({ message: 'Invalid donation ID' });
    }
    
    // Delete the donation from the database
    const deletedDonation = await req.app.locals.storage.deleteDonation(donationId, user.churchId);
    
    if (!deletedDonation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    console.log(`Donation ${donationId} deleted successfully`);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting donation:', error);
    return res.status(500).json({ message: 'Server error deleting donation' });
  }
});

module.exports = router;
