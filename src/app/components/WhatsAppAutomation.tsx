import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { FormField, TextInput } from '@/app/components/FormField';
import { Badge } from '@/app/components/Badge';
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Phone,
  Clock,
  CheckCheck,
  Circle,
  Zap,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Tag,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface Chat {
  id: string;
  customerName: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  tags: string[];
  customerType: 'new' | 'regular' | 'vip';
}

interface Message {
  id: string;
  chatId: string;
  sender: 'customer' | 'business';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document';
}

interface AutoReplyRule {
  id: string;
  name: string;
  trigger: string;
  response: string;
  isActive: boolean;
  conditions: string[];
}

interface Broadcast {
  id: string;
  name: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed';
  scheduledTime?: string;
}

const mockChats: Chat[] = [
  {
    id: 'chat-1',
    customerName: 'Rajesh Kumar',
    phoneNumber: '+91 98765 43210',
    lastMessage: 'Do you have this in size L?',
    lastMessageTime: '10:45 AM',
    unreadCount: 2,
    isOnline: true,
    tags: ['inquiry', 'tshirt'],
    customerType: 'regular',
  },
  {
    id: 'chat-2',
    customerName: 'Priya Sharma',
    phoneNumber: '+91 98765 43211',
    lastMessage: 'Thanks for the quick delivery!',
    lastMessageTime: '9:30 AM',
    unreadCount: 0,
    isOnline: false,
    tags: ['feedback'],
    customerType: 'vip',
  },
  {
    id: 'chat-3',
    customerName: 'Amit Patel',
    phoneNumber: '+91 98765 43212',
    lastMessage: 'What are your store timings?',
    lastMessageTime: 'Yesterday',
    unreadCount: 1,
    isOnline: false,
    tags: ['inquiry'],
    customerType: 'new',
  },
  {
    id: 'chat-4',
    customerName: 'Neha Kulkarni',
    phoneNumber: '+91 98765 43213',
    lastMessage: 'Can I exchange this item?',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    isOnline: true,
    tags: ['exchange', 'support'],
    customerType: 'regular',
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    chatId: 'chat-1',
    sender: 'customer',
    content: 'Hi, I saw your post about the new collection',
    timestamp: '10:40 AM',
    status: 'read',
    type: 'text',
  },
  {
    id: 'msg-2',
    chatId: 'chat-1',
    sender: 'business',
    content: 'Hello! Yes, we have a great new collection. What are you looking for?',
    timestamp: '10:42 AM',
    status: 'read',
    type: 'text',
  },
  {
    id: 'msg-3',
    chatId: 'chat-1',
    sender: 'customer',
    content: 'Do you have this in size L?',
    timestamp: '10:45 AM',
    status: 'delivered',
    type: 'text',
  },
];

const mockAutoReplyRules: AutoReplyRule[] = [
  {
    id: 'rule-1',
    name: 'Store Timings',
    trigger: 'timings, hours, open',
    response: 'Our store is open from 10:00 AM to 9:00 PM, Monday to Sunday. Visit us at Main Store, Pune!',
    isActive: true,
    conditions: ['Contains keywords'],
  },
  {
    id: 'rule-2',
    name: 'Delivery Information',
    trigger: 'delivery, shipping, courier',
    response: 'We offer free delivery on orders above ₹999. Standard delivery takes 2-3 business days.',
    isActive: true,
    conditions: ['Contains keywords'],
  },
  {
    id: 'rule-3',
    name: 'Exchange Policy',
    trigger: 'exchange, return, replacement',
    response: 'We offer easy exchanges within 7 days of purchase. Please keep your bill and tags intact.',
    isActive: false,
    conditions: ['Contains keywords'],
  },
];

export function WhatsAppAutomation() {
  const [activeTab, setActiveTab] = useState<'chats' | 'auto-reply' | 'broadcast'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(mockChats[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  
  // WhatsApp connection status
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [queueStatus, setQueueStatus] = useState({ pending: 5, failed: 0 });

  // Auto-reply rules
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>(mockAutoReplyRules);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);

  // Broadcast
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([
    {
      id: 'bc-1',
      name: 'Weekend Sale Announcement',
      message: 'Exclusive Weekend Sale! Get 30% off on all jeans. Valid till Sunday.',
      recipientCount: 250,
      sentCount: 250,
      status: 'completed',
    },
  ]);

  // Filter chats
  const filteredChats = mockChats.filter((chat) => {
    const matchesSearch =
      searchTerm === '' ||
      chat.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.phoneNumber.includes(searchTerm);
    const matchesFilter = !filterUnread || chat.unreadCount > 0;
    return matchesSearch && matchesFilter;
  });

  // Get messages for selected chat
  const chatMessages = selectedChat
    ? mockMessages.filter((msg) => msg.chatId === selectedChat.id)
    : [];

  // Send message
  const sendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;
    console.log('Sending message:', messageInput);
    setMessageInput('');
    alert('Message sent!');
  };

  // Toggle auto-reply rule
  const toggleRule = (ruleId: string) => {
    setAutoReplyRules(
      autoReplyRules.map((rule) =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
  };

  // Delete rule
  const deleteRule = (ruleId: string) => {
    if (confirm('Delete this auto-reply rule?')) {
      setAutoReplyRules(autoReplyRules.filter((rule) => rule.id !== ruleId));
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">WhatsApp Business Automation</h2>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {whatsappStatus === 'connected' ? (
              <Badge variant="success" className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-current" />
                WhatsApp Connected
              </Badge>
            ) : whatsappStatus === 'connecting' ? (
              <Badge variant="warning" className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                Connecting...
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-current" />
                Disconnected
              </Badge>
            )}
            
            {/* Queue Status */}
            <Badge variant="info" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Queue: {queueStatus.pending}
            </Badge>
            
            {queueStatus.failed > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Failed: {queueStatus.failed}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="h-11 px-4 bg-[var(--background-alt)] border-b border-[var(--border)] flex items-center gap-2">
        <button
          onClick={() => setActiveTab('chats')}
          className={cn(
            'h-9 px-4 rounded-[4px] text-[0.875rem] font-medium flex items-center gap-2 transition-colors',
            activeTab === 'chats'
              ? 'bg-white text-[var(--primary)] [box-shadow:var(--shadow-sm)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Live Chats
          {filteredChats.reduce((sum, chat) => sum + chat.unreadCount, 0) > 0 && (
            <Badge variant="destructive" className="ml-1">
              {filteredChats.reduce((sum, chat) => sum + chat.unreadCount, 0)}
            </Badge>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('auto-reply')}
          className={cn(
            'h-9 px-4 rounded-[4px] text-[0.875rem] font-medium flex items-center gap-2 transition-colors',
            activeTab === 'auto-reply'
              ? 'bg-white text-[var(--primary)] [box-shadow:var(--shadow-sm)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
        >
          <Zap className="w-4 h-4" />
          Auto-Reply Rules
          <Badge variant="secondary">
            {autoReplyRules.filter((r) => r.isActive).length} Active
          </Badge>
        </button>
        
        <button
          onClick={() => setActiveTab('broadcast')}
          className={cn(
            'h-9 px-4 rounded-[4px] text-[0.875rem] font-medium flex items-center gap-2 transition-colors',
            activeTab === 'broadcast'
              ? 'bg-white text-[var(--primary)] [box-shadow:var(--shadow-sm)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
        >
          <Users className="w-4 h-4" />
          Broadcast
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-[var(--background)]">
        {activeTab === 'chats' && (
          <div className="h-full flex">
            {/* Chat List Sidebar */}
            <div className="w-80 border-r border-[var(--border)] bg-white flex flex-col">
              {/* Search Bar */}
              <div className="p-3 border-b border-[var(--border)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <TextInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search chats..."
                    className="pl-10"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-[0.75rem] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterUnread}
                      onChange={(e) => setFilterUnread(e.target.checked)}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    Unread only
                  </label>
                  <div className="flex-1" />
                  <span className="text-[0.75rem] text-[var(--muted-foreground)]">
                    {filteredChats.length} chats
                  </span>
                </div>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={cn(
                      'w-full p-3 border-b border-[var(--border-light)] text-left hover:bg-[var(--secondary)] transition-colors',
                      selectedChat?.id === chat.id && 'bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-semibold flex-shrink-0">
                        {chat.customerName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[0.875rem]">{chat.customerName}</span>
                            {chat.isOnline && (
                              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                            )}
                          </div>
                          <span className="text-[0.75rem] text-[var(--muted-foreground)]">
                            {chat.lastMessageTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[0.75rem] text-[var(--muted-foreground)] truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2 flex-shrink-0">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {chat.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {chat.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[0.625rem] px-1.5 py-0.5 bg-[var(--muted)] rounded-[2px]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            {selectedChat ? (
              <div className="flex-1 flex flex-col bg-[var(--background-alt)]">
                {/* Chat Header */}
                <div className="h-14 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-semibold">
                      {selectedChat.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-[0.875rem]">{selectedChat.customerName}</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedChat.phoneNumber}
                      </div>
                    </div>
                    {selectedChat.customerType === 'vip' && (
                      <Badge className="bg-purple-600 text-white">VIP</Badge>
                    )}
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--secondary)] rounded-[4px]">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.sender === 'business' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-[8px] px-3 py-2',
                          message.sender === 'business'
                            ? 'bg-[#DCF8C6] text-[var(--foreground)]'
                            : 'bg-white text-[var(--foreground)]'
                        )}
                      >
                        <p className="text-[0.875rem] break-words">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[0.625rem] text-[var(--muted-foreground)]">
                            {message.timestamp}
                          </span>
                          {message.sender === 'business' && (
                            <CheckCheck
                              className={cn(
                                'w-3.5 h-3.5',
                                message.status === 'read'
                                  ? 'text-blue-500'
                                  : 'text-[var(--muted-foreground)]'
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-3 bg-white border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <button className="w-9 h-9 flex items-center justify-center hover:bg-[var(--secondary)] rounded-[4px]">
                      <Smile className="w-5 h-5 text-[var(--muted-foreground)]" />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center hover:bg-[var(--secondary)] rounded-[4px]">
                      <Paperclip className="w-5 h-5 text-[var(--muted-foreground)]" />
                    </button>
                    <TextInput
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageInput.trim()}
                      className="w-9 h-9 flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Select a chat to start messaging</p>
                </div>
              </div>
            )}

            {/* Customer Info Sidebar */}
            {selectedChat && (
              <div className="w-72 border-l border-[var(--border)] bg-white p-4">
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="space-y-3 text-[0.875rem]">
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Name</div>
                    <div className="font-medium">{selectedChat.customerName}</div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Phone</div>
                    <div className="font-mono">{selectedChat.phoneNumber}</div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Type</div>
                    <Badge className="capitalize">{selectedChat.customerType}</Badge>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedChat.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <h4 className="font-semibold text-[0.875rem] mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full h-9 px-3 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] text-[0.875rem] font-medium flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" />
                      View Orders
                    </button>
                    <button className="w-full h-9 px-3 border border-[var(--border)] bg-white hover:bg-[var(--secondary)] rounded-[4px] text-[0.875rem] font-medium">
                      Add to Broadcast List
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'auto-reply' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Auto-Reply Rules</h3>
                  <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Automatically respond to customer messages based on keywords
                  </p>
                </div>
                <button className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                {autoReplyRules.map((rule) => (
                  <Panel key={rule.id} glass>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          {rule.isActive ? (
                            <Badge variant="success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Pause className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                            Triggers when message contains:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {rule.trigger.split(',').map((keyword, idx) => (
                              <Badge key={idx} variant="secondary" className="font-mono text-[0.75rem]">
                                {keyword.trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-[var(--muted)] rounded-[4px] border-l-4 border-[var(--primary)]">
                          <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                            Auto-Reply Message:
                          </div>
                          <p className="text-[0.875rem]">{rule.response}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className={cn(
                            'w-9 h-9 flex items-center justify-center text-white rounded-[4px]',
                            rule.isActive
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-green-600 hover:bg-green-700'
                          )}
                          title={rule.isActive ? 'Pause Rule' : 'Activate Rule'}
                        >
                          {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="w-9 h-9 flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px]"
                          title="Edit Rule"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="w-9 h-9 flex items-center justify-center bg-[var(--destructive)] text-white hover:opacity-90 rounded-[4px]"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>

              {/* Info Panel */}
              <Panel glass className="bg-blue-50 border-blue-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[0.875rem]">
                    <p className="font-medium text-blue-900 mb-1">Auto-Reply Best Practices</p>
                    <ul className="text-blue-800 space-y-1 text-[0.8125rem]">
                      <li>• Keep responses clear and concise</li>
                      <li>• Always provide a way for customers to reach a human</li>
                      <li>• Test rules thoroughly before activating</li>
                      <li>• Review and update rules regularly based on customer feedback</li>
                    </ul>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Broadcast Messages</h3>
                  <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Send bulk messages to opted-in customers only
                  </p>
                </div>
                <button className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Broadcast
                </button>
              </div>

              {/* Warning Panel */}
              <Panel glass className="bg-amber-50 border-amber-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[0.875rem]">
                    <p className="font-medium text-amber-900 mb-1">Important: Opt-In Only</p>
                    <p className="text-amber-800 text-[0.8125rem]">
                      Broadcasts can only be sent to customers who have explicitly opted-in to receive
                      marketing messages. Violating this policy may result in WhatsApp Business account
                      suspension.
                    </p>
                  </div>
                </div>
              </Panel>

              {/* Broadcast List */}
              <div className="space-y-3">
                {broadcasts.map((broadcast) => (
                  <Panel key={broadcast.id} glass>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{broadcast.name}</h4>
                          {broadcast.status === 'completed' ? (
                            <Badge variant="success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : broadcast.status === 'sending' ? (
                            <Badge variant="warning">
                              <Circle className="w-3 h-3 mr-1 animate-pulse" />
                              Sending...
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </div>

                        <div className="p-3 bg-[var(--muted)] rounded-[4px] mb-3">
                          <p className="text-[0.875rem]">{broadcast.message}</p>
                        </div>

                        <div className="flex items-center gap-6 text-[0.875rem]">
                          <div>
                            <span className="text-[var(--muted-foreground)]">Recipients:</span>
                            <span className="font-semibold ml-2 tabular-nums">
                              {broadcast.recipientCount}
                            </span>
                          </div>
                          {broadcast.status === 'completed' && (
                            <div>
                              <span className="text-[var(--muted-foreground)]">Sent:</span>
                              <span className="font-semibold ml-2 tabular-nums text-[var(--success)]">
                                {broadcast.sentCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button className="w-9 h-9 flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px]">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center border border-[var(--border)] bg-white hover:bg-[var(--secondary)] rounded-[4px]">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-[var(--border)] rounded-[4px]">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                    Opted-In Customers
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[var(--primary)]">342</div>
                </div>
                <div className="p-4 bg-white border border-[var(--border)] rounded-[4px]">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                    Messages Sent (This Month)
                  </div>
                  <div className="text-2xl font-bold tabular-nums">1,250</div>
                </div>
                <div className="p-4 bg-white border border-[var(--border)] rounded-[4px]">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                    Delivery Rate
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[var(--success)]">98.5%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
