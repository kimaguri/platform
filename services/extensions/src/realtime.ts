import { api } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import { getSupabaseAnonClient } from '../../../src/shared/supabaseClient';
import type { AuthData } from '../../../src/shared/auth';

// Real-time message types
interface RealtimeMessage {
  type: 'entity_created' | 'entity_updated' | 'entity_deleted';
  entity: string;
  id: string;
  data?: any;
  timestamp: string;
  tenantId: string;
  userId: string;
}

interface RealtimeSubscription {
  entity: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
}

interface RealtimeResponse {
  status: 'subscribed' | 'unsubscribed' | 'error';
  message: string;
}

// Simple endpoint to send notifications (HTTP-based for now)
export const sendNotification = api(
  { auth: true, method: 'POST', path: '/realtime/notify', expose: true },
  async ({ message, target }: { message: string; target?: string }) => {
    const authData = getAuthData() as AuthData;

    if (!authData) {
      throw new Error('Authentication required');
    }

    try {
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      // Send broadcast message using Supabase realtime
      const { error } = await supabase.from('realtime_notifications').insert({
        tenant_id: authData.tenantId,
        user_id: authData.userID,
        message,
        target,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to send notification: ${error.message}`);
      }

      return {
        success: true,
        message: 'Notification sent successfully',
      };
    } catch (error) {
      console.error('Send notification error:', error);
      throw new Error('Failed to send notification');
    }
  }
);

// HTTP endpoint to subscribe to real-time updates
export const subscribeToEntityUpdates = api(
  { auth: true, method: 'POST', path: '/realtime/subscribe', expose: true },
  async ({ entity, action }: { entity: string; action?: string }) => {
    const authData = getAuthData() as AuthData;

    if (!authData) {
      throw new Error('Authentication required');
    }

    try {
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      // Create subscription record
      const { data, error } = await supabase
        .from('realtime_subscriptions')
        .insert({
          tenant_id: authData.tenantId,
          user_id: authData.userID,
          entity,
          action: action || 'ALL',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`);
      }

      return {
        success: true,
        subscription_id: data.id,
        message: `Subscribed to ${entity} changes`,
      };
    } catch (error) {
      console.error('Subscription error:', error);
      throw new Error('Failed to create subscription');
    }
  }
);

// HTTP endpoint to get real-time updates (polling-based)
export const getRealtimeUpdates = api(
  { auth: true, method: 'GET', path: '/realtime/updates', expose: true },
  async ({ since }: { since?: string }) => {
    const authData = getAuthData() as AuthData;

    if (!authData) {
      throw new Error('Authentication required');
    }

    try {
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      let query = supabase
        .from('realtime_notifications')
        .select('*')
        .eq('tenant_id', authData.tenantId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (since) {
        query = query.gt('timestamp', since);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch updates: ${error.message}`);
      }

      return {
        success: true,
        updates: data || [],
        last_update: data?.[0]?.timestamp || null,
      };
    } catch (error) {
      console.error('Get updates error:', error);
      throw new Error('Failed to fetch updates');
    }
  }
);

// Endpoint to unsubscribe from updates
export const unsubscribeFromUpdates = api(
  { auth: true, method: 'DELETE', path: '/realtime/subscribe/:subscriptionId', expose: true },
  async ({ subscriptionId }: { subscriptionId: string }) => {
    const authData = getAuthData() as AuthData;

    if (!authData) {
      throw new Error('Authentication required');
    }

    try {
      const supabase = await getSupabaseAnonClient(authData.tenantId);

      const { error } = await supabase
        .from('realtime_subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', authData.userID)
        .eq('tenant_id', authData.tenantId);

      if (error) {
        throw new Error(`Failed to unsubscribe: ${error.message}`);
      }

      return {
        success: true,
        message: 'Unsubscribed successfully',
      };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      throw new Error('Failed to unsubscribe');
    }
  }
);
