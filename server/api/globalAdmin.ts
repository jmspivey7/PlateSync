import { Router } from "express";
import { storage } from "../storage";
import { isGlobalAdmin } from "../middleware/globalAdminMiddleware";
import { Church, InsertChurch, insertChurchSchema } from "@shared/schema";
import { validateSchema } from "../middleware/validationMiddleware";

const router = Router();

// All routes in this file are protected by Global Admin middleware
router.use(isGlobalAdmin);

// Get all churches in the system
router.get("/churches", async (req, res) => {
  try {
    const churches = await storage.getAllChurches();
    res.json(churches);
  } catch (error) {
    console.error("Error fetching churches:", error);
    res.status(500).json({ message: "Failed to fetch churches" });
  }
});

// Get a specific church with detailed stats
router.get("/churches/:id", async (req, res) => {
  try {
    const church = await storage.getChurchWithStats(req.params.id);
    
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    res.json(church);
  } catch (error) {
    console.error(`Error fetching church ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to fetch church details" });
  }
});

// Create a new church
router.post("/churches", validateSchema(insertChurchSchema), async (req, res) => {
  try {
    const churchData = req.body as InsertChurch;
    const newChurch = await storage.createChurch(churchData);
    res.status(201).json(newChurch);
  } catch (error) {
    console.error("Error creating church:", error);
    res.status(500).json({ message: "Failed to create church" });
  }
});

// Update church details
router.patch("/churches/:id", async (req, res) => {
  try {
    const churchId = req.params.id;
    const updateData = req.body as Partial<Church>;
    
    // Remove any protected fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.deletedAt;
    delete updateData.archiveUrl;
    
    const updatedChurch = await storage.updateChurch(churchId, updateData);
    
    if (!updatedChurch) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    res.json(updatedChurch);
  } catch (error) {
    console.error(`Error updating church ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to update church" });
  }
});

// Suspend a church
router.post("/churches/:id/suspend", async (req, res) => {
  try {
    const churchId = req.params.id;
    const suspendedChurch = await storage.suspendChurch(churchId);
    
    if (!suspendedChurch) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    res.json({ 
      message: "Church suspended successfully", 
      church: suspendedChurch 
    });
  } catch (error) {
    console.error(`Error suspending church ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to suspend church" });
  }
});

// Activate a church
router.post("/churches/:id/activate", async (req, res) => {
  try {
    const churchId = req.params.id;
    const activatedChurch = await storage.activateChurch(churchId);
    
    if (!activatedChurch) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    res.json({ 
      message: "Church activated successfully", 
      church: activatedChurch 
    });
  } catch (error) {
    console.error(`Error activating church ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to activate church" });
  }
});

// Delete (archive) a church
router.delete("/churches/:id", async (req, res) => {
  try {
    const churchId = req.params.id;
    const result = await storage.deleteChurch(churchId);
    
    res.json({ 
      message: "Church deleted successfully",
      archiveUrl: result.archiveUrl
    });
  } catch (error) {
    console.error(`Error deleting church ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to delete church" });
  }
});

// Migrate existing churches to new churches table - one-time operation
router.post("/migrate-churches", async (req, res) => {
  try {
    const migratedCount = await storage.migrateDataToNewChurchTable();
    
    res.json({
      message: `Migration completed. ${migratedCount} churches migrated to new table.`
    });
  } catch (error) {
    console.error("Error migrating churches:", error);
    res.status(500).json({ message: "Failed to migrate churches" });
  }
});

export default router;