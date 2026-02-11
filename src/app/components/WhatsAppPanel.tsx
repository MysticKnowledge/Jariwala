import React, { useState, useEffect } from 'react';
import { Panel } from '@/app/components/Panel';
import { DataTable } from '@/app/components/DataTable';
import { Badge } from '@/app/components/Badge';
import { MessageSquare, Send, Users, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle, QrCode, RefreshCw, Power } from 'lucide-react';
import {
  sendWhatsAppMessage,
  sendBroadcast,
  getInstanceStatus,
  sendTemplate,
  testConnection,
  getWaziperConfig,
  getQRCode,
  rebootInstance,
  reconnectInstance,
  getAvailableTemplates,
} from '@/app/services/waziper-client';

type TabType = 'overview' | 'customers' | 'broadcast' | 'logs' | 'settings';

export function WhatsAppPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [optIns, setOptIns] = useState<WhatsAppOptIn[]>([]);
  const [messageLogs, setMessageLogs] = useState<WhatsAppMessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOptIns: 0,
    activeUsers: 0,
    messagesThisWeek: 0,
    responseRate: 95,
  });

  // Load data
  useEffect(() => {
    loadOptIns();
    loadMessageLogs();
    loadStats();
  }, []);

  const loadOptIns = async () => {
    // In production, fetch from Supabase
    // const { data } = await supabase.from('whatsapp_opt_ins').select('*')
    
    // Mock data for demo
    setOptIns([
      {
        phone_number: '919876543210',
        customer_name: 'Rajesh Kumar',
        opted_in: true,
        opted_in_at: '2026-01-15T10:30:00Z',
        last_interaction: '2026-01-29T14:20:00Z',
      },
      {
        phone_number: '919876543211',
        customer_name: 'Priya Sharma',
        opted_in: true,
        opted_in_at: '2026-01-18T09:15:00Z',
        last_interaction: '2026-01-30T11:45:00Z',
      },
      {
        phone_number: '919876543212',
        customer_name: 'Amit Patel',
        opted_in: false,
        opted_in_at: '2026-01-10T08:00:00Z',
        opted_out_at: '2026-01-28T16:30:00Z',
      },
    ]);
  };

  const loadMessageLogs = async () => {
    // Mock data
    setMessageLogs([
      {
        id: '1',
        phone_number: '919876543210',
        message_type: 'incoming',
        message: 'ORDER INV-2026-0125',
        response: '✅ Order Status: INV-2026-0125...',
        created_at: '2026-01-30T14:20:00Z',
      },
      {
        id: '2',
        phone_number: '919876543211',
        message_type: 'incoming',
        message: 'STOCK Cotton T-Shirt',
        response: '✅ Cotton T-Shirt - Available in Main Store...',
        created_at: '2026-01-30T11:45:00Z',
      },
    ]);
  };

  const loadStats = () => {
    // Mock stats
    setStats({
      totalOptIns: 142,
      activeUsers: 138,
      messagesThisWeek: 87,
      responseRate: 98,
    });
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">WhatsApp Automation</h1>
            <p className="text-[var(--muted-foreground)]">Powered by Waziper</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={<TrendingUp className="w-4 h-4" />}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === 'customers'}
          onClick={() => setActiveTab('customers')}
          icon={<Users className="w-4 h-4" />}
        >
          Customers
        </TabButton>
        <TabButton
          active={activeTab === 'broadcast'}
          onClick={() => setActiveTab('broadcast')}
          icon={<Send className="w-4 h-4" />}
        >
          Broadcast
        </TabButton>
        <TabButton
          active={activeTab === 'logs'}
          onClick={() => setActiveTab('logs')}
          icon={<MessageSquare className="w-4 h-4" />}
        >
          Message Logs
        </TabButton>
        <TabButton
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon={<AlertCircle className="w-4 h-4" />}
        >
          Settings
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab stats={stats} />}
      {activeTab === 'customers' && <CustomersTab customers={optIns} onRefresh={loadOptIns} />}
      {activeTab === 'broadcast' && <BroadcastTab customers={optIns.filter(c => c.opted_in)} />}
      {activeTab === 'logs' && <LogsTab logs={messageLogs} />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 h-10 flex items-center gap-2 border-b-2 transition-colors
        ${active 
          ? 'border-[var(--primary)] text-[var(--primary)] font-medium' 
          : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}

// Overview Tab
function OverviewTab({ stats }: { stats: any }) {
  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Opt-Ins"
          value={stats.totalOptIns}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Messages (7 days)"
          value={stats.messagesThisWeek}
          icon={<MessageSquare className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Response Rate"
          value={`${stats.responseRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <Panel title="Quick Actions" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <ActionCard
            title="Send Broadcast"
            description="Send message to all opted-in customers"
            icon={<Send className="w-6 h-6" />}
            color="primary"
          />
          <ActionCard
            title="Test Bot"
            description="Send test message to verify setup"
            icon={<MessageSquare className="w-6 h-6" />}
            color="secondary"
          />
          <ActionCard
            title="View Logs"
            description="Check recent interactions"
            icon={<Clock className="w-6 h-6" />}
            color="accent"
          />
        </div>
      </Panel>

      {/* Recent Activity */}
      <Panel title="Recent Activity">
        <div className="divide-y divide-[var(--border)]">
          <ActivityItem
            type="opt-in"
            message="Rajesh Kumar subscribed"
            time="2 hours ago"
          />
          <ActivityItem
            type="query"
            message="Priya Sharma checked order INV-2026-0125"
            time="5 hours ago"
          />
          <ActivityItem
            type="broadcast"
            message="Low stock alert sent to 45 customers"
            time="1 day ago"
          />
          <ActivityItem
            type="opt-out"
            message="Amit Patel unsubscribed"
            time="2 days ago"
          />
        </div>
      </Panel>
    </div>
  );
}

// Customers Tab
function CustomersTab({ customers, onRefresh }: { customers: OptInCustomer[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'opted-in' | 'opted-out'>('all');

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.phone_number.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'opted-in' && c.opted_in) ||
                         (filterStatus === 'opted-out' && !c.opted_in);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {/* Filters */}
      <Panel className="mb-4">
        <div className="p-4 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-[4px]"
          />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-[4px]"
          >
            <option value="all">All Customers</option>
            <option value="opted-in">Opted In</option>
            <option value="opted-out">Opted Out</option>
          </select>

          <button
            onClick={onRefresh}
            className="h-10 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[4px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </Panel>

      {/* Customers Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--accent)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Opted In</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Last Active</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredCustomers.map((customer) => (
                <tr key={customer.phone_number} className="hover:bg-[var(--accent)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{customer.customer_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    +{customer.phone_number}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={customer.opted_in ? 'success' : 'secondary'}>
                      {customer.opted_in ? 'Opted In' : 'Opted Out'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    {new Date(customer.opted_in_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    {customer.last_interaction 
                      ? new Date(customer.last_interaction).toLocaleString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-[var(--primary)] hover:underline text-sm">
                      Send Message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              No customers found
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

// Broadcast Tab
function BroadcastTab({ customers }: { customers: OptInCustomer[] }) {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);

  const templates: BroadcastTemplate[] = [
    {
      id: '1',
      name: 'New Arrival',
      message: '🎉 New Arrival Alert!\n\n{{product_name}} now available in store.\n\nVisit us today!',
      category: 'marketing',
    },
    {
      id: '2',
      name: 'Low Stock Alert',
      message: '⚠️ Limited Stock!\n\n{{product_name}} - Only {{quantity}} left.\n\nOrder now!',
      category: 'marketing',
    },
    {
      id: '3',
      name: 'Payment Reminder',
      message: 'Reminder: Outstanding balance of ₹{{amount}}.\n\nReply HELP for payment options.',
      category: 'transactional',
    },
  ];

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    
    try {
      // In production, call Supabase Edge Function
      // await supabase.functions.invoke('send-broadcast', {
      //   body: { message, recipients: customers.map(c => c.phone_number) }
      // });
      
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Broadcast sent to ${customers.length} customers!`);
      setMessage('');
    } catch (error) {
      alert('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Compose Message */}
      <div className="lg:col-span-2">
        <Panel title="Compose Broadcast Message">
          <div className="p-4 space-y-4">
            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  const template = templates.find(t => t.id === e.target.value);
                  if (template) setMessage(template.message);
                }}
                className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-[4px]"
              >
                <option value="">-- Select Template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={8}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-[4px] resize-none"
              />
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                {message.length} characters
              </div>
            </div>

            {/* Preview */}
            {message && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preview
                </label>
                <div className="p-4 bg-[var(--accent)] border border-[var(--border)] rounded-lg">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {message}
                  </div>
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendBroadcast}
              disabled={sending || !message.trim()}
              className="w-full h-12 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to {customers.length} Customers
                </>
              )}
            </button>
          </div>
        </Panel>
      </div>

      {/* Recipients */}
      <div>
        <Panel title="Recipients">
          <div className="p-4">
            <div className="mb-4">
              <div className="text-2xl font-semibold">{customers.length}</div>
              <div className="text-sm text-[var(--muted-foreground)]">Opted-in customers</div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {customers.slice(0, 10).map((customer) => (
                <div
                  key={customer.phone_number}
                  className="p-2 bg-[var(--accent)] rounded-[4px] text-sm"
                >
                  <div className="font-medium">{customer.customer_name}</div>
                  <div className="text-[var(--muted-foreground)] font-mono text-xs">
                    +{customer.phone_number}
                  </div>
                </div>
              ))}
              
              {customers.length > 10 && (
                <div className="text-center text-sm text-[var(--muted-foreground)] pt-2">
                  and {customers.length - 10} more...
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// Logs Tab
function LogsTab({ logs }: { logs: MessageLog[] }) {
  return (
    <Panel>
      <div className="divide-y divide-[var(--border)]">
        {logs.map((log) => (
          <div key={log.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${log.message_type === 'incoming' ? 'bg-blue-100' : 'bg-green-100'}
                `}>
                  {log.message_type === 'incoming' ? '📥' : '📤'}
                </div>
                <div>
                  <div className="font-mono text-sm">+{log.phone_number}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <Badge variant={log.message_type === 'incoming' ? 'info' : 'success'}>
                {log.message_type}
              </Badge>
            </div>
            
            <div className="ml-11">
              <div className="mb-2">
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Message:</div>
                <div className="p-2 bg-[var(--accent)] rounded text-sm">
                  {log.message}
                </div>
              </div>
              
              {log.response && (
                <div>
                  <div className="text-xs text-[var(--muted-foreground)] mb-1">Response:</div>
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm whitespace-pre-wrap">
                    {log.response}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// Settings Tab
function SettingsTab() {
  const waziperConfig = getWaziperConfig();
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from your retail store.');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState<{ connected: boolean } | null>(null);

  // Load QR code on mount
  useEffect(() => {
    checkInstanceStatus();
  }, []);

  const checkInstanceStatus = async () => {
    try {
      const status = await getInstanceStatus();
      setInstanceStatus(status);
      
      // Don't auto-load QR code - let user click button
      // This avoids CORS errors on initial load
    } catch (error) {
      console.error('Status check error:', error);
      setInstanceStatus({ connected: false });
    }
  };

  const loadQRCode = async () => {
    setLoadingQR(true);
    setQrCode(null);
    
    try {
      const qrData = await getQRCode();
      
      if (qrData.qrcode) {
        setQrCode(qrData.qrcode);
      } else if (qrData.authenticated) {
        // Already authenticated
        setInstanceStatus({ connected: true });
        alert('WhatsApp is already connected!');
      } else {
        alert('Failed to get QR code. Please check your API configuration or try again later.');
      }
    } catch (error) {
      console.error('Failed to load QR code:', error);
      alert('Unable to connect to Waziper API. Please check your internet connection and API credentials.');
    } finally {
      setLoadingQR(false);
    }
  };

  const handleReboot = async () => {
    if (confirm('Are you sure you want to reboot the instance? This will logout WhatsApp and require re-scanning.')) {
      setLoadingQR(true);
      await rebootInstance();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadQRCode();
      setLoadingQR(false);
    }
  };

  const handleReconnect = async () => {
    setLoadingQR(true);
    await reconnectInstance();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await checkInstanceStatus();
    setLoadingQR(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection();
      setTestResult(result);
      await checkInstanceStatus();
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      alert('Please enter a phone number');
      return;
    }

    setTesting(true);
    
    try {
      const result = await sendWhatsAppMessage(testPhone, testMessage);
      
      if (result.success) {
        alert('Test message sent successfully!');
      } else {
        alert(`Failed to send: ${result.error}`);
      }
    } catch (error) {
      alert('Error sending test message');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status & QR Code */}
      <Panel title="WhatsApp Connection">
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-[var(--accent)] rounded-[4px]">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${instanceStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <div className="font-medium">
                  {instanceStatus?.connected ? 'Connected to WhatsApp' : 'Not Connected'}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Instance: {waziperConfig.instanceId}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleReconnect}
                disabled={loadingQR}
                className="h-8 px-3 bg-blue-500 text-white rounded-[4px] text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reconnect
              </button>
              <button
                onClick={handleReboot}
                disabled={loadingQR}
                className="h-8 px-3 bg-orange-500 text-white rounded-[4px] text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Power className="w-3 h-3" />
                Reboot
              </button>
            </div>
          </div>

          {/* QR Code */}
          {!instanceStatus?.connected && (
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6">
              <div className="flex flex-col items-center">
                <QrCode className="w-12 h-12 text-[var(--muted-foreground)] mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scan QR Code to Connect</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4 text-center">
                  Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </p>
                
                {loadingQR ? (
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading QR Code...
                  </div>
                ) : qrCode ? (
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                  </div>
                ) : (
                  <button
                    onClick={loadQRCode}
                    className="h-10 px-6 bg-[var(--primary)] text-white rounded-[4px] hover:bg-[var(--primary-hover)]"
                  >
                    Generate QR Code
                  </button>
                )}
                
                {qrCode && (
                  <button
                    onClick={loadQRCode}
                    className="mt-4 text-sm text-[var(--primary)] hover:underline"
                  >
                    Refresh QR Code
                  </button>
                )}
              </div>
            </div>
          )}

          {instanceStatus?.connected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-green-800 font-medium">✅ WhatsApp is connected and ready!</div>
              <div className="text-sm text-green-600 mt-1">You can now send and receive messages</div>
            </div>
          )}
        </div>
      </Panel>

      {/* Configuration */}
      <Panel title="Waziper Configuration">
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Access Token</label>
            <input
              type="password"
              value={waziperConfig.accessToken}
              readOnly
              className="w-full h-10 px-3 bg-[var(--accent)] border border-[var(--border)] rounded-[4px] font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Instance ID</label>
            <input
              type="text"
              value={waziperConfig.instanceId}
              readOnly
              className="w-full h-10 px-3 bg-[var(--accent)] border border-[var(--border)] rounded-[4px] font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API URL</label>
            <input
              type="text"
              value={waziperConfig.apiUrl}
              readOnly
              className="w-full h-10 px-3 bg-[var(--accent)] border border-[var(--border)] rounded-[4px] font-mono text-sm"
            />
          </div>

          <button 
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full h-10 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          {testResult && (
            <div className={`p-3 rounded-[4px] ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {testResult.message}
            </div>
          )}
        </div>
      </Panel>

      {/* Test Bot */}
      <Panel title="Send Test Message">
        <div className="p-4">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Send a test message to verify your Waziper integration is working correctly.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g., 919876543210 (country code + number)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-[4px]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Enter phone number with country code (no + or spaces)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Test Message</label>
              <textarea
                placeholder="Test message"
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-[4px] resize-none"
              />
            </div>
            
            <button 
              onClick={handleSendTest}
              disabled={testing || !testPhone.trim() || !instanceStatus?.connected}
              className="w-full h-10 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium disabled:opacity-50"
            >
              {testing ? 'Sending...' : 'Send Test Message'}
            </button>
            
            {!instanceStatus?.connected && (
              <div className="text-sm text-orange-600 text-center">
                ⚠️ Please connect to WhatsApp first by scanning the QR code above
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Documentation */}
      <Panel title="Documentation">
        <div className="p-4 space-y-3">
          <a href="/WAZIPER-INTEGRATION.md" target="_blank" className="block p-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[4px] flex items-center justify-between">
            <span className="font-medium">Complete Setup Guide</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          
          <a href="https://wapp.synthory.space" target="_blank" className="block p-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[4px] flex items-center justify-between">
            <span className="font-medium">Waziper API Docs</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-[4px]">
            <p className="text-sm text-blue-800">
              <strong>Your Waziper Instance:</strong><br/>
              ID: {waziperConfig.instanceId}<br/>
              API: {waziperConfig.apiUrl}<br/>
              Status: {instanceStatus?.connected ? '✅ Connected' : '⚠️ Not Connected'}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Panel>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-semibold mb-1">{value}</div>
        <div className="text-sm text-[var(--muted-foreground)]">{title}</div>
      </div>
    </Panel>
  );
}

function ActionCard({ title, description, icon, color }: any) {
  return (
    <button className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:shadow-md transition-all text-left">
      <div className={`w-12 h-12 bg-[var(--accent)] rounded-lg flex items-center justify-center mb-3 text-[var(--${color})]`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
    </button>
  );
}

function ActivityItem({ type, message, time }: any) {
  const icons: any = {
    'opt-in': '✅',
    'query': '💬',
    'broadcast': '📢',
    'opt-out': '❌',
  };

  return (
    <div className="p-4 flex items-center gap-3 hover:bg-[var(--accent)] transition-colors">
      <div className="text-2xl">{icons[type]}</div>
      <div className="flex-1">
        <div className="font-medium">{message}</div>
        <div className="text-sm text-[var(--muted-foreground)]">{time}</div>
      </div>
    </div>
  );
}

// Helper Interfaces
interface OptInCustomer {
  phone_number: string;
  customer_name: string;
  opted_in: boolean;
  opted_in_at: string;
  opted_out_at?: string;
  last_interaction?: string;
}

interface MessageLog {
  id: string;
  phone_number: string;
  message_type: 'incoming' | 'outgoing';
  message: string;
  response?: string;
  created_at: string;
}