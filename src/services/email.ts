// Email service - Sends personalized deal emails via Resend
import { Resend } from 'resend';
import { supabase } from '../config/database.js';
import { generateEmailHTML } from '../templates/weeklyDeals.js';
import { DealForEmail } from '../types/index.js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send weekly deals to all users
 * - Fetches active deals from database
 * - Filters by user preferences
 * - Sends top 6 deals sorted by price
 */
export async function sendWeeklyDeals(): Promise<void> {
  console.log('📧 Sending weekly deals emails...\n');

  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');

  if (usersError || !users) {
    console.error('❌ Failed to fetch users:', usersError);
    return;
  }

  // Fetch all active deals with retailer and product info
  const today = new Date().toISOString().split('T')[0];
  const { data: allDeals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      *,
      retailers(name),
      products(name, size, category)
    `)
    .gte('end_date', today) // Only active deals
    .order('price', { ascending: true }); // Lowest price first

  if (dealsError || !allDeals) {
    console.error('❌ Failed to fetch deals:', dealsError);
    return;
  }

  console.log(`Found ${allDeals.length} active deals for ${users.length} users\n`);

  // Send email to each user
  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      // Filter deals by user's preferred retailers
      const userDeals = allDeals
        .filter((deal: any) => {
          // If no preferences, send all deals
          if (!user.preferred_retailers || user.preferred_retailers.length === 0) {
            return true;
          }
          // Otherwise, only deals from preferred retailers
          return user.preferred_retailers.includes(deal.retailers.name);
        })
        .slice(0, 6) // Top 6 deals only
        .map((deal: any) => ({
          retailer: deal.retailers.name,
          product: deal.products.name,
          size: deal.products.size,
          price: parseFloat(deal.price),
          start_date: deal.start_date,
          end_date: deal.end_date,
          category: deal.products.category,
        })) as DealForEmail[];

      // Skip if no matching deals
      if (userDeals.length === 0) {
        console.log(`  ⊘ ${user.name} - No matching deals (retailers: ${user.preferred_retailers?.join(', ') || 'none'})`);
        continue;
      }

      // Generate HTML email
      const html = generateEmailHTML(user.name, userDeals);

      // Send via Resend
      const { data, error: sendError } = await resend.emails.send({
        from: 'Prox Deals <deals@resend.dev>', // Use resend.dev for testing
        to: user.email,
        subject: `🎉 This Week's Best Deals - Save Big at Your Favorite Stores!`,
        html,
      });

      if (sendError) {
        failCount++;
        console.error(`  ✗ ${user.name} (${user.email}) - Failed: ${sendError.message}`);
      } else {
        successCount++;
        const retailers = [...new Set(userDeals.map(d => d.retailer))].join(', ');
        console.log(`  ✓ ${user.name} → ${userDeals.length} deals (${retailers})`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      failCount++;
      console.error(`  ✗ ${user.email} - Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Sent ${successCount} emails successfully`);
  if (failCount > 0) {
    console.log(`⚠️  ${failCount} emails failed\n`);
  } else {
    console.log('');
  }
}