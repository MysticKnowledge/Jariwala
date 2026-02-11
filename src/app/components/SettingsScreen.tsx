import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { FormField, TextInput } from '@/app/components/FormField';
import { DataTable, Column } from '@/app/components/DataTable';
import { Badge } from '@/app/components/Badge';
import {
  Settings,
  Building,
  MapPin,
  Receipt,
  ShoppingBag,
  MessageSquare,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Globe,
  Mail,
  FileText,
  Key,
  Database,
  Cloud,
  Upload,
  Link,
  Circle,
  Clock,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type SettingsTab = 'business' | 'locations' | 'tax' | 'amazon' | 'whatsapp' | 'sync';

interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  gstNumber: string;
  isActive: boolean;
}

interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastConnected: string;
  isPrimary: boolean;
}

const mockStoreLocations: StoreLocation[] = [
  {
    id: 'loc-1',
    name: 'Main Store - Pune',
    address: 'Shop No. 15, MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    phone: '+91 20 1234 5678',
    gstNumber: '27AABCU9603R1ZM',
    isActive: true,
  },
  {
    id: 'loc-2',
    name: 'Ahmedabad Branch',
    address: 'Plot 42, CG Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380009',
    phone: '+91 79 8765 4321',
    gstNumber: '24AABCU9603R1ZM',
    isActive: true,
  },
  {
    id: 'loc-3',
    name: 'Central Godown',
    address: 'Warehouse Complex, MIDC Area',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411019',
    phone: '+91 20 9999 8888',
    gstNumber: '27AABCU9603R1ZM',
    isActive: true,
  },
];

const mockWhatsAppNumbers: WhatsAppNumber[] = [
  {
    id: 'wa-1',
    phoneNumber: '+91 98765 43210',
    displayName: 'Main Store Support',
    status: 'connected',
    lastConnected: '2 minutes ago',
    isPrimary: true,
  },
  {
    id: 'wa-2',
    phoneNumber: '+91 98765 43211',
    displayName: 'Ahmedabad Support',
    status: 'connected',
    lastConnected: '5 minutes ago',
    isPrimary: false,
  },
];

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Business Info State
  const [businessName, setBusinessName] = useState('Fashion Retail Pvt Ltd');
  const [businessEmail, setBusinessEmail] = useState('info@fashionretail.com');
  const [businessPhone, setBusinessPhone] = useState('+91 20 1234 5678');
  const [businessWebsite, setBusinessWebsite] = useState('www.fashionretail.com');
  const [businessPAN, setBusinessPAN] = useState('AABCU9603R');
  const [businessGST, setBusinessGST] = useState('27AABCU9603R1ZM');

  // Tax Settings State
  const [cgstRate, setCgstRate] = useState('9');
  const [sgstRate, setSgstRate] = useState('9');
  const [igstRate, setIgstRate] = useState('18');
  const [cessRate, setCessRate] = useState('0');
  const [hsnCode, setHsnCode] = useState('6203');

  // Amazon Integration State
  const [amazonSellerId, setAmazonSellerId] = useState('A2XXXXXXXXXXX');
  const [amazonMWSAuthToken, setAmazonMWSAuthToken] = useState('amzn.mws.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  const [amazonMarketplace, setAmazonMarketplace] = useState('IN');
  const [amazonAutoSync, setAmazonAutoSync] = useState(true);
  const [amazonConnectionStatus, setAmazonConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

  // Sync Settings State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState('15');
  const [lastSyncTime, setLastSyncTime] = useState('2 minutes ago');
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');

  const handleSave = () => {
    console.log('Saving settings...');
    setHasUnsavedChanges(false);
    alert('Settings saved successfully!');
  };

  const handleTestConnection = (type: 'amazon' | 'whatsapp' | 'database') => {
    console.log(`Testing ${type} connection...`);
    alert(`Testing ${type} connection...`);
  };

  const handleSyncNow = () => {
    console.log('Syncing now...');
    setLastSyncTime('Just now');
    alert('Sync initiated successfully!');
  };

  // Store Location Columns
  const locationColumns: Column<StoreLocation>[] = [
    {
      key: 'name',
      header: 'Store Name',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'address',
      header: 'Address',
    },
    {
      key: 'city',
      header: 'City',
      width: '120px',
    },
    {
      key: 'state',
      header: 'State',
      width: '120px',
    },
    {
      key: 'phone',
      header: 'Phone',
      width: '150px',
      render: (value) => <span className="font-mono text-[0.875rem]">{value}</span>,
    },
    {
      key: 'gstNumber',
      header: 'GST Number',
      width: '160px',
      render: (value) => <span className="font-mono text-[0.875rem]">{value}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (value) =>
        value ? (
          <Badge variant="success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '100px',
      render: (value) => (
        <div className="flex gap-1">
          <button className="w-8 h-8 flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px]">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-[var(--destructive)] text-white hover:opacity-90 rounded-[4px]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // WhatsApp Number Columns
  const whatsappColumns: Column<WhatsAppNumber>[] = [
    {
      key: 'phoneNumber',
      header: 'Phone Number',
      width: '160px',
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    {
      key: 'displayName',
      header: 'Display Name',
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (value) => {
        if (value === 'connected') {
          return (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          );
        } else if (value === 'pending') {
          return (
            <Badge variant="warning">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          );
        } else {
          return (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          );
        }
      },
    },
    {
      key: 'lastConnected',
      header: 'Last Connected',
      width: '140px',
      render: (value) => <span className="text-[0.875rem] text-[var(--muted-foreground)]">{value}</span>,
    },
    {
      key: 'isPrimary',
      header: 'Primary',
      width: '90px',
      render: (value) => (value ? <Badge className="bg-purple-600 text-white">Primary</Badge> : null),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '100px',
      render: (value) => (
        <div className="flex gap-1">
          <button className="w-8 h-8 flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px]">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-[var(--destructive)] text-white hover:opacity-90 rounded-[4px]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const tabs = [
    { id: 'business' as SettingsTab, label: 'Business Info', icon: Building },
    { id: 'locations' as SettingsTab, label: 'Store Locations', icon: MapPin },
    { id: 'tax' as SettingsTab, label: 'Tax / GST', icon: Receipt },
    { id: 'amazon' as SettingsTab, label: 'Amazon Integration', icon: ShoppingBag },
    { id: 'whatsapp' as SettingsTab, label: 'WhatsApp Numbers', icon: MessageSquare },
    { id: 'sync' as SettingsTab, label: 'Sync Settings', icon: RefreshCw },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">System Settings</h2>
          {hasUnsavedChanges && (
            <Badge variant="warning">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="h-11 px-4 bg-[var(--background-alt)] border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'h-9 px-4 rounded-[4px] text-[0.875rem] font-medium flex items-center gap-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white text-[var(--primary)] [box-shadow:var(--shadow-sm)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--background)]">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <>
              <Panel title="Business Information" icon={<Building className="w-4 h-4" />} glass>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Business Name" required>
                    <TextInput
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Enter business name"
                    />
                  </FormField>

                  <FormField label="Email Address" required>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={businessEmail}
                        onChange={(e) => {
                          setBusinessEmail(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        type="email"
                        placeholder="email@example.com"
                        className="pl-10"
                      />
                    </div>
                  </FormField>

                  <FormField label="Phone Number" required>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={businessPhone}
                        onChange={(e) => {
                          setBusinessPhone(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="+91 XXXXX XXXXX"
                        className="pl-10"
                      />
                    </div>
                  </FormField>

                  <FormField label="Website">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={businessWebsite}
                        onChange={(e) => {
                          setBusinessWebsite(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="www.example.com"
                        className="pl-10"
                      />
                    </div>
                  </FormField>

                  <FormField label="PAN Number" required>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={businessPAN}
                        onChange={(e) => {
                          setBusinessPAN(e.target.value.toUpperCase());
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="ABCDE1234F"
                        className="pl-10 font-mono uppercase"
                        maxLength={10}
                      />
                    </div>
                  </FormField>

                  <FormField label="GST Number" required>
                    <div className="relative">
                      <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={businessGST}
                        onChange={(e) => {
                          setBusinessGST(e.target.value.toUpperCase());
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="27AABCU9603R1ZM"
                        className="pl-10 font-mono uppercase"
                        maxLength={15}
                      />
                    </div>
                  </FormField>
                </div>
              </Panel>

              <Panel title="Registered Office Address" icon={<MapPin className="w-4 h-4" />} glass>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField label="Address Line 1" required>
                      <TextInput placeholder="Building, Street" />
                    </FormField>
                  </div>

                  <div className="col-span-2">
                    <FormField label="Address Line 2">
                      <TextInput placeholder="Area, Landmark" />
                    </FormField>
                  </div>

                  <FormField label="City" required>
                    <TextInput placeholder="City" />
                  </FormField>

                  <FormField label="State" required>
                    <select className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]">
                      <option>Maharashtra</option>
                      <option>Gujarat</option>
                      <option>Karnataka</option>
                      <option>Delhi</option>
                      <option>Tamil Nadu</option>
                    </select>
                  </FormField>

                  <FormField label="Pincode" required>
                    <TextInput placeholder="411001" maxLength={6} />
                  </FormField>

                  <FormField label="Country" required>
                    <select className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]">
                      <option>India</option>
                    </select>
                  </FormField>
                </div>
              </Panel>
            </>
          )}

          {/* Store Locations Tab */}
          {activeTab === 'locations' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1">Store Locations</h3>
                  <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Manage all your store locations and godowns
                  </p>
                </div>
                <button className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Location
                </button>
              </div>

              <Panel glass>
                <DataTable data={mockStoreLocations} columns={locationColumns} />
              </Panel>
            </>
          )}

          {/* Tax / GST Tab */}
          {activeTab === 'tax' && (
            <>
              <Panel title="GST Configuration" icon={<Receipt className="w-4 h-4" />} glass>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="CGST Rate (%)" required>
                    <TextInput
                      type="number"
                      value={cgstRate}
                      onChange={(e) => {
                        setCgstRate(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="9"
                      className="tabular-nums"
                    />
                  </FormField>

                  <FormField label="SGST Rate (%)" required>
                    <TextInput
                      type="number"
                      value={sgstRate}
                      onChange={(e) => {
                        setSgstRate(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="9"
                      className="tabular-nums"
                    />
                  </FormField>

                  <FormField label="IGST Rate (%)" required>
                    <TextInput
                      type="number"
                      value={igstRate}
                      onChange={(e) => {
                        setIgstRate(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="18"
                      className="tabular-nums"
                    />
                  </FormField>

                  <FormField label="Cess Rate (%)">
                    <TextInput
                      type="number"
                      value={cessRate}
                      onChange={(e) => {
                        setCessRate(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="0"
                      className="tabular-nums"
                    />
                  </FormField>

                  <FormField label="HSN Code (Default for Garments)">
                    <TextInput
                      value={hsnCode}
                      onChange={(e) => {
                        setHsnCode(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="6203"
                      className="font-mono"
                    />
                  </FormField>
                </div>
              </Panel>

              <Panel title="Tax Calculation Settings" glass>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Enable Tax Inclusive Pricing</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Display prices with tax included
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Auto-detect Interstate Sales</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Automatically apply IGST for interstate transactions
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Round Off Total Amount</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Round final invoice amount to nearest rupee
                      </div>
                    </div>
                  </label>
                </div>
              </Panel>
            </>
          )}

          {/* Amazon Integration Tab */}
          {activeTab === 'amazon' && (
            <>
              <Panel
                title="Amazon Seller Central Integration"
                icon={<ShoppingBag className="w-4 h-4" />}
                glass
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.875rem] font-medium">Connection Status:</span>
                      {amazonConnectionStatus === 'connected' ? (
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Disconnected
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => handleTestConnection('amazon')}
                      className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2"
                    >
                      <Link className="w-3.5 h-3.5" />
                      Test Connection
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Seller ID" required>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={amazonSellerId}
                        onChange={(e) => {
                          setAmazonSellerId(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="A2XXXXXXXXXXX"
                        className="pl-10 font-mono"
                      />
                    </div>
                  </FormField>

                  <FormField label="Marketplace Region" required>
                    <select
                      value={amazonMarketplace}
                      onChange={(e) => {
                        setAmazonMarketplace(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
                    >
                      <option value="IN">India (amazon.in)</option>
                      <option value="US">United States (amazon.com)</option>
                      <option value="UK">United Kingdom (amazon.co.uk)</option>
                      <option value="DE">Germany (amazon.de)</option>
                    </select>
                  </FormField>

                  <div className="col-span-2">
                    <FormField label="MWS Auth Token" required>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                        <TextInput
                          type="password"
                          value={amazonMWSAuthToken}
                          onChange={(e) => {
                            setAmazonMWSAuthToken(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="amzn.mws.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="pl-10 font-mono"
                        />
                      </div>
                    </FormField>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={amazonAutoSync}
                      onChange={(e) => {
                        setAmazonAutoSync(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    <div>
                      <div className="font-medium text-[0.875rem]">Enable Auto-Sync</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Automatically sync orders and inventory with Amazon
                      </div>
                    </div>
                  </label>
                </div>
              </Panel>

              <Panel title="Sync Configuration" glass>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Sync Orders</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Import new orders from Amazon automatically
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Sync Inventory</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Update Amazon stock levels when inventory changes
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Sync Prices</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Update Amazon product prices when changed locally
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Import Settlement Reports</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Automatically download and import settlement reports
                      </div>
                    </div>
                  </label>
                </div>
              </Panel>
            </>
          )}

          {/* WhatsApp Numbers Tab */}
          {activeTab === 'whatsapp' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1">WhatsApp Business Numbers</h3>
                  <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Manage WhatsApp Business API numbers for customer communication
                  </p>
                </div>
                <button className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Number
                </button>
              </div>

              <Panel glass>
                <DataTable data={mockWhatsAppNumbers} columns={whatsappColumns} />
              </Panel>

              <Panel title="WhatsApp Business API Settings" glass>
                <div className="space-y-4">
                  <FormField label="API Endpoint URL">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        placeholder="https://api.whatsapp.example.com"
                        className="pl-10 font-mono"
                      />
                    </div>
                  </FormField>

                  <FormField label="API Access Token">
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput type="password" placeholder="Enter API token" className="pl-10 font-mono" />
                    </div>
                  </FormField>

                  <div className="flex items-center justify-end pt-3">
                    <button
                      onClick={() => handleTestConnection('whatsapp')}
                      className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2"
                    >
                      <Link className="w-4 h-4" />
                      Test Connection
                    </button>
                  </div>
                </div>
              </Panel>
            </>
          )}

          {/* Sync Settings Tab */}
          {activeTab === 'sync' && (
            <>
              <Panel
                title="Database Synchronization"
                icon={<RefreshCw className="w-4 h-4" />}
                glass
              >
                <div className="mb-4 p-3 bg-[var(--muted)] rounded-[4px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-[var(--primary)]" />
                    <div>
                      <div className="font-medium text-[0.875rem]">Last Sync</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">{lastSyncTime}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncNow}
                    className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sync Now
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => {
                        setAutoSyncEnabled(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    <div>
                      <div className="font-medium text-[0.875rem]">Enable Auto-Sync</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Automatically sync data at regular intervals
                      </div>
                    </div>
                  </label>

                  {autoSyncEnabled && (
                    <FormField label="Sync Interval (minutes)">
                      <select
                        value={syncInterval}
                        onChange={(e) => {
                          setSyncInterval(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
                      >
                        <option value="5">Every 5 minutes</option>
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="60">Every hour</option>
                      </select>
                    </FormField>
                  )}
                </div>
              </Panel>

              <Panel title="Cloud Backup" icon={<Cloud className="w-4 h-4" />} glass>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloudBackupEnabled}
                      onChange={(e) => {
                        setCloudBackupEnabled(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    <div>
                      <div className="font-medium text-[0.875rem]">Enable Cloud Backup</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Automatically backup data to secure cloud storage
                      </div>
                    </div>
                  </label>

                  {cloudBackupEnabled && (
                    <>
                      <FormField label="Backup Frequency">
                        <select
                          value={backupFrequency}
                          onChange={(e) => {
                            setBackupFrequency(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
                        >
                          <option value="hourly">Every Hour</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </FormField>

                      <div className="p-3 bg-blue-50 border border-blue-300 rounded-[4px] flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[0.875rem]">
                          <p className="font-medium text-blue-900 mb-1">Backup Information</p>
                          <ul className="text-blue-800 space-y-1 text-[0.8125rem]">
                            <li>• Last backup: 1 hour ago</li>
                            <li>• Next backup: In 23 minutes</li>
                            <li>• Storage used: 2.4 GB of 10 GB</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Backup Now
                        </button>
                        <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Restore from Backup
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Panel>

              <Panel title="Data Export" glass>
                <div className="space-y-3">
                  <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Export your complete business data for external analysis or migration
                  </p>
                  <div className="flex gap-2">
                    <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium">
                      Export as JSON
                    </button>
                    <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium">
                      Export as CSV
                    </button>
                    <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium">
                      Export as Excel
                    </button>
                  </div>
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
