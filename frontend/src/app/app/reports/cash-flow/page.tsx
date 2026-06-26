'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Box, Button, Divider, Flex, Grid, Icon, Skeleton, Text,
} from '@chakra-ui/react';
import { MdPrint, MdRefresh, MdWaterfallChart, MdTrendingUp, MdTrendingDown, MdAccountBalance } from 'react-icons/md';
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

function SectionRow({ label, amount, isBold = false, isTotal = false }: {
  label: string; amount: number; isBold?: boolean; isTotal?: boolean;
}) {
  const isNeg = amount < 0;
  return (
    <Flex
      justify="space-between" align="center"
      py={isTotal ? '10px' : '7px'}
      borderTop={isTotal ? '2px solid' : 'none'} borderColor={BORDER} mt={isTotal ? '4px' : '0'}
    >
      <Text fontSize="sm" fontWeight={isBold || isTotal ? '700' : '400'} color={isTotal ? TEXT_DARK : TEXT_BODY}>{label}</Text>
      <Text fontSize="sm" fontWeight={isBold || isTotal ? '700' : '400'}
        color={isNeg ? '#EE5D50' : (isTotal ? TEXT_DARK : TEXT_BODY)} fontFamily="mono">
        {isNeg ? `(${fmt(Math.abs(amount))})` : fmt(amount)}
      </Text>
    </Flex>
  );
}

// Classify accounts into cash flow sections
function classifyAccount(name: string, type: string): 'operating' | 'investing' | 'financing' | null {
  const lower = name.toLowerCase();
  if (type === 'Revenue' || (type === 'Expense' && !lower.includes('depreciation'))) return 'operating';
  if (lower.includes('fixed') || lower.includes('plant') || lower.includes('machinery') || lower.includes('land') || lower.includes('building') || lower.includes('computer') || lower.includes('vehicle')) return 'investing';
  if (type === 'Equity' || lower.includes('loan') || lower.includes('capital') || lower.includes('borrowing')) return 'financing';
  return 'operating';
}

export default function CashFlowPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-04-01`;
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [operating, setOperating] = useState<{ name: string; amount: number }[]>([]);
  const [investing, setInvesting] = useState<{ name: string; amount: number }[]>([]);
  const [financing, setFinancing] = useState<{ name: string; amount: number }[]>([]);
  const [monthlyFlow, setMonthlyFlow] = useState<{ month: string; inflow: number; outflow: number }[]>([]);

  const totalOperating = operating.reduce((s, a) => s + a.amount, 0);
  const totalInvesting = investing.reduce((s, a) => s + a.amount, 0);
  const totalFinancing = financing.reduce((s, a) => s + a.amount, 0);
  const netCashFlow = totalOperating + totalInvesting + totalFinancing;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, entry_date, transaction_type, total_amount')
        .eq('user_id', user.id)
        .neq('status', 'void')
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo);

      if (!entries?.length) {
        setOperating([]); setInvesting([]); setFinancing([]); setMonthlyFlow([]);
        setLoading(false); return;
      }

      const ids = entries.map((e: any) => e.id);
      const { data: lines } = await supabase
        .from('journal_lines')
        .select('account_name, account_type, debit, credit')
        .in('journal_entry_id', ids);

      // For Cash Flow: classify cash movements
      // Cash inflows = credits to bank/cash accounts or debits to income accounts
      // Cash outflows = debits to bank/cash or credits to income
      const CASH_ACCOUNTS = ['cash', 'bank'];

      const opMap: Record<string, number> = {};
      const invMap: Record<string, number> = {};
      const finMap: Record<string, number> = {};

      (lines || []).forEach((l: any) => {
        const lower = l.account_name.toLowerCase();
        const isCash = CASH_ACCOUNTS.some(c => lower.includes(c));
        if (isCash) return; // Skip cash accounts themselves

        const section = classifyAccount(l.account_name, l.account_type);
        const netFlow = parseFloat(l.credit || 0) - parseFloat(l.debit || 0);

        if (section === 'operating') opMap[l.account_name] = (opMap[l.account_name] || 0) + netFlow;
        else if (section === 'investing') invMap[l.account_name] = (invMap[l.account_name] || 0) + netFlow;
        else if (section === 'financing') finMap[l.account_name] = (finMap[l.account_name] || 0) + netFlow;
      });

      setOperating(Object.entries(opMap).map(([name, amount]) => ({ name, amount })).filter(a => Math.abs(a.amount) > 0.01));
      setInvesting(Object.entries(invMap).map(([name, amount]) => ({ name, amount })).filter(a => Math.abs(a.amount) > 0.01));
      setFinancing(Object.entries(finMap).map(([name, amount]) => ({ name, amount })).filter(a => Math.abs(a.amount) > 0.01));

      // Monthly cash flow
      const monthMap: Record<string, { inflow: number; outflow: number }> = {};
      (entries || []).forEach((e: any) => {
        const key = e.entry_date.slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { inflow: 0, outflow: 0 };
        if (e.transaction_type === 'income') monthMap[key].inflow += parseFloat(e.total_amount || 0);
        if (e.transaction_type === 'expense') monthMap[key].outflow += parseFloat(e.total_amount || 0);
      });

      const monthly = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
        const [y, m] = key.split('-');
        return {
          month: new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
          ...v,
        };
      });
      setMonthlyFlow(monthly);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="12px" className="no-print">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Cash Flow Statement</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Operating, Investing & Financing activities</Text>
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

      {/* KPI Summary */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(4, 1fr)' }} gap="16px" mb="24px">
        {[
          { label: 'Operating', value: totalOperating, color: '#01B574', bg: 'linear-gradient(135deg,#E6FAF5,#B3E3CC)', icon: MdTrendingUp },
          { label: 'Investing', value: totalInvesting, color: '#3965FF', bg: 'linear-gradient(135deg,#EFF4FB,#C7D7F4)', icon: MdAccountBalance },
          { label: 'Financing', value: totalFinancing, color: '#7551FF', bg: 'linear-gradient(135deg,#F2EFFF,#D5CCFF)', icon: MdWaterfallChart },
          { label: 'Net Cash Flow', value: netCashFlow, color: netCashFlow >= 0 ? '#01B574' : '#EE5D50', bg: netCashFlow >= 0 ? 'linear-gradient(135deg,#E6FAF5,#B3E3CC)' : 'linear-gradient(135deg,#FEEFEE,#FECACA)', icon: MdTrendingDown },
        ].map(({ label, value, color, bg, icon }) => (
          <Box key={label} bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="20px">
            <Flex align="center" gap="12px">
              <Flex w="40px" h="40px" bg={bg} borderRadius="10px" align="center" justify="center" flexShrink={0}>
                <Icon as={icon} w="20px" h="20px" color={color} />
              </Flex>
              <Box>
                <Text fontSize="10px" color={TEXT_MUTED} fontWeight="700" textTransform="uppercase" letterSpacing="0.5px" mb="4px">{label}</Text>
                {loading ? <Skeleton h="22px" w="80px" /> : (
                  <Text fontSize="lg" fontWeight="800" color={color} fontFamily="mono">
                    {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
                  </Text>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
      </Grid>

      {/* Chart */}
      <Box bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="28px" mb="20px">
        <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="4px">Monthly Cash Inflows vs Outflows</Text>
        <Text fontSize="xs" color={TEXT_MUTED} mb="20px">Cash movement over the selected period</Text>
        {loading ? <Skeleton h="240px" borderRadius="12px" /> : monthlyFlow.length === 0 ? (
          <Flex align="center" justify="center" h="180px">
            <Text fontSize="sm" color={TEXT_MUTED}>No cash flow data for this period.</Text>
          </Flex>
        ) : (
          <Chart
            options={{
              chart: { type: 'area', toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif' },
              xaxis: { categories: monthlyFlow.map(m => m.month), labels: { style: { colors: TEXT_MUTED } }, axisBorder: { show: false }, axisTicks: { show: false } },
              yaxis: { labels: { formatter: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`, style: { colors: TEXT_MUTED } } },
              colors: ['#01B574', '#EE5D50'],
              fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
              stroke: { curve: 'smooth', width: 3 },
              legend: { position: 'top', labels: { colors: TEXT_BODY } },
              dataLabels: { enabled: false },
              grid: { borderColor: BORDER, strokeDashArray: 4 },
              tooltip: { y: { formatter: (v: number) => fmt(v) } },
            }}
            series={[
              { name: 'Cash Inflows', data: monthlyFlow.map(m => m.inflow) },
              { name: 'Cash Outflows', data: monthlyFlow.map(m => m.outflow) },
            ]}
            type="area" height={240} width="100%"
          />
        )}
      </Box>

      {/* Three-section Statement */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap="20px">
        {[
          { title: 'Operating Activities', items: operating, total: totalOperating, color: '#01B574' },
          { title: 'Investing Activities', items: investing, total: totalInvesting, color: '#3965FF' },
          { title: 'Financing Activities', items: financing, total: totalFinancing, color: '#7551FF' },
        ].map(({ title, items, total, color }) => (
          <Box key={title} bg="white" borderRadius="20px" boxShadow={CARD_SHADOW} p="24px">
            <Text fontWeight="700" fontSize="sm" color={TEXT_DARK} mb="16px" borderBottom="2px solid" borderColor={color} pb="10px">{title}</Text>
            {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} h="24px" mb="8px" borderRadius="6px" />) :
              items.length === 0 ? <Text fontSize="sm" color={TEXT_MUTED}>No entries.</Text> : (
                <>
                  {items.map(a => <SectionRow key={a.name} label={a.name} amount={a.amount} />)}
                  <SectionRow label={`Net ${title.split(' ')[0]}`} amount={total} isTotal />
                </>
              )}
          </Box>
        ))}
      </Grid>
    </Box>
  );
}
