'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert, AlertDescription, AlertIcon, Box, Button, Checkbox, Divider,
  Flex, FormControl, FormLabel, Grid, Icon, Input, Progress, Select,
  Switch, Text, useToast,
} from '@chakra-ui/react';
import {
  MdBusiness, MdCheck, MdChevronRight, MdGavel, MdLocationOn, MdRocketLaunch,
} from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
const GREEN = '#155740';
const MUTED = '#AEB2B9';
const DARK = '#1B2559';

const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'NGO', 'Other'];
const INDUSTRIES = ['Retail', 'Manufacturing', 'Services', 'IT/Software', 'Healthcare', 'Education', 'Construction', 'Trading', 'Hospitality', 'Agriculture', 'Finance', 'Other'];
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

const STEPS = [
  { id: 1, label: 'Company Details', icon: MdBusiness },
  { id: 2, label: 'Location & Address', icon: MdLocationOn },
  { id: 3, label: 'Tax & Compliance', icon: MdGavel },
  { id: 4, label: 'Ready!', icon: MdRocketLaunch },
];

interface ProfileForm {
  company_name: string;
  business_type: string;
  industry: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  financial_year_start: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan_number: string;
  gst_registered: boolean;
  tds_applicable: boolean;
}

const INITIAL: ProfileForm = {
  company_name: '', business_type: '', industry: '',
  phone: '', email: '', website: '',
  currency: 'INR', financial_year_start: 'April',
  address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India',
  gstin: '', pan_number: '', gst_registered: false, tds_applicable: false,
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProfileForm>(INITIAL);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof ProfileForm, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 1) return form.company_name.trim().length > 0;
    return true;
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API}/business/profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, onboarding_complete: true }),
      });
      if (!res.ok) {
        // Try PUT if POST fails (profile already exists)
        const putRes = await fetch(`${API}/business/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, onboarding_complete: true }),
        });
        if (!putRes.ok) throw new Error(await putRes.text());
      }
      toast({
        title: '🎉 Setup complete! Welcome to NexBooks.',
        status: 'success', isClosable: true, duration: 4000, position: 'top',
      });
      router.replace('/app/dashboard');
    } catch (e: any) {
      toast({ title: 'Could not save profile', description: e.message, status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <Flex minH="100vh" bg="linear-gradient(135deg,#0f3d2a 0%,#155740 50%,#1a6b4d 100%)" align="center" justify="center" p="20px">
      <Box w="100%" maxW="600px">
        {/* Logo */}
        <Flex align="center" justify="center" gap="10px" mb="32px">
          <Flex w="44px" h="44px" bg="rgba(255,255,255,0.15)" borderRadius="12px" align="center" justify="center">
            <Icon as={RiRobot2Line} w="24px" h="24px" color="white" />
          </Flex>
          <Text fontSize="2xl" fontWeight="900" color="white" letterSpacing="-0.8px">NexBooks</Text>
        </Flex>

        {/* Step indicators */}
        <Flex mb="8px" justify="space-between">
          {STEPS.map((s, i) => (
            <Flex key={s.id} align="center" gap="6px" flex="1">
              <Flex
                w="32px" h="32px" borderRadius="full"
                bg={step > s.id ? GREEN : step === s.id ? 'white' : 'rgba(255,255,255,0.2)'}
                border="2px solid"
                borderColor={step >= s.id ? 'white' : 'transparent'}
                align="center" justify="center" flexShrink={0}
              >
                {step > s.id
                  ? <Icon as={MdCheck} w="16px" h="16px" color="white" />
                  : <Icon as={s.icon} w="16px" h="16px" color={step === s.id ? GREEN : 'whiteAlpha.700'} />}
              </Flex>
              <Text fontSize="11px" color={step === s.id ? 'white' : 'whiteAlpha.600'} fontWeight={step === s.id ? '700' : '400'} display={{ base: 'none', sm: 'block' }}>
                {s.label}
              </Text>
              {i < STEPS.length - 1 && <Divider flex="1" borderColor="whiteAlpha.300" ml="6px" />}
            </Flex>
          ))}
        </Flex>
        <Progress value={progress} size="xs" colorScheme="whiteAlpha" bg="whiteAlpha.200" borderRadius="full" mb="24px" />

        {/* Card */}
        <Box bg="white" borderRadius="24px" p="32px" boxShadow="0 40px 80px rgba(0,0,0,0.25)">

          {/* STEP 1 — Company Details */}
          {step === 1 && (
            <>
              <Text fontSize="xl" fontWeight="800" color={DARK} mb="6px">Tell us about your business</Text>
              <Text fontSize="sm" color={MUTED} mb="24px">This helps your AI Accountant serve you better</Text>
              <Flex direction="column" gap="16px">
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Company Name *</FormLabel>
                  <Input placeholder="Acme Private Limited" value={form.company_name}
                    onChange={e => set('company_name', e.target.value)} borderRadius="10px" fontSize="sm"
                    _focus={{ borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` }} />
                </FormControl>
                <Grid templateColumns="1fr 1fr" gap="14px">
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Business Type</FormLabel>
                    <Select value={form.business_type} onChange={e => set('business_type', e.target.value)} borderRadius="10px" fontSize="sm">
                      <option value="">Select type</option>
                      {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Industry</FormLabel>
                    <Select value={form.industry} onChange={e => set('industry', e.target.value)} borderRadius="10px" fontSize="sm">
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid templateColumns="1fr 1fr" gap="14px">
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Currency</FormLabel>
                    <Select value={form.currency} onChange={e => set('currency', e.target.value)} borderRadius="10px" fontSize="sm">
                      <option value="INR">INR — Indian Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                      <option value="AED">AED — UAE Dirham</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Financial Year Starts</FormLabel>
                    <Select value={form.financial_year_start} onChange={e => set('financial_year_start', e.target.value)} borderRadius="10px" fontSize="sm">
                      <option value="April">April (India standard)</option>
                      <option value="January">January</option>
                      <option value="July">July</option>
                      <option value="October">October</option>
                    </Select>
                  </FormControl>
                </Grid>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Business Phone</FormLabel>
                  <Input placeholder="+91 98765 43210" value={form.phone}
                    onChange={e => set('phone', e.target.value)} borderRadius="10px" fontSize="sm" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Business Email</FormLabel>
                  <Input type="email" placeholder="accounts@yourcompany.com" value={form.email}
                    onChange={e => set('email', e.target.value)} borderRadius="10px" fontSize="sm" />
                </FormControl>
              </Flex>
            </>
          )}

          {/* STEP 2 — Address */}
          {step === 2 && (
            <>
              <Text fontSize="xl" fontWeight="800" color={DARK} mb="6px">Business Address</Text>
              <Text fontSize="sm" color={MUTED} mb="24px">Used for determining GST (intrastate vs interstate)</Text>
              <Flex direction="column" gap="16px">
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Address Line 1</FormLabel>
                  <Input placeholder="Shop No. 12, Main Street" value={form.address_line1}
                    onChange={e => set('address_line1', e.target.value)} borderRadius="10px" fontSize="sm" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Address Line 2 (Optional)</FormLabel>
                  <Input placeholder="Near XYZ landmark" value={form.address_line2}
                    onChange={e => set('address_line2', e.target.value)} borderRadius="10px" fontSize="sm" />
                </FormControl>
                <Grid templateColumns="1fr 1fr" gap="14px">
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={DARK}>City</FormLabel>
                    <Input placeholder="Mumbai" value={form.city}
                      onChange={e => set('city', e.target.value)} borderRadius="10px" fontSize="sm" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="600" color={DARK}>Pincode</FormLabel>
                    <Input placeholder="400001" value={form.pincode}
                      onChange={e => set('pincode', e.target.value)} borderRadius="10px" fontSize="sm" />
                  </FormControl>
                </Grid>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>State *</FormLabel>
                  <Select value={form.state} onChange={e => set('state', e.target.value)} borderRadius="10px" fontSize="sm">
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </Select>
                </FormControl>
              </Flex>
            </>
          )}

          {/* STEP 3 — Tax */}
          {step === 3 && (
            <>
              <Text fontSize="xl" fontWeight="800" color={DARK} mb="6px">Tax & Compliance</Text>
              <Text fontSize="sm" color={MUTED} mb="24px">Your AI Accountant will automatically apply these rules</Text>
              <Flex direction="column" gap="20px">
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>GSTIN (if GST registered)</FormLabel>
                  <Input placeholder="22AAAAA0000A1Z5" value={form.gstin}
                    onChange={e => set('gstin', e.target.value.toUpperCase())} borderRadius="10px" fontSize="sm"
                    fontFamily="mono" maxLength={15} />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600" color={DARK}>PAN Number</FormLabel>
                  <Input placeholder="AAAAA0000A" value={form.pan_number}
                    onChange={e => set('pan_number', e.target.value.toUpperCase())} borderRadius="10px" fontSize="sm"
                    fontFamily="mono" maxLength={10} />
                </FormControl>
                <Divider />
                <Flex justify="space-between" align="center" p="16px" bg="gray.50" borderRadius="12px">
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color={DARK}>GST Registered</Text>
                    <Text fontSize="xs" color={MUTED}>AI will add GST lines to all taxable transactions</Text>
                  </Box>
                  <Switch colorScheme="green" isChecked={form.gst_registered || !!form.gstin}
                    onChange={e => set('gst_registered', e.target.checked)} size="lg" />
                </Flex>
                <Flex justify="space-between" align="center" p="16px" bg="gray.50" borderRadius="12px">
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color={DARK}>TDS Applicable</Text>
                    <Text fontSize="xs" color={MUTED}>AI will automatically deduct TDS on eligible payments</Text>
                  </Box>
                  <Switch colorScheme="green" isChecked={form.tds_applicable}
                    onChange={e => set('tds_applicable', e.target.checked)} size="lg" />
                </Flex>
                <Alert status="info" borderRadius="12px" fontSize="xs">
                  <AlertIcon />
                  <AlertDescription>
                    Don&apos;t worry — you can change all these settings anytime from <strong>Settings → Tax & Compliance</strong>.
                  </AlertDescription>
                </Alert>
              </Flex>
            </>
          )}

          {/* STEP 4 — Done */}
          {step === 4 && (
            <Flex direction="column" align="center" textAlign="center" py="8px">
              <Flex w="72px" h="72px" bg="linear-gradient(135deg,#E6FAF5,#B3E3CC)" borderRadius="20px"
                align="center" justify="center" mb="20px">
                <Icon as={RiRobot2Line} w="36px" h="36px" color={GREEN} />
              </Flex>
              <Text fontSize="2xl" fontWeight="900" color={DARK} mb="8px">You&apos;re all set!</Text>
              <Text fontSize="sm" color={MUTED} mb="24px" maxW="380px">
                {form.company_name
                  ? `${form.company_name}'s AI Accountant is ready. Just tell it what happened and it will handle all the accounting automatically.`
                  : 'Your AI Accountant is ready. Just describe transactions in plain English and it handles the rest.'}
              </Text>

              {/* Summary */}
              <Box w="100%" bg="gray.50" borderRadius="14px" p="18px" textAlign="left" mb="24px">
                <Text fontSize="xs" fontWeight="700" color={MUTED} mb="12px" textTransform="uppercase" letterSpacing="0.5px">Setup Summary</Text>
                {[
                  ['Company', form.company_name || '—'],
                  ['Type', form.business_type || '—'],
                  ['Industry', form.industry || '—'],
                  ['State', form.state || '—'],
                  ['GST', form.gst_registered || form.gstin ? '✓ Registered' : 'Not registered'],
                  ['TDS', form.tds_applicable ? '✓ Applicable' : 'Not applicable'],
                  ['Currency', form.currency],
                  ['FY Starts', form.financial_year_start],
                ].map(([label, value]) => (
                  <Flex key={label} justify="space-between" py="5px" borderBottom="1px solid" borderColor="gray.100">
                    <Text fontSize="xs" color={MUTED} fontWeight="600">{label}</Text>
                    <Text fontSize="xs" color={DARK} fontWeight="600">{value}</Text>
                  </Flex>
                ))}
              </Box>

              <Button w="100%" bg={GREEN} color="white" borderRadius="12px" size="lg" fontWeight="700"
                _hover={{ bg: '#1a6b4d' }} onClick={handleComplete} isLoading={saving}
                loadingText="Setting up..." leftIcon={<MdRocketLaunch />}>
                Launch NexBooks
              </Button>
            </Flex>
          )}

          {/* Navigation */}
          {step < 4 && (
            <Flex justify="space-between" align="center" mt="28px">
              <Button
                variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}
                isDisabled={step === 1} color={MUTED} _hover={{ color: DARK }}
              >
                ← Back
              </Button>
              <Button
                bg={GREEN} color="white" borderRadius="10px" size="md"
                fontWeight="700" _hover={{ bg: '#1a6b4d' }}
                isDisabled={!canNext()}
                onClick={() => setStep(s => s + 1)}
                rightIcon={<Icon as={MdChevronRight} />}
              >
                {step === 3 ? 'Review' : 'Continue'}
              </Button>
            </Flex>
          )}
        </Box>

        <Text fontSize="xs" color="whiteAlpha.500" textAlign="center" mt="20px">
          Step {step} of {STEPS.length} · You can always update this from Settings
        </Text>
      </Box>
    </Flex>
  );
}
