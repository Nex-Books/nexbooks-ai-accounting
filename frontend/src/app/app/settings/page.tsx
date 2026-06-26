'use client';

import React, { useState, useEffect } from 'react';
import {
  Alert, AlertDescription, AlertIcon, Box, Button, Divider, Flex, FormControl,
  FormLabel, Grid, Icon, Input, Select, Skeleton, Switch, Tab, TabList,
  TabPanel, TabPanels, Tabs, Text, Textarea, useToast,
} from '@chakra-ui/react';
import {
  MdBusiness, MdGavel, MdPerson, MdSave, MdSettings,
} from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const SIDEBAR_GREEN = '#155740';

interface BusinessProfile {
  company_name: string;
  business_type: string;
  industry: string;
  gstin: string;
  pan_number: string;
  country: string;
  currency: string;
  financial_year_start: string;
  financial_year: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  tds_applicable: boolean;
  gst_registered: boolean;
}

const EMPTY_PROFILE: BusinessProfile = {
  company_name: '', business_type: '', industry: '', gstin: '', pan_number: '',
  country: 'India', currency: 'INR', financial_year_start: 'April', financial_year: '',
  address_line1: '', address_line2: '', city: '', state: '', pincode: '',
  phone: '', email: '', website: '', tds_applicable: false, gst_registered: false,
};

const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'NGO', 'Other'];
const INDUSTRIES = ['Retail', 'Manufacturing', 'Services', 'IT/Software', 'Healthcare', 'Education', 'Construction', 'Trading', 'Hospitality', 'Agriculture', 'Finance', 'Other'];
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Load profile
  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch(`${API}/business/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setProfile({ ...EMPTY_PROFILE, ...data });
            setProfileExists(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSave = async () => {
    if (!profile.company_name.trim()) {
      toast({ title: 'Company name is required', status: 'error', isClosable: true, duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const method = profileExists ? 'PUT' : 'POST';
      const res = await fetch(`${API}/business/profile`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, onboarding_complete: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setProfileExists(true);
      toast({ title: 'Business profile saved successfully!', status: 'success', isClosable: true, duration: 3000, position: 'top-right' });
    } catch (e: any) {
      toast({ title: 'Failed to save profile', description: e.message, status: 'error', isClosable: true, duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof BusinessProfile, value: any) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const InputField = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: keyof BusinessProfile; type?: string; placeholder?: string }) => (
    <FormControl>
      <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">{label}</FormLabel>
      {loading ? <Skeleton h="40px" borderRadius="10px" /> : (
        <Input
          type={type}
          value={(profile[field] as string) || ''}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          borderRadius="10px"
          fontSize="sm"
          _focus={{ borderColor: SIDEBAR_GREEN, boxShadow: `0 0 0 1px ${SIDEBAR_GREEN}` }}
        />
      )}
    </FormControl>
  );

  return (
    <Box minH="100%" bg="#FCFCFD" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="28px" flexWrap="wrap" gap="12px">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Settings</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Manage your business profile and preferences</Text>
        </Box>
        <Button
          leftIcon={<MdSave />}
          onClick={handleSave}
          isLoading={saving}
          loadingText="Saving..."
          bg={SIDEBAR_GREEN}
          color="white"
          borderRadius="10px"
          _hover={{ bg: '#1a6b4d' }}
          size="md"
        >
          Save Changes
        </Button>
      </Flex>

      <Tabs variant="soft-rounded" colorScheme="green" size="sm">
        <TabList mb="24px" gap="8px" flexWrap="wrap">
          <Tab borderRadius="10px" fontSize="sm" fontWeight="600" _selected={{ bg: SIDEBAR_GREEN, color: 'white' }}>
            <Icon as={MdBusiness} mr="6px" /> Business Info
          </Tab>
          <Tab borderRadius="10px" fontSize="sm" fontWeight="600" _selected={{ bg: SIDEBAR_GREEN, color: 'white' }}>
            <Icon as={MdGavel} mr="6px" /> Tax & Compliance
          </Tab>
          <Tab borderRadius="10px" fontSize="sm" fontWeight="600" _selected={{ bg: SIDEBAR_GREEN, color: 'white' }}>
            <Icon as={MdPerson} mr="6px" /> Account
          </Tab>
        </TabList>

        <TabPanels>
          {/* Business Info Tab */}
          <TabPanel p="0">
            <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap="20px">
              {/* Company Details */}
              <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px">
                <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="20px">Company Details</Text>
                <Flex direction="column" gap="16px">
                  <InputField label="Company Name *" field="company_name" placeholder="Acme Private Limited" />
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">Business Type</FormLabel>
                    {loading ? <Skeleton h="40px" borderRadius="10px" /> : (
                      <Select value={profile.business_type} onChange={e => set('business_type', e.target.value)} borderRadius="10px" fontSize="sm">
                        <option value="">Select business type</option>
                        {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    )}
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">Industry</FormLabel>
                    {loading ? <Skeleton h="40px" borderRadius="10px" /> : (
                      <Select value={profile.industry} onChange={e => set('industry', e.target.value)} borderRadius="10px" fontSize="sm">
                        <option value="">Select industry</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </Select>
                    )}
                  </FormControl>
                  <Grid templateColumns="1fr 1fr" gap="12px">
                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">Currency</FormLabel>
                      {loading ? <Skeleton h="40px" borderRadius="10px" /> : (
                        <Select value={profile.currency} onChange={e => set('currency', e.target.value)} borderRadius="10px" fontSize="sm">
                          <option value="INR">INR — Indian Rupee</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="EUR">EUR — Euro</option>
                          <option value="GBP">GBP — British Pound</option>
                          <option value="AED">AED — UAE Dirham</option>
                        </Select>
                      )}
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">Financial Year</FormLabel>
                      {loading ? <Skeleton h="40px" borderRadius="10px" /> : (
                        <Select value={profile.financial_year_start} onChange={e => set('financial_year_start', e.target.value)} borderRadius="10px" fontSize="sm">
                          <option value="April">April (India)</option>
                          <option value="January">January</option>
                          <option value="July">July</option>
                          <option value="October">October</option>
                        </Select>
                      )}
                    </FormControl>
                  </Grid>
                  <InputField label="Contact Phone" field="phone" type="tel" placeholder="+91 98765 43210" />
                  <InputField label="Business Email" field="email" type="email" placeholder="accounts@yourcompany.com" />
                  <InputField label="Website" field="website" placeholder="https://yourcompany.com" />
                </Flex>
              </Box>

              {/* Address */}
              <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px">
                <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="20px">Business Address</Text>
                <Flex direction="column" gap="16px">
                  <InputField label="Address Line 1" field="address_line1" placeholder="123, Main Street" />
                  <InputField label="Address Line 2" field="address_line2" placeholder="Near XYZ landmark" />
                  <Grid templateColumns="1fr 1fr" gap="12px">
                    <InputField label="City" field="city" placeholder="Mumbai" />
                    <InputField label="Pincode" field="pincode" placeholder="400001" />
                  </Grid>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">State</FormLabel>
                    {loading ? <Skeleton h="40px" borderRadius="10px" /> : (
                      <Select value={profile.state} onChange={e => set('state', e.target.value)} borderRadius="10px" fontSize="sm">
                        <option value="">Select state</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    )}
                  </FormControl>
                  <InputField label="Country" field="country" placeholder="India" />
                </Flex>
              </Box>
            </Grid>
          </TabPanel>

          {/* Tax & Compliance Tab */}
          <TabPanel p="0">
            <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px" maxW="600px">
              <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="20px">Tax & Compliance Settings</Text>
              <Flex direction="column" gap="20px">
                <InputField label="GSTIN" field="gstin" placeholder="22AAAAA0000A1Z5" />
                <InputField label="PAN Number" field="pan_number" placeholder="AAAAA0000A" />

                <Divider />

                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color={TEXT_DARK}>GST Registered</Text>
                    <Text fontSize="xs" color={TEXT_MUTED}>Enable GST calculations on transactions</Text>
                  </Box>
                  {loading ? <Skeleton h="24px" w="44px" borderRadius="full" /> : (
                    <Switch
                      colorScheme="green"
                      isChecked={profile.gst_registered}
                      onChange={e => set('gst_registered', e.target.checked)}
                      size="md"
                    />
                  )}
                </Flex>

                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color={TEXT_DARK}>TDS Applicable</Text>
                    <Text fontSize="xs" color={TEXT_MUTED}>Enable TDS deduction on payments</Text>
                  </Box>
                  {loading ? <Skeleton h="24px" w="44px" borderRadius="full" /> : (
                    <Switch
                      colorScheme="green"
                      isChecked={profile.tds_applicable}
                      onChange={e => set('tds_applicable', e.target.checked)}
                      size="md"
                    />
                  )}
                </Flex>

                <Alert status="info" borderRadius="12px" fontSize="sm">
                  <AlertIcon />
                  <AlertDescription>
                    GST and TDS settings affect how the AI Accountant creates journal entries for your transactions.
                  </AlertDescription>
                </Alert>
              </Flex>
            </Box>
          </TabPanel>

          {/* Account Tab */}
          <TabPanel p="0">
            <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px" maxW="500px">
              <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="20px">Account Information</Text>
              <Flex direction="column" gap="16px">
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">Email Address</FormLabel>
                  <Input value={user?.email || ''} isReadOnly borderRadius="10px" fontSize="sm" bg="gray.50" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={TEXT_DARK} mb="6px">Full Name</FormLabel>
                  <Input
                    value={(user?.user_metadata?.full_name as string) || ''}
                    isReadOnly
                    borderRadius="10px" fontSize="sm" bg="gray.50"
                  />
                </FormControl>
                <Alert status="info" borderRadius="12px" fontSize="sm">
                  <AlertIcon />
                  <AlertDescription>
                    To change your email or password, use the Supabase authentication portal.
                  </AlertDescription>
                </Alert>
              </Flex>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
