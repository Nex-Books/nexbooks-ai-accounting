'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Box, Button, Divider, Flex, Grid, Icon, Skeleton, Text,
} from '@chakra-ui/react';
import { MdPrint, MdRefresh, MdShowChart, MdTrendingDown, MdTrendingUp } from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const TEXT_BODY = '#676C73';
const BORDER = '#E3E5EA';
const PAGE_BG = '#FCFCFD';
const SIDEBAR_GREEN = '#155740';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function SectionRow({ label, amount, isBold = false, isTotal = false, indent = 0 }: {
  label: string; amount: number; isBold?: boolean; isTotal?: boolean; indent?: number;
}) {
  const isNeg = amount < 0;
  return (
    <Flex
      justify="space-between" align="center"
      py={isTotal ? '10px' : '6px'} pl={`${indent * 16}px`}
      borderTop={isTotal ? '2px solid' : 'none'} borderColor={BORDER} mt={isTotal ? '4px' : '0'}
    >
      <Text fontSize="sm" fontWeight={isBold || isTotal ? '700' : '400'} color={isTotal ? TEXT_DARK : TEXT_BODY}>{label}</Text>
      <Text fontSize="sm" fontWeight={isBold || isTotal ? '700' : '400'}
        color={isTotal ? (isNeg ? '#EE5D50' : TEXT_DARK) : TEXT_BODY} fontFamily="mono">
        {isNeg ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
      </Text>
    </Flex>
  );
}

export default function ProfitLossPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-04-01`;
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [revenueAccounts, setRevenueAccounts] = useState<{ name: string; amount: number }[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<{ name: string; amount: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; expense: number }[]>([]);

  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.amount, 0);
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.amount, 0);
  const grossProfit = totalRevenue - expenseAccounts.filter(e => e.name.toLowerCase().includes('cost')).reduce((s, a) => s + a.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, entry_date')
        .eq('user_id', user.id)
        .neq('status', 'void')
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo);

      if (!entries?.length) {
        setRevenueAccounts([]); setExpenseAccounts([]); setMonthlyData([]);
        setLoading(false); return;
      }

      const ids = entries.map((e: any) => e.id);
      const { data: lines } = await supabase
        .from('journal_lines')
        .select('account_name, account_type, debit, credit')
        .in('journal_entry_id', ids);

      // Aggregate by account
      const accMap: Record<string, { type: string; debit: number; credit: number }> = {};
      (lines || []).forEach((l: any) => {
        if (!accMap[l.account_name]) accMap[l.account_name] = { type: l.account_type, debit: 0, credit: 0 };
        accMap[l.account_name].debit += parseFloat(l.debit || 0);
        accMap[l.account_name].credit += parseFloat(l.credit || 0);
      });

      const revenue: { name: string; amount: number }[] = [];
      const expense: { name: string; amount: number }[] = [];

      Object.entries(accMap).forEach(([name, v]) => {
        if (v.type === 'Revenue') {
          const amount = v.credit - v.debit;
          if (amount > 0.01) revenue.push({ name, amount });
        } else if (v.type === 'Expense') {
          const amount = v.debit - v.credit;
          if (amount > 0.01) expense.push({ name, amount });
        }
      });

      setRevenueAccounts(revenue.sort((a, b) => b.amount - a.amount));
      setExpenseAccounts(expense.sort((a, b) => b.amount - a.amount));

      // Monthly trend — get entries map
      const entryDateMap: Record<string, string> = {};
      entries.forEach((e: any) => { entryDateMap[e.id] = e.entry_date; });

      const monthMap: Record<string, { revenue: number; expense: number }> = {};
      (lines || []).forEach((l: any) => {
        // We need the entry date for this line — we'll compute from entries
      });

      // Build monthly from journal entries
      const { data: entryFull } = await supabase
        .from('journal_entries')
        .select('entry_date, transaction_type, total_amount')
        .eq('user_id', user.id)
        .neq('status', 'void')
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo);

      (entryFull || []).forEach((e: any) => {
        const key = e.entry_date.slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { revenue: 0, expense: 0 };
        if (e.transaction_type === 'income') monthMap[key].revenue += parseFloat(e.total_amount || 0);
        if (e.transaction_type === 'expense') monthMap[key].expense += parseFloat(e.total_amount || 0);
      });

      const monthly = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
        const [y, m] = key.split('-');
        return {
          month: new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
          ...v,
        };
      });
      setMonthlyData(monthly);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="12px" className="no-print">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Profit & Loss</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Income statement for the selected period</Text>
        </Box>
        <Flex gap="10px" align="center">
          <Box>
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="4px" textTransform="uppercase">From</Text>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ borderRadius: '10px', border: '1px solid #E3E5EA', padding: '6px 12px', fontSize: '14px' }} />
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="4px" textTransform="uppercase">To</Text>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ borderRadius: '10px', border: '1px solid #E3E5EA', padding: '6px 12px', fontSize: '14px' }} />
          </Box>
          <Button leftIcon={<MdRefresh />} onClick={fetchData} size="sm" variant="outline" borderRadius="10px" isLoading={loading} mt="20px">Refresh</Button>
          <Button leftIcon={<MdPrint />} onClick={() => window.print()} size="sm" bg={SIDEBAR_GREEN} color="white" borderRadius="10px" _hover={{ bg: '#1a6b4d' }} mt="20px">Print</Button>
        </Flex>
      </Flex>

      {/* KPI Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap="16px" mb="24px">
        {[
          { label: 'Total Revenue', value: totalRevenue, icon: MdTrendingUp, color: '#01B574', bg: 'linear-gradient(135deg,#E6FAF5,#B3E3CC)' },
          { label: 'Total Expenses', value: totalExpenses, icon: MdTrendingDown, color: '#EE5D50', bg: 'linear-gradient(135deg,#FEEFEE,#FECACA)' },
          { label: 'Net Profit / Loss', value: netProfit, icon: MdShowChart, color: netProfit >= 0 ? '#01B574' : '#EE5D50', bg: netProfit >= 0 ? 'linear-gradient(135deg,#E6FAF5,#B3E3CC)' : 'linear-gradient(135deg,#FEEFEE,#FECACA)' },
        ].map(({ label, value, icon, color, bg }) => (
          <Box key={label} bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="20px">
            <Flex align="center" gap="12px">
              <Flex w="44px" h="44px" bg={bg} borderRadius="12px" align="center" justify="center" flexShrink={0}>
                <Icon as={icon} w="22px" h="22px" color={color} />
              </Flex>
              <Box>
                <Text fontSize="xs" color={TEXT_MUTED} fontWeight="700" textTransform="uppercase" letterSpacing="0.5px" mb="4px">{label}</Text>
                {loading ? <Skeleton h="24px" w="100px" /> : (
                  <Text fontSize="xl" fontWeight="800" color={color} fontFamily="mono">
                    {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
                  </Text>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
      </Grid>

      {/* Chart + P&L Statement */}
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap="20px">
        {/* Chart */}
        <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px">
          <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="4px">Monthly Revenue vs Expenses</Text>
          <Text fontSize="xs" color={TEXT_MUTED} mb="20px">Trend over selected period</Text>
          {loading ? <Skeleton h="260px" borderRadius="12px" /> : monthlyData.length === 0 ? (
            <Flex align="center" justify="center" h="200px">
              <Text fontSize="sm" color={TEXT_MUTED}>No data for this period.</Text>
            </Flex>
          ) : (
            <Chart
              options={{
                chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif' },
                xaxis: { categories: monthlyData.map(m => m.month), labels: { style: { colors: TEXT_MUTED } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { formatter: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`, style: { colors: TEXT_MUTED } } },
                colors: ['#01B574', '#EE5D50'],
                plotOptions: { bar: { borderRadius: 5, columnWidth: '60%', grouped: true } },
                dataLabels: { enabled: false },
                legend: { position: 'top', labels: { colors: TEXT_BODY } },
                grid: { borderColor: BORDER, strokeDashArray: 4 },
                tooltip: { y: { formatter: (v: number) => fmt(v) } },
              }}
              series={[
                { name: 'Revenue', data: monthlyData.map(m => m.revenue) },
                { name: 'Expenses', data: monthlyData.map(m => m.expense) },
              ]}
              type="bar" height={260} width="100%"
            />
          )}
        </Box>

        {/* P&L Statement */}
        <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px">
          <Text fontWeight="800" fontSize="md" color={TEXT_DARK} mb="16px">Income Statement</Text>
          {loading ? [...Array(8)].map((_, i) => <Skeleton key={i} h="24px" mb="8px" borderRadius="6px" />) : (
            <>
              <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.7px" mb="8px">Revenue</Text>
              {revenueAccounts.length === 0 ? <Text fontSize="sm" color={TEXT_MUTED} mb="8px">No revenue.</Text> :
                revenueAccounts.map(a => <SectionRow key={a.name} label={a.name} amount={a.amount} />)}
              <SectionRow label="Total Revenue" amount={totalRevenue} isBold />

              <Divider my="16px" borderColor={BORDER} />

              <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.7px" mb="8px">Expenses</Text>
              {expenseAccounts.length === 0 ? <Text fontSize="sm" color={TEXT_MUTED} mb="8px">No expenses.</Text> :
                expenseAccounts.map(a => <SectionRow key={a.name} label={a.name} amount={a.amount} />)}
              <SectionRow label="Total Expenses" amount={totalExpenses} isBold />

              <SectionRow
                label={netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                amount={netProfit}
                isTotal
              />
            </>
          )}
        </Box>
      </Grid>
    </Box>
  );
}
