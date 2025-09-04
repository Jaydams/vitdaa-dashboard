/**
 * Test script for the Vitdaa POS notification system
 * Run this script to test various notification scenarios
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - update these values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testNotificationSystem() {
  console.log('🧪 Testing Vitdaa POS Notification System...\n');

  try {
    // Test 1: Create a test notification
    console.log('1️⃣ Testing notification creation...');
    const testNotification = await createTestNotification();
    console.log('✅ Test notification created:', testNotification.id);

    // Test 2: Create a test order
    console.log('\n2️⃣ Testing order creation...');
    const testOrder = await createTestOrder();
    console.log('✅ Test order created:', testOrder.id);

    // Test 3: Test notification count
    console.log('\n3️⃣ Testing notification count...');
    const count = await getNotificationCount();
    console.log('✅ Current notification count:', count);

    // Test 4: Test unread count
    console.log('\n4️⃣ Testing unread count...');
    const unreadCount = await getUnreadCount();
    console.log('✅ Unread notification count:', unreadCount);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your POS app for the new order modal');
    console.log('2. Verify the notification badge shows the correct count');
    console.log('3. Open the notification center to see the test notification');
    console.log('4. Test the Accept/Reject functionality');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function createTestNotification() {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      business_id: await getFirstBusinessId(),
      type: 'system_alert',
      title: 'Test Notification',
      message: 'This is a test notification from the test script',
      data: { test: true, timestamp: new Date().toISOString() },
      priority: 'normal',
      is_read: false
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);
  return data;
}

async function createTestOrder() {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      business_id: await getFirstBusinessId(),
      customer_name: 'Test Customer',
      customer_phone: '+2348012345678',
      invoice_no: `TEST-${Date.now()}`,
      dining_option: 'indoor',
      subtotal: 2500,
      vat_amount: 125,
      service_charge: 250,
      total_amount: 2875,
      payment_method: 'cash',
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create order: ${error.message}`);
  return data;
}

async function getNotificationCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`Failed to get notification count: ${error.message}`);
  return count || 0;
}

async function getUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) throw new Error(`Failed to get unread count: ${error.message}`);
  return count || 0;
}

async function getFirstBusinessId() {
  const { data, error } = await supabase
    .from('business_owner')
    .select('id')
    .limit(1)
    .single();

  if (error) throw new Error(`Failed to get business ID: ${error.message}`);
  return data.id;
}

// Cleanup function to remove test data
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .eq('data->>test', 'true');

    if (notifError) {
      console.log('⚠️ Warning: Could not clean up test notifications:', notifError.message);
    } else {
      console.log('✅ Test notifications cleaned up');
    }

    // Remove test orders
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .like('invoice_no', 'TEST-%');

    if (orderError) {
      console.log('⚠️ Warning: Could not clean up test orders:', orderError.message);
    } else {
      console.log('✅ Test orders cleaned up');
    }

  } catch (error) {
    console.log('⚠️ Warning: Cleanup failed:', error.message);
  }
}

// Handle cleanup on script exit
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Script interrupted, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Script terminated, cleaning up...');
  await cleanup();
  process.exit(0);
});

// Run the test
testNotificationSystem().catch(console.error);

// Export for use in other scripts
module.exports = {
  testNotificationSystem,
  cleanup,
  createTestNotification,
  createTestOrder
};
