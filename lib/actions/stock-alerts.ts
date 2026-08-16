'use server';

import { createClient } from '@/lib/supabase/server';

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  category?: string;
}

export async function checkLowStockProducts(): Promise<StockAlert[]> {
  try {
    const supabase = await createClient();

    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_threshold, category:categories(name)')
      .eq('is_active', true)
      .lt('stock_quantity', supabase.from('products').select('min_stock_threshold'));

    if (!products) return [];

    return products
      .filter(
        (p) =>
          Number(p.stock_quantity) < Number(p.min_stock_threshold || 10)
      )
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        currentStock: Number(p.stock_quantity),
        minStock: Number(p.min_stock_threshold || 10),
        category: (p.category as unknown as { name: string } | null)?.name,
      }));
  } catch (error) {
    console.error('Error checking low stock:', error);
    return [];
  }
}

export async function sendStockAlert(alerts: StockAlert[], userIds: string[]) {
  try {
    const supabase = await createClient();

    // Store alert in notifications/log
    const now = new Date().toISOString();
    const alertsData = alerts.map((alert) => ({
      type: 'stock_alert',
      title: `Stock bas: ${alert.productName}`,
      message: `Le stock de ${alert.productName} est passé en dessous du seuil (${alert.currentStock}/${alert.minStock})`,
      data: { productId: alert.productId, currentStock: alert.currentStock, minStock: alert.minStock },
      created_at: now,
      read: false,
    }));

    // Insert alerts
    for (const alert of alertsData) {
      await supabase.from('notifications').insert(alert);
    }

    // Optionally: send push notifications if Web Push API is available
    // This would require a service worker and push subscription setup
    return { success: true, alertsSent: alerts.length };
  } catch (error) {
    console.error('Error sending stock alert:', error);
    return { success: false, alertsSent: 0 };
  }
}

export async function subscribeToStockAlerts(subscription: PushSubscription) {
  try {
    // Store push subscription in database for later use
    // This would be used to send actual browser push notifications
    const supabase = await createClient();

    const { data: profile } = await supabase.auth.getUser();
    if (!profile.user) throw new Error('Unauthorized');

    await supabase.from('push_subscriptions').insert({
      user_id: profile.user.id,
      subscription: subscription,
      created_at: new Date().toISOString(),
    });

    return { success: true, message: 'Subscription saved' };
  } catch (error) {
    console.error('Error saving subscription:', error);
    return { success: false, message: 'Failed to save subscription' };
  }
}
