'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Divider, Flex, Grid, Icon, Select, Skeleton, Text,
} from '@chakra-ui/react';
import { MdPrint, MdRefresh, MdOutlineAccountBalanceWallet } from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const TEXT_BODY = '#676C73';
const BORDER = '#E3E5EA';
const PAGE_BG = '#FCFCFD';
const SIDEBAR_GREEN = '#155740';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

interface AccountBalance {
  account_name: string;
  account_type: string;
  account_sub_type?: string;
  balance: number;
}

// Group accounts by sub-type within a type
function groupBySubType(accounts: AccountBalance[]): Record<string, AccountBalance[]> {
  const groups: Record<string, AccountBalance[]> = {};
  accounts.forEach(a => {
    const key = a.account_sub_type || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

function SectionRow({ label, amount, isBold = false, isTotal = false, indent = 0 }: {
  label: string; amount: number; isBold?: boolean; isTotal?: boolean; indent?: number;
}) {
  return (
    <Flex
      justify="space-between"
      align="center"
      py={isTotal ? '10px' : '6px'}
      px="0"
      pl={`${indent * 16}px`}
      borderTop={isTotal ? '2px solid' : 'none'}
      borderColor={BORDER}
      mt={isTotal ? '4px' : '0'}
    >
      <Text
        fontSize={isTotal ? 'sm' : 'sm'}
        fontWeight={isBold || isTotal ? '700' : '400'}
        color={isTotal ? TEXT_DARK : TEXT_BODY}
      >
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight={isBold || isTotal ? '700' : '400'}
        color={isTotal ? TEXT_DARK : TEXT_BODY}
        fontFamily="mono"
      >
        {amount < 0 ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
      </Text>
    </Flex>
  );
}

export default function BalanceSheetPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);

  const fetchBalances = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all journal entries up to asOfDate
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .neq('status', 'void')
        .lte('entry_date', asOfDate);

      if (!entries?.length) { setBalances([]); setLoading(false); return; }
      const ids = entries.map((e: any) => e.id);

      const { data: lines } = await supabase
        .from('journal_lines')
        .select('account_name, account_type, debit, credit')
        .in('journal_entry_id', ids);

      // Aggregate balance by account
      const accMap: Record<string, { type: string; debit: number; credit: number }> = {};
      (lines || []).forEach((l: any) => {
        if (!accMap[l.account_name]) accMap[l.account_name] = { type: l.account_type, debit: 0, credit: 0 };
        accMap[l.account_name].debit += parseFloat(l.debit || 0);
        accMap[l.account_name].credit += parseFloat(l.credit || 0);
      });

      const result: AccountBalance[] = Object.entries(accMap)
        .filter(([_, v]) => ['Asset', 'Liability', 'Equity'].includes(v.type))
        .map(([name, v]) => {
          // Normal balance: Asset/Expense = Debit; Liability/Equity/Revenue = Credit
          const isDebitNormal = v.type === 'Asset';
          const balance = isDebitNormal ? v.debit - v.credit : v.credit - v.debit;
          return { account_name: name, account_type: v.type, balance };
        })
        .filter(a => Math.abs(a.balance) > 0.01);

      setBalances(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, asOfDate]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const assets = balances.filter(b => b.account_type === 'Asset');
  const liabilities = balances.filter(b => b.account_type === 'Liability');
  const equity = balances.filter(b => b.account_type === 'Equity');

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0);
  const totalLiabEquity = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 1;

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="12px" className="no-print">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Balance Sheet</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Assets, Liabilities & Equity statement</Text>
        </Box>
        <Flex gap="10px" align="center">
          <Box>
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="4px" textTransform="uppercase">As of Date</Text>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              style={{ borderRadius: '10px', border: '1px solid #E3E5EA', padding: '6px 12px', fontSize: '14px' }}
            />
          </Box>
          <Button leftIcon={<MdRefresh />} onClick={fetchBalances} size="sm" variant="outline" borderRadius="10px" isLoading={loading}>Refresh</Button>
          <Button leftIcon={<MdPrint />} onClick={() => window.print()} size="sm" bg={SIDEBAR_GREEN} color="white" borderRadius="10px" _hover={{ bg: '#1a6b4d' }}>Print</Button>
        </Flex>
      </Flex>

      {/* Balance check banner */}
      {!loading && balances.length > 0 && (
        <Box
          mb="20px" p="12px 20px" borderRadius="12px"
          bg={isBalanced ? '#E6FAF5' : '#FEEFEE'}
          borderLeft="4px solid"
          borderColor={isBalanced ? '#01B574' : '#EE5D50'}
        >
          <Text fontSize="sm" fontWeight="600" color={isBalanced ? '#01B574' : '#EE5D50'}>
            {isBalanced
              ? '✓ Balance Sheet is balanced — Assets = Liabilities + Equity'
              : `⚠ Balance Sheet difference: ${fmt(Math.abs(totalAssets - totalLiabEquity))} — check for missing entries`}
          </Text>
        </Box>
      )}

      {/* Summary Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap="16px" mb="24px">
        {[
          { label: 'Total Assets', value: totalAssets, color: '#3965FF', bg: 'linear-gradient(135deg,#EFF4FB,#C7D7F4)' },
          { label: 'Total Liabilities', value: totalLiabilities, color: '#EE5D50', bg: 'linear-gradient(135deg,#FEEFEE,#FECACA)' },
          { label: 'Total Equity', value: totalEquity, color: '#01B574', bg: 'linear-gradient(135deg,#E6FAF5,#B3E3CC)' },
        ].map(({ label, value, color, bg }) => (
          <Box key={label} bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="20px">
            <Flex align="center" gap="12px">
              <Flex w="44px" h="44px" bg={bg} borderRadius="12px" align="center" justify="center" flexShrink={0}>
                <Icon as={MdOutlineAccountBalanceWallet} w="22px" h="22px" color={color} />
              </Flex>
              <Box>
                <Text fontSize="xs" color={TEXT_MUTED} fontWeight="700" textTransform="uppercase" letterSpacing="0.5px" mb="4px">{label}</Text>
                {loading ? <Skeleton h="24px" w="100px" /> : (
                  <Text fontSize="xl" fontWeight="800" color={color} fontFamily="mono">{fmt(value)}</Text>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
      </Grid>

      {/* Balance Sheet Report */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap="20px">
        {/* Assets */}
        <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px">
          <Text fontWeight="800" fontSize="lg" color={TEXT_DARK} mb="20px" borderBottom="2px solid" borderColor={BORDER} pb="12px">
            ASSETS
          </Text>
          {loading ? [...Array(5)].map((_, i) => <Skeleton key={i} h="28px" mb="8px" borderRadius="6px" />) :
            assets.length === 0 ? <Text fontSize="sm" color={TEXT_MUTED}>No asset accounts found.</Text> : (
              <>
                {assets.map(a => <SectionRow key={a.account_name} label={a.account_name} amount={a.balance} />)}
                <SectionRow label="TOTAL ASSETS" amount={totalAssets} isTotal />
              </>
            )}
        </Box>

        {/* Liabilities + Equity */}
        <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px">
          <Text fontWeight="800" fontSize="lg" color={TEXT_DARK} mb="20px" borderBottom="2px solid" borderColor={BORDER} pb="12px">
            LIABILITIES & EQUITY
          </Text>
          {loading ? [...Array(6)].map((_, i) => <Skeleton key={i} h="28px" mb="8px" borderRadius="6px" />) : (
            <>
              <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.7px" mb="8px">Liabilities</Text>
              {liabilities.length === 0 ? <Text fontSize="sm" color={TEXT_MUTED} mb="12px">No liabilities found.</Text> : (
                <>
                  {liabilities.map(a => <SectionRow key={a.account_name} label={a.account_name} amount={a.balance} />)}
                  <SectionRow label="Total Liabilities" amount={totalLiabilities} isBold />
                </>
              )}

              <Divider my="16px" borderColor={BORDER} />

              <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.7px" mb="8px">Equity</Text>
              {equity.length === 0 ? <Text fontSize="sm" color={TEXT_MUTED} mb="12px">No equity accounts found.</Text> : (
                <>
                  {equity.map(a => <SectionRow key={a.account_name} label={a.account_name} amount={a.balance} />)}
                  <SectionRow label="Total Equity" amount={totalEquity} isBold />
                </>
              )}

              <SectionRow label="TOTAL LIABILITIES & EQUITY" amount={totalLiabEquity} isTotal />
            </>
          )}
        </Box>
      </Grid>
    </Box>
  );
}
