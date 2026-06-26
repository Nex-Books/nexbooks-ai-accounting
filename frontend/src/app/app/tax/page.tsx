'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge, Box, Button, Flex, Icon, IconButton, Select, Spinner, Stat,
  StatLabel, StatNumber, StatHelpText, Tab, Table, TabList, TabPanel,
  TabPanels, Tabs, Tbody, Td, Text, Th, Thead, Tr, useToast,
} from '@chakra-ui/react';
import { MdRefresh, MdCheckCircle, MdWarning } from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function StatCard({
  label, value, helpText, color = 'gray.800', accent = false,
}: {
  label: string; value: string; helpText?: string; color?: string; accent?: boolean;
}) {
  return (
    <Box
      bg={accent ? '#155740' : 'white'}
      borderRadius="14px"
      px="20px"
      py="18px"
      border="1px solid"
      borderColor={accent ? '#155740' : 'gray.200'}
      flex="1"
      minW="150px"
    >
      <Text fontSize="xs" color={accent ? 'green.200' : 'gray.500'} fontWeight="600" mb="4px">
        {label}
      </Text>
      <Text
        fontSize="xl"
        fontWeight="800"
        fontFamily="mono"
        color={accent ? 'white' : color}
        letterSpacing="-0.5px"
      >
        {value}
      </Text>
      {helpText && (
        <Text fontSize="xs" color={accent ? 'green.300' : 'gray.400'} mt="2px">
          {helpText}
        </Text>
      )}
    </Box>
  );
}

// ─── GST Tab ──────────────────────────────────────────────────────────────────

function GSTTab({ userId, authHeader }: { userId: string; authHeader: () => Promise<Record<string, string>> }) {
  const toast = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [returns, setReturns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const [gstRes, retRes] = await Promise.all([
        fetch(`${API}/finance/gst-summary?user_id=${userId}&month=${month}&year=${year}`, { headers }),
        fetch(`${API}/finance/gst-returns?user_id=${userId}&year=${year}`, { headers }),
      ]);
      if (gstRes.ok) setData(await gstRes.json());
      if (retRes.ok) {
        const rd = await retRes.json();
        setReturns(rd.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, month, year, authHeader]);

  useEffect(() => { load(); }, [load]);

  const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <Box>
      {/* Filter bar */}
      <Flex gap="10px" mb="20px" wrap="wrap" align="center">
        <Select size="sm" w="140px" bg="white" borderRadius="8px" borderColor="gray.200"
          value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </Select>
        <Select size="sm" w="100px" bg="white" borderRadius="8px" borderColor="gray.200"
          value={year} onChange={e => setYear(Number(e.target.value))}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
        <IconButton aria-label="Refresh" icon={<MdRefresh />} size="sm"
          variant="ghost" onClick={load} isLoading={loading} />
      </Flex>

      {loading && !data ? (
        <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
      ) : data ? (
        <>
          {/* Summary cards */}
          <Flex gap="12px" wrap="wrap" mb="24px">
            <StatCard label="Output GST Collected" value={fmt(data.total_output || 0)} helpText="CGST + SGST + IGST" color="#155740" />
            <StatCard label="Input GST Paid" value={fmt(data.total_input || 0)} helpText="ITC available" color="blue.700" />
            <StatCard label="Net GST Payable" value={fmt(data.net_payable || 0)} helpText="Output – Input" color="red.600" accent={(data.net_payable || 0) > 0} />
          </Flex>

          {/* Component breakdown */}
          <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden" mb="24px">
            <Box px="20px" py="12px" borderBottom="1px solid" borderColor="gray.100">
              <Text fontSize="sm" fontWeight="700" color="gray.700">GST Component Breakdown</Text>
            </Box>
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th fontSize="11px" py="10px">Component</Th>
                  <Th isNumeric fontSize="11px">Output (Collected)</Th>
                  <Th isNumeric fontSize="11px">Input (ITC)</Th>
                  <Th isNumeric fontSize="11px">Net Payable</Th>
                </Tr>
              </Thead>
              <Tbody>
                {[
                  { label: 'CGST', out: data.output_cgst || 0, inp: data.input_cgst || 0, net: data.net_cgst || 0 },
                  { label: 'SGST', out: data.output_sgst || 0, inp: data.input_sgst || 0, net: data.net_sgst || 0 },
                  { label: 'IGST', out: data.output_igst || 0, inp: data.input_igst || 0, net: data.net_igst || 0 },
                ].map(row => (
                  <Tr key={row.label} _hover={{ bg: 'gray.50' }}>
                    <Td fontSize="sm" fontWeight="600">{row.label}</Td>
                    <Td isNumeric fontSize="xs" fontFamily="mono" color="green.700">{fmt(row.out)}</Td>
                    <Td isNumeric fontSize="xs" fontFamily="mono" color="blue.700">{fmt(row.inp)}</Td>
                    <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="700"
                      color={row.net > 0 ? 'red.600' : row.net < 0 ? 'green.600' : 'gray.400'}>
                      {row.net !== 0 ? fmt(row.net) : '—'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {/* GST Returns */}
          {returns.length > 0 && (
            <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
              <Box px="20px" py="12px" borderBottom="1px solid" borderColor="gray.100">
                <Text fontSize="sm" fontWeight="700" color="gray.700">
                  GST Returns — FY {year}-{String(year + 1).slice(2)}
                </Text>
              </Box>
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th fontSize="11px" py="10px">Return Type</Th>
                    <Th fontSize="11px">Period</Th>
                    <Th fontSize="11px">Status</Th>
                    <Th isNumeric fontSize="11px">Net Payable</Th>
                    <Th fontSize="11px">Filed Date</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {returns.map((r, i) => (
                    <Tr key={i} _hover={{ bg: 'gray.50' }}>
                      <Td fontSize="sm" fontWeight="600">{r.return_type as string}</Td>
                      <Td fontSize="xs" color="gray.500">
                        {MONTHS[(r.period_month as number) - 1]} {r.period_year as number}
                      </Td>
                      <Td>
                        <Badge colorScheme={r.status === 'filed' ? 'green' : 'yellow'} fontSize="10px" borderRadius="5px">
                          {r.status as string}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="600">
                        {fmt(r.net_payable as number)}
                      </Td>
                      <Td fontSize="xs" color="gray.500">
                        {r.filed_date ? (r.filed_date as string) : '—'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </>
      ) : (
        <Flex direction="column" align="center" py="60px" gap="12px"
          bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
          <Text color="gray.500">No GST data for this period</Text>
          <Text fontSize="sm" color="gray.400">Record transactions with GST using the AI Assistant.</Text>
        </Flex>
      )}
    </Box>
  );
}

// ─── TDS Tab ──────────────────────────────────────────────────────────────────

function TDSTab({ userId, authHeader }: { userId: string; authHeader: () => Promise<Record<string, string>> }) {
  const now = new Date();
  const currentFY = now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;

  const [fy, setFy] = useState(currentFY);
  const [summary, setSummary] = useState<Record<string, unknown>[] | null>(null);
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fyOptions = Array.from({ length: 5 }, (_, i) => {
    const yr = now.getFullYear() - i;
    return `${yr}-${String(yr + 1).slice(2)}`;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const [sumRes, entRes] = await Promise.all([
        fetch(`${API}/finance/tds/summary?user_id=${userId}&financial_year=${fy}`, { headers }),
        fetch(`${API}/finance/tds?user_id=${userId}&financial_year=${fy}&limit=50`, { headers }),
      ]);
      if (sumRes.ok) {
        const sd = await sumRes.json();
        setSummary(sd.data || []);
        setGrandTotal(sd.grand_total_tds || 0);
      }
      if (entRes.ok) {
        const ed = await entRes.json();
        setEntries(ed.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, fy, authHeader]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Flex gap="10px" mb="20px" wrap="wrap" align="center">
        <Select size="sm" w="130px" bg="white" borderRadius="8px" borderColor="gray.200"
          value={fy} onChange={e => setFy(e.target.value)}>
          {fyOptions.map(f => <option key={f} value={f}>FY {f}</option>)}
        </Select>
        <IconButton aria-label="Refresh" icon={<MdRefresh />} size="sm" variant="ghost"
          onClick={load} isLoading={loading} />
      </Flex>

      {loading && !summary ? (
        <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
      ) : (
        <>
          {/* TDS Summary by section */}
          {summary && summary.length > 0 ? (
            <>
              <Flex gap="12px" mb="24px" wrap="wrap">
                <StatCard label="Total TDS Deducted" value={fmt(grandTotal)} helpText={`FY ${fy}`} color="red.700" accent={grandTotal > 0} />
                <StatCard
                  label="Deposited"
                  value={fmt(summary.reduce((s, r) => s + (r.deposited as number || 0), 0))}
                  color="green.700"
                />
                <StatCard
                  label="Pending Deposit"
                  value={fmt(summary.reduce((s, r) => s + (r.pending as number || 0), 0))}
                  color="red.600"
                />
              </Flex>

              <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden" mb="24px">
                <Box px="20px" py="12px" borderBottom="1px solid" borderColor="gray.100">
                  <Text fontSize="sm" fontWeight="700" color="gray.700">TDS by Section — FY {fy}</Text>
                </Box>
                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th fontSize="11px" py="10px">Section</Th>
                      <Th isNumeric fontSize="11px">Entries</Th>
                      <Th isNumeric fontSize="11px">Taxable Amount</Th>
                      <Th isNumeric fontSize="11px">TDS Deducted</Th>
                      <Th isNumeric fontSize="11px">Deposited</Th>
                      <Th isNumeric fontSize="11px">Pending</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {summary.map((row, i) => (
                      <Tr key={i} _hover={{ bg: 'gray.50' }}>
                        <Td>
                          <Flex align="center" gap="6px">
                            <Text fontSize="sm" fontWeight="700" color="#155740">
                              u/s {row.section_code as string}
                            </Text>
                          </Flex>
                        </Td>
                        <Td isNumeric fontSize="xs">{row.entry_count as number}</Td>
                        <Td isNumeric fontSize="xs" fontFamily="mono">{fmt(row.total_taxable as number)}</Td>
                        <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="600" color="red.700">
                          {fmt(row.total_tds as number)}
                        </Td>
                        <Td isNumeric fontSize="xs" fontFamily="mono" color="green.600">
                          {fmt(row.deposited as number)}
                        </Td>
                        <Td isNumeric fontSize="xs" fontFamily="mono"
                          color={(row.pending as number) > 0 ? 'orange.600' : 'gray.400'}>
                          {(row.pending as number) > 0 ? fmt(row.pending as number) : '—'}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              {/* Detailed entries */}
              {entries.length > 0 && (
                <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
                  <Box px="20px" py="12px" borderBottom="1px solid" borderColor="gray.100">
                    <Text fontSize="sm" fontWeight="700" color="gray.700">TDS Entries</Text>
                  </Box>
                  <Table size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th fontSize="11px" py="10px">Deductee</Th>
                        <Th fontSize="11px">Section</Th>
                        <Th isNumeric fontSize="11px">Rate</Th>
                        <Th isNumeric fontSize="11px">Taxable</Th>
                        <Th isNumeric fontSize="11px">TDS Amount</Th>
                        <Th fontSize="11px">Quarter</Th>
                        <Th fontSize="11px">Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {entries.map((e, i) => (
                        <Tr key={i} _hover={{ bg: 'gray.50' }}>
                          <Td fontSize="sm" fontWeight="500">{e.deductee_name as string}</Td>
                          <Td><Badge colorScheme="purple" fontSize="10px" borderRadius="5px">
                            {e.section_code as string}
                          </Badge></Td>
                          <Td isNumeric fontSize="xs">{e.tds_rate as number}%</Td>
                          <Td isNumeric fontSize="xs" fontFamily="mono">{fmt(e.taxable_amount as number)}</Td>
                          <Td isNumeric fontSize="xs" fontFamily="mono" fontWeight="600" color="red.600">
                            {fmt(e.tds_amount as number)}
                          </Td>
                          <Td fontSize="xs" color="gray.500">{e.quarter as string}</Td>
                          <Td>
                            <Badge colorScheme={e.status === 'deposited' ? 'green' : 'yellow'} fontSize="10px" borderRadius="5px">
                              {e.status as string || 'pending'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </>
          ) : (
            <Flex direction="column" align="center" py="60px" gap="12px"
              bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
              <Text color="gray.500">No TDS entries for FY {fy}</Text>
              <Text fontSize="sm" color="gray.400">
                TDS is auto-detected when uploading invoices for professional fees, rent, or contractor payments.
              </Text>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaxPage() {
  const { user } = useAuth();

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  return (
    <Box bg="gray.50" minH="100%">
      {/* Header */}
      <Box px={{ base: '20px', md: '32px' }} pt="28px" pb="20px"
        bg="white" borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="800" color="gray.800" letterSpacing="-0.5px">
          Tax Compliance
        </Text>
        <Text fontSize="sm" color="gray.500" mt="2px">
          GST Returns · TDS Management · Tax Ledger
        </Text>
      </Box>

      <Box px={{ base: '20px', md: '32px' }} py="20px">
        <Tabs colorScheme="green">
          <TabList mb="20px" borderBottom="2px solid" borderColor="gray.200">
            <Tab fontSize="sm" fontWeight="600" color="gray.500"
              _selected={{ color: '#155740', borderColor: '#155740' }}>
              🧾 GST
            </Tab>
            <Tab fontSize="sm" fontWeight="600" color="gray.500"
              _selected={{ color: '#155740', borderColor: '#155740' }}>
              📋 TDS
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel p="0">
              {user?.id && <GSTTab userId={user.id} authHeader={getAuthHeader} />}
            </TabPanel>
            <TabPanel p="0">
              {user?.id && <TDSTab userId={user.id} authHeader={getAuthHeader} />}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}
