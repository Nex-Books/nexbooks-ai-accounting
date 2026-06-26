'use client';

import React, { useState, useCallback } from 'react';
import {
  Badge, Box, Button, Flex, Icon, IconButton, Input, Select, Spinner,
  Tab, Table, TabList, TabPanel, TabPanels, Tabs, Tbody, Td, Text,
  Th, Thead, Tr, useToast,
} from '@chakra-ui/react';
import { MdRefresh, MdDownload, MdBarChart } from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const fmtSigned = (n: number) =>
  (n < 0 ? '(₹' : '₹') +
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
  (n < 0 ? ')' : '');

interface AccountBalance {
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

const TYPE_ORDER = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const TYPE_COLORS: Record<string, string> = {
  Asset: 'blue', Liability: 'red', Equity: 'purple', Revenue: 'green', Expense: 'orange',
};

// ─── Trial Balance ────────────────────────────────────────────────────────────

function TrialBalance({ userId, authHeader }: { userId: string; authHeader: () => Promise<Record<string, string>> }) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`${API}/accounts/summary?user_id=${userId}`, { headers });
      const data = await res.json();
      setBalances(data.data || []);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, authHeader]);

  const grouped: Record<string, AccountBalance[]> = {};
  for (const b of balances) {
    (grouped[b.account_type] ??= []).push(b);
  }

  const totalDebit = balances.reduce((s, b) => s + b.total_debit, 0);
  const totalCredit = balances.reduce((s, b) => s + b.total_credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Box>
      <Flex mb="20px" gap="10px" align="center">
        <Button
          size="sm" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }} borderRadius="10px"
          isLoading={loading} onClick={load} leftIcon={<MdBarChart />}
        >
          {loaded ? 'Refresh' : 'Generate Trial Balance'}
        </Button>
        {loaded && (
          <Badge colorScheme={isBalanced ? 'green' : 'red'} fontSize="11px" px="10px" py="3px" borderRadius="8px">
            {isBalanced ? '✓ Balanced' : '✗ Out of balance'}
          </Badge>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
      ) : !loaded ? (
        <Flex direction="column" align="center" py="60px" gap="12px"
          bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
          <Icon as={MdBarChart} w="32px" h="32px" color="gray.300" />
          <Text color="gray.500">Click Generate to view the Trial Balance</Text>
        </Flex>
      ) : balances.length === 0 ? (
        <Flex direction="column" align="center" py="60px" gap="12px"
          bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
          <Text color="gray.500">No transactions recorded yet</Text>
        </Flex>
      ) : (
        <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
          <Flex px="20px" py="14px" borderBottom="1px solid" borderColor="gray.100"
            align="center" justify="space-between">
            <Text fontSize="sm" fontWeight="800" color="gray.700">Trial Balance</Text>
            <Text fontSize="xs" color="gray.400">All amounts in INR (₹)</Text>
          </Flex>
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th fontSize="11px" py="12px" color="gray.500">Account</Th>
                <Th fontSize="11px" color="gray.500">Type</Th>
                <Th isNumeric fontSize="11px" color="gray.500">Debit (₹)</Th>
                <Th isNumeric fontSize="11px" color="gray.500">Credit (₹)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {TYPE_ORDER.map(type => {
                const typeAccs = grouped[type];
                if (!typeAccs?.length) return null;
                return (
                  <React.Fragment key={type}>
                    <Tr bg={`${TYPE_COLORS[type]}.50`}>
                      <Td colSpan={4} py="8px">
                        <Badge colorScheme={TYPE_COLORS[type]} fontSize="10px" borderRadius="5px" px="8px">
                          {type}
                        </Badge>
                      </Td>
                    </Tr>
                    {typeAccs.map((b, i) => (
                      <Tr key={i} _hover={{ bg: 'gray.50' }}>
                        <Td fontSize="sm" color="gray.800" pl="24px" py="10px">{b.account_name}</Td>
                        <Td fontSize="xs" color="gray.500">{b.account_type}</Td>
                        <Td isNumeric fontSize="xs" fontFamily="mono" color="green.700">
                          {b.total_debit > 0 ? fmt(b.total_debit) : '—'}
                        </Td>
                        <Td isNumeric fontSize="xs" fontFamily="mono" color="red.600">
                          {b.total_credit > 0 ? fmt(b.total_credit) : '—'}
                        </Td>
                      </Tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {/* Totals */}
              <Tr bg="gray.100" fontWeight="800">
                <Td colSpan={2} fontSize="sm" py="12px" fontWeight="800">Grand Total</Td>
                <Td isNumeric fontSize="sm" fontFamily="mono" fontWeight="800" color="green.700">
                  {fmt(totalDebit)}
                </Td>
                <Td isNumeric fontSize="sm" fontFamily="mono" fontWeight="800" color="red.600">
                  {fmt(totalCredit)}
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

function ProfitLoss({ userId, authHeader }: { userId: string; authHeader: () => Promise<Record<string, string>> }) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`${API}/accounts/summary?user_id=${userId}`, { headers });
      const data = await res.json();
      setBalances(data.data || []);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, authHeader]);

  const revenue = balances.filter(b => b.account_type === 'Revenue');
  const expenses = balances.filter(b => b.account_type === 'Expense');
  const totalRevenue = revenue.reduce((s, b) => s + b.balance, 0);
  const totalExpenses = expenses.reduce((s, b) => s + b.balance, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <Box>
      <Flex mb="20px" gap="10px" align="center">
        <Button size="sm" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }} borderRadius="10px"
          isLoading={loading} onClick={load} leftIcon={<MdBarChart />}>
          {loaded ? 'Refresh' : 'Generate P&L Statement'}
        </Button>
        {loaded && (
          <Badge colorScheme={netProfit >= 0 ? 'green' : 'red'} fontSize="11px" px="10px" py="3px" borderRadius="8px">
            {netProfit >= 0 ? `Net Profit: ${fmt(netProfit)}` : `Net Loss: ${fmt(netProfit)}`}
          </Badge>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
      ) : !loaded ? (
        <Flex direction="column" align="center" py="60px" gap="12px"
          bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
          <Icon as={MdBarChart} w="32px" h="32px" color="gray.300" />
          <Text color="gray.500">Click Generate to view the P&L Statement</Text>
        </Flex>
      ) : (
        <Flex gap="20px" wrap="wrap">
          {/* Revenue */}
          <Box flex="1" minW="280px" bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
            <Flex px="20px" py="12px" bg="green.50" borderBottom="1px solid" borderColor="green.100" justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="700" color="green.700">Revenue</Text>
              <Text fontSize="sm" fontWeight="800" fontFamily="mono" color="green.700">{fmt(totalRevenue)}</Text>
            </Flex>
            <Table size="sm">
              <Tbody>
                {revenue.length === 0 ? (
                  <Tr><Td colSpan={2} py="20px" textAlign="center" color="gray.400" fontSize="xs">No revenue recorded</Td></Tr>
                ) : revenue.map((b, i) => (
                  <Tr key={i} _hover={{ bg: 'gray.50' }}>
                    <Td fontSize="sm" py="10px">{b.account_name}</Td>
                    <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="600" color="green.700">
                      {fmt(b.balance)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {/* Expenses */}
          <Box flex="1" minW="280px" bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
            <Flex px="20px" py="12px" bg="orange.50" borderBottom="1px solid" borderColor="orange.100" justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="700" color="orange.700">Expenses</Text>
              <Text fontSize="sm" fontWeight="800" fontFamily="mono" color="orange.700">{fmt(totalExpenses)}</Text>
            </Flex>
            <Table size="sm">
              <Tbody>
                {expenses.length === 0 ? (
                  <Tr><Td colSpan={2} py="20px" textAlign="center" color="gray.400" fontSize="xs">No expenses recorded</Td></Tr>
                ) : expenses.map((b, i) => (
                  <Tr key={i} _hover={{ bg: 'gray.50' }}>
                    <Td fontSize="sm" py="10px">{b.account_name}</Td>
                    <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="600" color="orange.700">
                      {fmt(b.balance)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {/* Net result */}
          {loaded && (
            <Box w="100%" bg={netProfit >= 0 ? '#155740' : 'red.600'}
              borderRadius="14px" px="24px" py="18px">
              <Flex align="center" justify="space-between">
                <Box>
                  <Text color={netProfit >= 0 ? 'green.200' : 'red.200'} fontSize="xs" fontWeight="600" mb="2px">
                    {netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                  </Text>
                  <Text color="white" fontSize="2xl" fontWeight="800" fontFamily="mono">
                    {fmt(Math.abs(netProfit))}
                  </Text>
                </Box>
                <Text fontSize="sm" color={netProfit >= 0 ? 'green.300' : 'red.300'}>
                  Revenue ₹{fmt(totalRevenue)} − Expenses ₹{fmt(totalExpenses)}
                </Text>
              </Flex>
            </Box>
          )}
        </Flex>
      )}
    </Box>
  );
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

function BalanceSheet({ userId, authHeader }: { userId: string; authHeader: () => Promise<Record<string, string>> }) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`${API}/accounts/summary?user_id=${userId}`, { headers });
      const data = await res.json();
      setBalances(data.data || []);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, authHeader]);

  const assets = balances.filter(b => b.account_type === 'Asset');
  const liabilities = balances.filter(b => b.account_type === 'Liability');
  const equity = balances.filter(b => b.account_type === 'Equity');

  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
  const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);
  const totalEquity = equity.reduce((s, b) => s + b.balance, 0);
  const totalLE = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLE) < 1;

  const SideTable = ({ title, items, total, color }: {
    title: string; items: AccountBalance[]; total: number; color: string;
  }) => (
    <Box flex="1" minW="280px" bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
      <Flex px="20px" py="12px" bg={`${color}.50`} borderBottom="1px solid" borderColor={`${color}.100`}
        justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="700" color={`${color}.700`}>{title}</Text>
        <Text fontSize="sm" fontWeight="800" fontFamily="mono" color={`${color}.700`}>{fmt(total)}</Text>
      </Flex>
      <Table size="sm">
        <Tbody>
          {items.length === 0 ? (
            <Tr><Td py="20px" textAlign="center" color="gray.400" fontSize="xs">No entries</Td></Tr>
          ) : items.map((b, i) => (
            <Tr key={i} _hover={{ bg: 'gray.50' }}>
              <Td fontSize="sm" py="10px">{b.account_name}</Td>
              <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="600" color={`${color}.700`}>
                {fmt(b.balance)}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  return (
    <Box>
      <Flex mb="20px" gap="10px" align="center">
        <Button size="sm" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }} borderRadius="10px"
          isLoading={loading} onClick={load} leftIcon={<MdBarChart />}>
          {loaded ? 'Refresh' : 'Generate Balance Sheet'}
        </Button>
        {loaded && (
          <Badge colorScheme={isBalanced ? 'green' : 'red'} fontSize="11px" px="10px" py="3px" borderRadius="8px">
            {isBalanced ? '✓ Assets = Liabilities + Equity' : '✗ Does not balance'}
          </Badge>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
      ) : !loaded ? (
        <Flex direction="column" align="center" py="60px" gap="12px"
          bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
          <Icon as={MdBarChart} w="32px" h="32px" color="gray.300" />
          <Text color="gray.500">Click Generate to view the Balance Sheet</Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="16px">
          <Text fontSize="xs" color="gray.500">Accounting equation: Assets = Liabilities + Equity</Text>
          <Flex gap="16px" wrap="wrap">
            <SideTable title="Assets" items={assets} total={totalAssets} color="blue" />
            <Flex direction="column" gap="16px" flex="1" minW="280px">
              <SideTable title="Liabilities" items={liabilities} total={totalLiabilities} color="red" />
              <SideTable title="Equity" items={equity} total={totalEquity} color="purple" />
            </Flex>
          </Flex>
          {/* Totals row */}
          <Flex gap="16px" wrap="wrap">
            <Box flex="1" bg="blue.700" borderRadius="12px" px="20px" py="14px">
              <Text color="blue.200" fontSize="xs" fontWeight="600">TOTAL ASSETS</Text>
              <Text color="white" fontSize="xl" fontFamily="mono" fontWeight="800">{fmt(totalAssets)}</Text>
            </Box>
            <Box flex="1" bg={isBalanced ? '#155740' : 'red.600'} borderRadius="12px" px="20px" py="14px">
              <Text color={isBalanced ? 'green.200' : 'red.200'} fontSize="xs" fontWeight="600">
                TOTAL LIABILITIES + EQUITY
              </Text>
              <Text color="white" fontSize="xl" fontFamily="mono" fontWeight="800">{fmt(totalLE)}</Text>
            </Box>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  return (
    <Box bg="gray.50" minH="100%">
      <Flex px={{ base: '20px', md: '32px' }} pt="28px" pb="20px"
        bg="white" borderBottom="1px solid" borderColor="gray.200" align="center" justify="space-between">
        <Box>
          <Text fontSize="xl" fontWeight="800" color="gray.800" letterSpacing="-0.5px">
            Financial Reports
          </Text>
          <Text fontSize="sm" color="gray.500" mt="2px">
            Trial Balance · Profit & Loss · Balance Sheet
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print">
          Print Report
        </Button>
      </Flex>

      <Box px={{ base: '20px', md: '32px' }} py="20px">
        <Tabs colorScheme="green">
          <TabList mb="20px" borderBottom="2px solid" borderColor="gray.200">
            <Tab fontSize="sm" fontWeight="600" color="gray.500"
              _selected={{ color: '#155740', borderColor: '#155740' }}>
              📊 Trial Balance
            </Tab>
            <Tab fontSize="sm" fontWeight="600" color="gray.500"
              _selected={{ color: '#155740', borderColor: '#155740' }}>
              💹 Profit & Loss
            </Tab>
            <Tab fontSize="sm" fontWeight="600" color="gray.500"
              _selected={{ color: '#155740', borderColor: '#155740' }}>
              📋 Balance Sheet
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel p="0">
              {user?.id && <TrialBalance userId={user.id} authHeader={getAuthHeader} />}
            </TabPanel>
            <TabPanel p="0">
              {user?.id && <ProfitLoss userId={user.id} authHeader={getAuthHeader} />}
            </TabPanel>
            <TabPanel p="0">
              {user?.id && <BalanceSheet userId={user.id} authHeader={getAuthHeader} />}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}
