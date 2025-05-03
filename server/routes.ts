import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { sendDonationNotification } from "./sendgrid";
import { z } from "zod";
import { 
  insertMemberSchema, 
  insertDonationSchema,
  donationTypeEnum,
  notificationStatusEnum,
  updateUserSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Church settings routes
  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserSettings(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Members routes
  app.get('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getMembers(userId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.get('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      
      const member = await storage.getMemberWithDonations(memberId, userId);
      
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.post('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberData = { ...req.body, churchId: userId };
      
      const validatedData = insertMemberSchema.parse(memberData);
      const newMember = await storage.createMember(validatedData);
      
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  app.patch('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      
      const validatedData = insertMemberSchema.partial().parse(req.body);
      const updatedMember = await storage.updateMember(memberId, validatedData, userId);
      
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Donations routes
  app.get('/api/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donations = await storage.getDonationsWithMembers(userId);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  app.get('/api/donations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donationId = parseInt(req.params.id);
      
      if (isNaN(donationId)) {
        return res.status(400).json({ message: "Invalid donation ID" });
      }
      
      const donation = await storage.getDonation(donationId, userId);
      
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      res.json(donation);
    } catch (error) {
      console.error("Error fetching donation:", error);
      res.status(500).json({ message: "Failed to fetch donation" });
    }
  });

  app.post('/api/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donationData = { 
        ...req.body, 
        churchId: userId, 
        // Ensure proper format for donation type
        donationType: req.body.donationType?.toUpperCase(),
        // Convert string date to Date object
        date: new Date(req.body.date)
      };
      
      const validatedData = insertDonationSchema.parse(donationData);
      
      // Create the donation
      const newDonation = await storage.createDonation(validatedData);
      
      // Send notification if requested and if it's not an anonymous donation
      if (req.body.sendNotification && validatedData.memberId) {
        try {
          const member = await storage.getMember(validatedData.memberId, userId);
          const user = await storage.getUser(userId);
          
          if (member && member.email && user) {
            const churchName = user.churchName || "Our Church";
            
            // Send email notification via SendGrid
            const notificationSent = await sendDonationNotification({
              to: member.email,
              amount: validatedData.amount.toString(),
              date: validatedData.date instanceof Date ? validatedData.date.toLocaleDateString() : new Date().toLocaleDateString(),
              donorName: `${member.firstName} ${member.lastName}`,
              churchName: churchName,
            });
            
            // Update donation notification status
            if (notificationSent) {
              await storage.updateDonationNotificationStatus(
                newDonation.id, 
                notificationStatusEnum.enum.SENT
              );
            } else {
              await storage.updateDonationNotificationStatus(
                newDonation.id, 
                notificationStatusEnum.enum.FAILED
              );
            }
          } else {
            await storage.updateDonationNotificationStatus(
              newDonation.id, 
              notificationStatusEnum.enum.NOT_REQUIRED
            );
          }
        } catch (notificationError) {
          console.error("Error sending notification:", notificationError);
          await storage.updateDonationNotificationStatus(
            newDonation.id, 
            notificationStatusEnum.enum.FAILED
          );
        }
      } else {
        await storage.updateDonationNotificationStatus(
          newDonation.id, 
          notificationStatusEnum.enum.NOT_REQUIRED
        );
      }
      
      // Fetch the donation with updated notification status
      const finalDonation = await storage.getDonation(newDonation.id, userId);
      
      res.status(201).json(finalDonation);
    } catch (error) {
      console.error("Error creating donation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create donation" });
    }
  });

  // Dashboard statistics route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const todaysDonations = await storage.getTodaysDonations(userId);
      const weeklyDonations = await storage.getWeeklyDonations(userId);
      const monthlyDonations = await storage.getMonthlyDonations(userId);
      const activeDonors = await storage.getActiveDonorCount(userId);
      
      res.json({
        todaysDonations,
        weeklyDonations,
        monthlyDonations,
        activeDonors
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Test SendGrid configuration
  app.get('/api/test-sendgrid', isAuthenticated, async (req: any, res) => {
    try {
      const { testSendGridConfiguration } = await import('./sendgrid');
      const result = await testSendGridConfiguration();
      
      if (result) {
        res.json({ 
          success: true, 
          message: 'SendGrid configuration test passed! Your API key is valid and working properly.' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'SendGrid configuration test failed. Check the server logs for detailed error information.'
        });
      }
    } catch (error: any) {
      console.error('Error testing SendGrid:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error testing SendGrid: ${error.message || 'Unknown error'}` 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
