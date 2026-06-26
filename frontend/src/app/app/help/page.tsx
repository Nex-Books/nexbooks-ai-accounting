'use client';

import React, { useState } from 'react';
import {
  Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel,
  Badge, Box, Button, Flex, Grid, Icon, Input, InputGroup, InputLeftElement,
  Link, Text,
} from '@chakra-ui/react';
import {
  MdAccountBalance, MdArrowOutward, MdCalculate, MdChat, MdCheckCircle,
  MdGavel, MdOutlineReceiptLong, MdReceipt, MdSearch, MdSettings,
  MdSupportAgent,
} from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';
import NextLink from 'next/link';

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const TEXT_BODY = '#676C73';
const BORDER = '#E3E5EA';
const PAGE_BG = '#FCFCFD';
const GREEN = '#155740';

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: 'AI Accountant',
    q: 'How do I record a transaction?',
    a: 'Just go to AI Accountant and type what happened in plain English. For example: "Paid office rent 15000 for June" or "Received payment from XYZ Ltd 50000". The AI will automatically create the correct double-entry journal entry with all the right accounts.',
  },
  {
    category: 'AI Accountant',
    q: 'Does the AI understand GST automatically?',
    a: 'Yes! If your business is GST registered, the AI automatically splits GST into CGST+SGST for intrastate transactions and uses IGST for interstate. Just mention "plus GST 18%" or "including GST" and it handles it correctly.',
  },
  {
    category: 'AI Accountant',
    q: 'How does TDS work with the AI?',
    a: 'If TDS is enabled in Settings, the AI auto-deducts TDS on applicable payments. For rent (194I): 10%, Professional fees (194J): 10%, Contractor payments (194C): 1-2%. Just mention the type of payment and the AI applies the correct section.',
  },
  {
    category: 'AI Accountant',
    q: 'Can I upload invoice images or PDFs?',
    a: 'Yes! In the AI Accountant or Invoices page, you can attach invoice images (JPG, PNG) or PDFs. The AI reads the invoice using OCR and automatically creates the journal entry with all details extracted.',
  },
  {
    category: 'Invoices & Bills',
    q: 'What is the difference between purchase and sale invoices?',
    a: 'Purchase invoices (bills from suppliers) are expenses — they debit an expense account and credit Accounts Payable. Sale invoices are income — they debit Accounts Receivable and credit Sales Revenue. Both are tracked separately in the Invoices page.',
  },
  {
    category: 'Invoices & Bills',
    q: 'How do I mark an invoice as paid?',
    a: 'On the Invoices page, find the invoice and click the status badge to change it from "pending" to "paid". This also records the payment in your General Ledger.',
  },
  {
    category: 'Accounting',
    q: 'What is the Chart of Accounts?',
    a: 'The Chart of Accounts is the master list of all financial accounts used in your bookkeeping. NexBooks pre-populates it with standard Indian accounts (Assets, Liabilities, Equity, Revenue, Expenses). You can add or deactivate accounts as needed.',
  },
  {
    category: 'Accounting',
    q: 'How does the General Ledger work?',
    a: 'The General Ledger shows all transactions for a specific account over time, with running balances. Select any account (Bank, Revenue, Expenses etc.) and a date range to see its complete transaction history.',
  },
  {
    category: 'Reports',
    q: 'How do I generate a Balance Sheet?',
    a: 'Go to Reports → Balance Sheet. Select the "As of Date" and click Refresh. The report automatically calculates Assets = Liabilities + Equity from your journal entries. You can print it using the Print button.',
  },
  {
    category: 'Reports',
    q: 'How is the Profit & Loss report calculated?',
    a: 'The P&L report sums all Revenue accounts (credits) vs Expense accounts (debits) for the selected date range. Net Profit = Total Revenue - Total Expenses. You can select any date range (e.g. April 1 to March 31 for a full financial year).',
  },
  {
    category: 'GST & Tax',
    q: 'Where can I see my GST liability?',
    a: 'Go to Tax → GST tab. Select the month and year to see Output GST (collected from customers), Input GST (paid to suppliers), and Net GST payable/refundable for that period. You can also file returns from there.',
  },
  {
    category: 'Settings',
    q: 'How do I update my business details?',
    a: 'Go to Settings → Business Info tab. You can update your company name, industry, GST number, address, and financial year start month. Click "Save Changes" when done.',
  },
  {
    category: 'Settings',
    q: 'Can I change currency?',
    a: 'Yes, go to Settings → Business Info and change the Currency field. Note that this only affects display formatting — existing entries are stored as numbers. For multi-currency support, mention the foreign currency in the AI chat.',
  },
];

const QUICK_LINKS = [
  { label: 'AI Accountant', href: '/app/ai-assistant', icon: RiRobot2Line, color: GREEN, desc: 'Record transactions in plain English' },
  { label: 'Journal Entries', href: '/app/journal', icon: MdOutlineReceiptLong, color: '#3965FF', desc: 'View all accounting entries' },
  { label: 'Tax & GST', href: '/app/tax', icon: MdGavel, color: '#7551FF', desc: 'GST reports and TDS tracking' },
  { label: 'Reports', href: '/app/reports', icon: MdAccountBalance, color: '#01B574', desc: 'P&L, Balance Sheet, Cash Flow' },
  { label: 'Settings', href: '/app/settings', icon: MdSettings, color: '#FF6B35', desc: 'Business profile and preferences' },
  { label: 'Audit Logs', href: '/app/audit', icon: MdCheckCircle, color: '#EE5D50', desc: 'Complete history of all entries' },
];

const CATEGORIES = ['All', 'AI Accountant', 'Invoices & Bills', 'Accounting', 'Reports', 'GST & Tax', 'Settings'];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filteredFaqs = FAQS.filter(f => {
    const matchCat = category === 'All' || f.category === category;
    const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Box mb="32px" textAlign="center">
        <Flex w="64px" h="64px" bg="linear-gradient(135deg,#E6FAF5,#B3E3CC)" borderRadius="18px"
          align="center" justify="center" mx="auto" mb="16px">
          <Icon as={MdSupportAgent} w="32px" h="32px" color={GREEN} />
        </Flex>
        <Text fontSize="3xl" fontWeight="900" color={TEXT_DARK} letterSpacing="-0.8px" mb="8px">
          How can we help?
        </Text>
        <Text fontSize="sm" color={TEXT_MUTED} mb="20px">
          Everything you need to know about NexBooks AI Accounting
        </Text>
        <InputGroup maxW="480px" mx="auto" size="md">
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color={TEXT_MUTED} />
          </InputLeftElement>
          <Input
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            borderRadius="12px"
            bg="white"
            boxShadow={CARD_SHADOW}
            border="none"
            fontSize="sm"
            _focus={{ boxShadow: `0 0 0 2px ${GREEN}` }}
          />
        </InputGroup>
      </Box>

      {/* Quick Links */}
      <Box mb="28px">
        <Text fontSize="sm" fontWeight="700" color={TEXT_DARK} mb="14px">Quick Navigation</Text>
        <Grid templateColumns={{ base: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }} gap="12px">
          {QUICK_LINKS.map(link => (
            <NextLink href={link.href} key={link.label}>
              <Box bg="white" borderRadius="14px" boxShadow={CARD_SHADOW} p="16px" cursor="pointer"
                _hover={{ transform: 'translateY(-2px)', boxShadow: '0px 24px 50px rgba(112,144,176,0.18)' }}
                transition="all 0.2s" textAlign="center">
                <Flex w="38px" h="38px" bg={`${link.color}18`} borderRadius="10px"
                  align="center" justify="center" mx="auto" mb="10px">
                  <Icon as={link.icon} w="20px" h="20px" color={link.color} />
                </Flex>
                <Text fontSize="xs" fontWeight="700" color={TEXT_DARK} mb="4px">{link.label}</Text>
                <Text fontSize="10px" color={TEXT_MUTED} noOfLines={2}>{link.desc}</Text>
              </Box>
            </NextLink>
          ))}
        </Grid>
      </Box>

      {/* FAQ Section */}
      <Grid templateColumns={{ base: '1fr', lg: '220px 1fr' }} gap="20px">
        {/* Category filter */}
        <Box>
          <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="10px" textTransform="uppercase" letterSpacing="0.5px">
            Categories
          </Text>
          <Flex direction="column" gap="4px">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={category === cat ? 'solid' : 'ghost'}
                bg={category === cat ? GREEN : 'transparent'}
                color={category === cat ? 'white' : TEXT_BODY}
                justifyContent="flex-start"
                borderRadius="10px"
                fontWeight={category === cat ? '700' : '400'}
                fontSize="sm"
                _hover={{ bg: category === cat ? GREEN : 'gray.100' }}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </Flex>
        </Box>

        {/* FAQ Accordion */}
        <Box>
          <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="10px" textTransform="uppercase" letterSpacing="0.5px">
            {filteredFaqs.length} articles found
          </Text>
          {filteredFaqs.length === 0 ? (
            <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="40px" textAlign="center">
              <Text fontSize="sm" color={TEXT_BODY}>No articles match your search.</Text>
            </Box>
          ) : (
            <Accordion allowMultiple>
              {filteredFaqs.map((faq, i) => (
                <AccordionItem key={i} border="none" mb="10px"
                  bg="white" borderRadius="14px" boxShadow={CARD_SHADOW} overflow="hidden">
                  <AccordionButton px="20px" py="16px" _hover={{ bg: 'gray.50' }}>
                    <Box flex="1" textAlign="left">
                      <Flex align="center" gap="10px">
                        <Badge colorScheme="green" fontSize="10px" borderRadius="6px" px="6px" py="2px">
                          {faq.category}
                        </Badge>
                        <Text fontSize="sm" fontWeight="600" color={TEXT_DARK}>{faq.q}</Text>
                      </Flex>
                    </Box>
                    <AccordionIcon color={TEXT_MUTED} />
                  </AccordionButton>
                  <AccordionPanel px="20px" pb="18px" pt="0">
                    <Text fontSize="sm" color={TEXT_BODY} lineHeight="1.7">{faq.a}</Text>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Contact */}
          <Box bg={GREEN} borderRadius="16px" p="24px" mt="20px" color="white">
            <Flex align="center" gap="14px">
              <Flex w="44px" h="44px" bg="rgba(255,255,255,0.15)" borderRadius="12px" align="center" justify="center" flexShrink={0}>
                <Icon as={RiRobot2Line} w="24px" h="24px" />
              </Flex>
              <Box>
                <Text fontWeight="700" mb="2px">Still need help?</Text>
                <Text fontSize="sm" color="whiteAlpha.800">
                  Ask your AI Accountant directly — it can answer accounting questions, explain entries, and guide you through GST/TDS rules.
                </Text>
              </Box>
              <NextLink href="/app/ai-assistant">
                <Button size="sm" bg="white" color={GREEN} borderRadius="10px" fontWeight="700" flexShrink={0}
                  rightIcon={<Icon as={MdArrowOutward} />} _hover={{ bg: 'gray.50' }}>
                  Ask AI
                </Button>
              </NextLink>
            </Flex>
          </Box>
        </Box>
      </Grid>
    </Box>
  );
}
