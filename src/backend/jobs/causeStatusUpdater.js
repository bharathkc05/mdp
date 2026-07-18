import cron from 'node-cron';
import Cause from '../models/Cause.js';

/**
 * Scheduled job to automatically complete causes that have passed their end date
 * Runs every day at midnight (00:00)
 */
export const startCauseStatusUpdater = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      
      console.log(`[Cron Job] Running cause status updater at ${now.toISOString()}`);
      
      // Find and update causes that have ended but are still active
      const result = await Cause.updateMany(
        {
          status: 'active',
          endDate: { $exists: true, $lt: now }
        },
        {
          $set: { status: 'completed' }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`[Cron Job] ✅ Auto-completed ${result.modifiedCount} expired cause(s)`);
        
        // Log the updated causes for audit
        const completedCauses = await Cause.find({
          status: 'completed',
          endDate: { $exists: true, $lt: now },
          updatedAt: { $gte: new Date(Date.now() - 60000) } // Updated in last minute
        }).select('name endDate currentAmount targetAmount');
        
        completedCauses.forEach(cause => {
          console.log(`  - "${cause.name}" (ended: ${cause.endDate.toISOString().split('T')[0]}, raised: ₹${cause.currentAmount}/₹${cause.targetAmount})`);
        });
      } else {
        console.log(`[Cron Job] ℹ️  No expired causes found to complete`);
      }
    } catch (error) {
      console.error('[Cron Job] ❌ Error updating cause statuses:', error);
    }
  });
  
  console.log('✅ Cause status updater scheduled (runs daily at midnight)');
};

/**
 * Manual trigger for testing or immediate execution
 */
export const updateExpiredCauses = async () => {
  try {
    const now = new Date();
    
    const result = await Cause.updateMany(
      {
        status: 'active',
        endDate: { $exists: true, $lt: now }
      },
      {
        $set: { status: 'completed' }
      }
    );
    
    console.log(`[Manual Update] Completed ${result.modifiedCount} expired cause(s)`);
    return result;
  } catch (error) {
    console.error('[Manual Update] Error updating cause statuses:', error);
    throw error;
  }
};
