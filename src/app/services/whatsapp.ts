// Supabase Client for WhatsApp Integration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// WHATSAPP OPT-INS
// =====================================================

export interface WhatsAppOptIn {
  phone_number: string;
  customer_name: string;
  opted_in: boolean;
  opted_in_at: string;
  opted_out_at?: string;
  last_interaction?: string;
}

export async function getWhatsAppOptIns() {
  const { data, error } = await supabase
    .from('whatsapp_opt_ins')
    .select('*')
    .order('opted_in_at', { ascending: false });

  if (error) throw error;
  return data as WhatsAppOptIn[];
}

export async function getOptInStats() {
  const { data: optIns, error } = await supabase
    .from('whatsapp_opt_ins')
    .select('opted_in');

  if (error) throw error;

  const totalOptIns = optIns?.length || 0;
  const activeUsers = optIns?.filter(o => o.opted_in).length || 0;

  return {
    totalOptIns,
    activeUsers,
    optOutRate: totalOptIns > 0 ? ((totalOptIns - activeUsers) / totalOptIns * 100).toFixed(1) : 0,
  };
}

// =====================================================
// MESSAGE LOGS
// =====================================================

export interface WhatsAppMessageLog {
  id: string;
  action: string;
  performed_by: string;
  details: {
    message?: string;
    response?: string;
    sender_name?: string;
  };
  created_at: string;
}

export async function getMessageLogs(limit = 50) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('action', 'WHATSAPP_MESSAGE')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as WhatsAppMessageLog[];
}

export async function getMessageStats(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('audit_log')
    .select('id')
    .eq('action', 'WHATSAPP_MESSAGE')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;
  return data?.length || 0;
}

// =====================================================
// BROADCAST MESSAGES
// =====================================================

export async function sendBroadcastMessage(message: string, phoneNumbers: string[]) {
  // Call Edge Function to send broadcast
  const { data, error } = await supabase.functions.invoke('send-whatsapp-broadcast', {
    body: {
      message,
      recipients: phoneNumbers,
    },
  });

  if (error) throw error;
  return data;
}

export async function sendTestMessage(phoneNumber: string, message: string) {
  // Call Edge Function to send test message
  const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
    body: {
      phoneNumber,
      message,
    },
  });

  if (error) throw error;
  return data;
}

// =====================================================
// TEMPLATES
// =====================================================

export interface BroadcastTemplate {
  id: string;
  name: string;
  message: string;
  category: 'marketing' | 'transactional' | 'utility';
  created_at: string;
}

export async function getBroadcastTemplates() {
  // In production, fetch from database
  // For now, return mock templates
  return [
    {
      id: '1',
      name: 'New Arrival',
      message: '🎉 New Arrival Alert!\n\n{{product_name}} now available in store.\n\nVisit us today!',
      category: 'marketing' as const,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Low Stock Alert',
      message: '⚠️ Limited Stock!\n\n{{product_name}} - Only {{quantity}} left.\n\nOrder now!',
      category: 'marketing' as const,
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Order Confirmation',
      message: '✅ Order Confirmed!\n\nOrder: {{order_number}}\nAmount: ₹{{amount}}\n\nTrack: ORDER {{order_number}}',
      category: 'transactional' as const,
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Payment Reminder',
      message: 'Friendly reminder: Outstanding balance of ₹{{amount}}.\n\nReply HELP for payment options.',
      category: 'transactional' as const,
      created_at: new Date().toISOString(),
    },
  ];
}

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

export function subscribeToOptIns(callback: (payload: any) => void) {
  return supabase
    .channel('whatsapp_opt_ins')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'whatsapp_opt_ins',
      },
      callback
    )
    .subscribe();
}

export function subscribeToMessageLogs(callback: (payload: any) => void) {
  return supabase
    .channel('audit_log')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_log',
        filter: 'action=eq.WHATSAPP_MESSAGE',
      },
      callback
    )
    .subscribe();
}
