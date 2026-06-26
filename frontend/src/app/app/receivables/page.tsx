'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Badge, Box, Button, Flex, Grid, Icon, Input, Select,
  Skeleton, Table, Tbody, Td, Text, Th, Thead, Tr, Tooltip,
} from '@chakra-ui/react';
import {
  MdOutlineReceiptLong, MdRefresh, MdSearch, MdTrendingUp,
  MdWarning, MdCheckCircle, MdSchedule,
} from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const TEXT_BODY = '#676C73';
const BORDER = '#E3E5EA';
const PAGE_BG = '#FCFCFD';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  status: string;
  invoice_type: string;
}

function agingBucket(dueDate: string | undefined): string {
  if (!dueDate) return 'No Due Date';
  const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
  if (days <= 0) return 'Current';
  if (days <= 30) return '1–30 Days';
  if (days <= 60) return '31–60 Days';
  if (days <= 90) return '61–90 Days';
  return '90+ Days';
}

function agingColor(bucket: string): string {
  if (bucket === 'Current') return 'green';
  if (bucket === '1–30 Days') return 'yellow';
  if (bucket === '31–60 Days') return 'orange';
  return 'red';
}

export default function ReceivablesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReceivables = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, vendor_name, invoice_date, due_date, total_amount, status, invoice_type')
        .eq('created_by', user.id)
        .eq('invoice_type', 'sale')
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: false });
      setInvoices(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchReceivables(); }, [fetchReceivables]);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.vendor_name.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalOutstanding = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const overdue = filtered.filter(i => i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date()).length;

  // Aging analysis
  const aging: Record<string, number> = {};
  filtered.filter(i => i.status !== 'paid').forEach(inv => {
    const b = agingBucket(inv.due_date);
    aging[b] = (aging[b] || 0) + inv.total_amount;
  });

  const agingCategories = Object.keys(aging);
  const agingValues = Object.values(aging);

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="12px">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Accounts Receivable</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Track money owed to you from customers</Text>
        </Box>
        <Flex gap="10px">
          <Button leftIcon={<MdRefresh />} onClick={fetchReceivables} size="sm" variant="outline" borderRadius="10px" isLoading={loading}>
            Refresh
          </Button>
          <Link href="/app/invoices">
            <Button leftIcon={<MdOutlineReceiptLong />} size="sm" colorScheme="green" borderRadius="10px">
              New Invoice
            </Button>
          </Link>
        </Flex>
      </Flex>

      {/* KPI Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap="16px" mb="24px">
        {[
          { label: 'Total Outstanding', value: totalOutstanding, icon: MdTrendingUp, bg: 'linear-gradient(135deg,#E6FAF5,#B3E3CC)', color: '#01B574' },
          { label: 'Total Collected', value: totalPaid, icon: MdCheckCircle, bg: 'linear-gradient(135deg,#EFF4FB,#C7D7F4)', color: '#3965FF' },
          { label: 'Overdue Invoices', value: overdue, icon: MdWarning, bg: 'linear-gradient(135deg,#FEEFEE,#FECACA)', color: '#EE5D50', isCount: true },
        ].map(({ label, value, icon, bg, color, isCount }) => (
          <Box key={label} bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="20px">
            <Flex align="center" gap="12px">
              <Flex w="44px" h="44px" bg={bg} borderRadius="12px" align="center" justify="center" flexShrink={0}>
                <Icon as={icon} w="20px" h="20px" color={color} />
              </Flex>
              <Box>
                <Text fontSize="xs" color={TEXT_MUTED} fontWeight="700" textTransform="uppercase" letterSpacing="0.5px" mb="4px">{label}</Text>
                {loading ? <Skeleton h="24px" w="80px" /> : (
                  <Text fontSize="xl" fontWeight="800" color={TEXT_DARK}>
                    {isCount ? value : fmt(value)}
                  </Text>
                )}
              </Box>
            </Flex>
          </Box>
        ))}
      </Grid>

      {/* Aging Chart + Table */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap="20px" mb="24px">
        {/* Aging Analysis */}
        <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="24px">
          <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="4px">Aging Analysis</Text>
          <Text fontSize="xs" color={TEXT_MUTED} mb="20px">Outstanding by overdue period</Text>
          {loading ? <Skeleton h="200px" borderRadius="12px" /> : agingCategories.length === 0 ? (
            <Flex direction="column" align="center" py="40px" gap="8px">
              <Icon as={MdCheckCircle} w="32px" h="32px" color="#01B574" />
              <Text fontSize="sm" color={TEXT_BODY}>All receivables are current!</Text>
            </Flex>
          ) : (
            <Chart
              options={{
                chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'DM Sans, sans-serif' },
                xaxis: { categories: agingCategories, labels: { style: { colors: TEXT_MUTED, fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { formatter: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`, style: { colors: TEXT_MUTED } } },
                colors: ['#3965FF'],
                plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                dataLabels: { enabled: false },
                grid: { borderColor: BORDER, strokeDashArray: 4 },
                tooltip: { y: { formatter: (v: number) => fmt(v) } },
              }}
              series={[{ name: 'Outstanding', data: agingValues }]}
              type="bar"
              height={200}
              width="100%"
            />
          )}
        </Box>

        {/* Customer Summary */}
        <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="24px">
          <Text fontWeight="700" fontSize="md" color={TEXT_DARK} mb="4px">Customer-wise Outstanding</Text>
          <Text fontSize="xs" color={TEXT_MUTED} mb="20px">Top customers by receivable amount</Text>
          {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} h="36px" mb="8px" borderRadius="8px" />) : (() => {
            const byCustomer: Record<string, number> = {};
            filtered.filter(i => i.status !== 'paid').forEach(inv => {
              byCustomer[inv.vendor_name] = (byCustomer[inv.vendor_name] || 0) + inv.total_amount;
            });
            const sorted = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (sorted.length === 0) return <Text fontSize="sm" color={TEXT_BODY} textAlign="center" py="40px">No outstanding receivables.</Text>;
            const maxVal = sorted[0][1];
            return (
              <Flex direction="column" gap="12px">
                {sorted.map(([name, amount]) => (
                  <Box key={name}>
                    <Flex justify="space-between" mb="4px">
                      <Text fontSize="sm" fontWeight="600" color={TEXT_DARK} noOfLines={1}>{name}</Text>
                      <Text fontSize="sm" fontWeight="700" color="#3965FF" fontFamily="mono">{fmt(amount)}</Text>
                    </Flex>
                    <Box h="6px" bg="gray.100" borderRadius="full">
                      <Box h="6px" bg="#3965FF" borderRadius="full" w={`${(amount / maxVal) * 100}%`} transition="width 0.5s" />
                    </Box>
                  </Box>
                ))}
              </Flex>
            );
          })()}
        </Box>
      </Grid>

      {/* Invoice Table */}
      <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} overflow="hidden">
        <Flex px="24px" pt="22px" pb="16px" gap="12px" flexWrap="wrap" align="center">
          <Text fontWeight="700" fontSize="md" color={TEXT_DARK} flex="1">Sales Invoices</Text>
          <Flex gap="10px" flexWrap="wrap">
            <Input
              placeholder="Search customer / invoice #"
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="sm" borderRadius="10px" w="220px"
            />
            <Select size="sm" borderRadius="10px" w="140px" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="booked">Booked</option>
              <option value="paid">Paid</option>
            </Select>
          </Flex>
        </Flex>

        {loading ? (
          <Box px="24px" pb="24px">{[...Array(4)].map((_, i) => <Skeleton key={i} h="48px" mb="8px" borderRadius="8px" />)}</Box>
        ) : filtered.length === 0 ? (
          <Flex direction="column" align="center" py="60px" gap="12px">
            <Flex w="56px" h="56px" bg="teal.50" borderRadius="16px" align="center" justify="center">
              <Icon as={MdOutlineReceiptLong} w="28px" h="28px" color="teal.400" />
            </Flex>
            <Text fontSize="sm" color={TEXT_BODY}>No sales invoices found.</Text>
            <Flex gap="8px">
              <Link href="/app/invoices">
                <Button size="sm" colorScheme="green" borderRadius="10px">Create Invoice</Button>
              </Link>
              <Link href="/app/ai-assistant">
                <Button size="sm" leftIcon={<RiRobot2Line />} variant="outline" borderRadius="10px">Use AI Assistant</Button>
              </Link>
            </Flex>
          </Flex>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr bg={PAGE_BG}>
                  {['Invoice #', 'Customer', 'Date', 'Due Date', 'Amount', 'Aging', 'Status'].map((h, i) => (
                    <Th key={h} px={i === 0 || i === 6 ? '24px' : '12px'} isNumeric={i === 4}
                      fontSize="10px" color={TEXT_MUTED} fontWeight="700" letterSpacing="0.7px"
                      borderColor={BORDER} textTransform="uppercase" py="14px">{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map(inv => {
                  const bucket = agingBucket(inv.due_date);
                  const isPaid = inv.status === 'paid';
                  return (
                    <Tr key={inv.id} _hover={{ bg: PAGE_BG }}>
                      <Td px="24px" borderColor={BORDER} py="12px">
                        <Text fontSize="sm" fontWeight="600" color={TEXT_DARK} fontFamily="mono">{inv.invoice_number}</Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px" maxW="160px">
                        <Text fontSize="sm" color={TEXT_DARK} noOfLines={1}>{inv.vendor_name}</Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px" whiteSpace="nowrap">
                        <Text fontSize="xs" color={TEXT_BODY}>
                          {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px" whiteSpace="nowrap">
                        {inv.due_date ? (
                          <Text fontSize="xs" color={!isPaid && new Date(inv.due_date) < new Date() ? '#EE5D50' : TEXT_BODY}>
                            {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                        ) : <Text fontSize="xs" color={TEXT_MUTED}>—</Text>}
                      </Td>
                      <Td isNumeric borderColor={BORDER} px="12px">
                        <Text fontSize="sm" fontWeight="700" color={TEXT_DARK} fontFamily="mono">{fmt(inv.total_amount)}</Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px">
                        {!isPaid ? (
                          <Badge colorScheme={agingColor(bucket)} borderRadius="6px" fontSize="10px">{bucket}</Badge>
                        ) : (
                          <Text fontSize="xs" color={TEXT_MUTED}>—</Text>
                        )}
                      </Td>
                      <Td px="24px" borderColor={BORDER}>
                        <Badge
                          colorScheme={inv.status === 'paid' ? 'green' : inv.status === 'booked' ? 'blue' : 'yellow'}
                          borderRadius="6px" fontSize="11px" px="8px" py="2px" textTransform="capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Box>
  );
}
