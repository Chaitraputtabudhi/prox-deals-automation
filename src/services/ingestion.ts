// Ingestion service - Loads deals and users into Supabase
import { supabase } from '../config/database.js';
import { Deal, User } from '../types/index.js';

/**
 * Ingest deals into database with deduplication
 * Deduplication is based on: retailer + product + start_date (unique constraint)
 */
export async function ingestDeals(deals: Deal[]): Promise<void> {
  console.log('📥 Ingesting deals...\n');
  
  let inserted = 0;
  let skipped = 0;

  for (const deal of deals) {
    try {
      // Step 1: Get or create retailer
      let { data: retailer } = await supabase
        .from('retailers')
        .select('id')
        .eq('name', deal.retailer)
        .single();

      if (!retailer) {
        const { data: newRetailer, error } = await supabase
          .from('retailers')
          .insert({ name: deal.retailer })
          .select('id')
          .single();
        
        if (error) throw error;
        retailer = newRetailer;
        console.log(`  ✓ Created retailer: ${deal.retailer}`);
      }

      // Step 2: Get or create product
      let { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('name', deal.product)
        .eq('size', deal.size)
        .single();

      if (!product) {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            name: deal.product,
            size: deal.size,
            category: deal.category,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        product = newProduct;
        console.log(`  ✓ Created product: ${deal.product}`);
      }

      // Step 3: Create deal (will fail silently if duplicate)
      const { error } = await supabase.from('deals').insert({
        retailer_id: retailer!.id,
        product_id: product!.id,
        price: deal.price,
        start_date: deal.start,
        end_date: deal.end,
      });

      if (error) {
        // Error code 23505 = unique constraint violation (duplicate)
        if (error.code === '23505') {
          skipped++;
          console.log(`  ⊘ Skipped duplicate: ${deal.retailer} - ${deal.product}`);
        } else {
          console.error(`  ✗ Error: ${error.message}`);
        }
      } else {
        inserted++;
        console.log(`  ✓ Created deal: ${deal.retailer} - ${deal.product} ($${deal.price})`);
      }
    } catch (error: any) {
      console.error(`  ✗ Failed to process deal:`, error.message);
    }
  }

  console.log(`\n✅ Ingested ${inserted} deals (${skipped} duplicates skipped)\n`);
}

/**
 * Ingest users into database
 * Uses upsert to update existing users or create new ones
 */
export async function ingestUsers(users: User[]): Promise<void> {
  console.log('👥 Ingesting users...\n');

  for (const user of users) {
    try {
      const { error } = await supabase.from('users').upsert(
        {
          name: user.name,
          email: user.email,
          preferred_retailers: user.preferred_retailers,
        },
        { onConflict: 'email' } // Update if email already exists
      );

      if (error) {
        console.error(`  ✗ Failed to upsert user ${user.email}:`, error.message);
      } else {
        console.log(`  ✓ Upserted user: ${user.name} (${user.email})`);
      }
    } catch (error: any) {
      console.error(`  ✗ Error processing user:`, error.message);
    }
  }

  console.log('\n✅ Users ingested\n');
}