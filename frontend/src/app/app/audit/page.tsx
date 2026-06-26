'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge, Box, Button, Flex, Grid, Icon, Input, Select,
  Skeleton, Table, Tbody, Td, Text, Th, Thead, Tr, Tooltip,
} from '@chakra-ui/react';
import {
  MdAssignment, MdRefresh, MdFilterList,
} from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const TEXT_BODY = '#676C73';
const BORDER = '#E3E5EA';
const PAGE_BG = '#FCFCFD';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

interface AuditEntry {
  id: string;
  entry_date: string;
  description: string;
  total_amount: number;
  transaction_type: string;
  status: string;
  source: string;
  ai_generated: boolean;
  reference_number?: string;
  created_at: string;
  total_debit: number;
  total_credit: number;
}

const SOURCE_COLOR: Record<string, string> = {
  chat: 'green',
  invoice_upload: 'blue',
  manual: 'gray',
};

const SOURCE_LABEL: Record<string, string> = {
  chat: 'AI Chat',
  invoice_upload: 'Invoice Upload',
  manual: 'Manual Entry',
};

const TYPE_COLOR: Record<string, string> = {
  income: 'green',
  expense: 'red',
  asset: 'blue',
  liability: 'purple',
  manual: 'gray',
};

export default function AuditPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const fetchAudit = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let q = supabase
        .from('journal_entries')
        .select('id, entry_date, description, total_amount, transaction_type, status, source, ai_generated, reference_number, created_at, total_debit, total_credit', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * LIMIT, page * LIMIT - 1);

      if (dateFrom) q = q.gte('entry_date', dateFrom);
      if (dateTo) q = q.lte('entry_date', dateTo);
      if (sourceFilter) q = q.eq('source', sourceFilter);
      if (statusFilter) q = q.eq('status', statusFilter);

      const { data, count } = await q;
      setEntries((data as AuditEntry[]) || []);
      setTotal(count || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, page, dateFrom, dateTo, sourceFilter, statusFilter]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const filtered = entries.filter(e =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.reference_number?.toLowerCase().includes(search.toLowerCase())
  );

  const aiCount = entries.filter(e => e.ai_generated).length;
  const manualCount = entries.filter(e => !e.ai_generated).length;
  const voidCount = entries.filter(e => e.status === 'void').length;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="12px">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Audit Logs</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Complete history of all accounting entries and changes</Text>
        </Box>
        <Button leftIcon={<MdRefresh />} onClick={fetchAudit} size="sm" variant="outline" borderRadius="10px" isLoading={loading}>
          Refresh
        </Button>
      </Flex>

      {/* Stats */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(4, 1fr)' }} gap="16px" mb="24px">
        {[
          { label: 'Total Entries', value: total, color: TEXT_DARK },
          { label: 'AI Generated', value: aiCount, color: '#01B574' },
          { label: 'Manual Entries', value: manualCount, color: '#3965FF' },
          { label: 'Voided', value: voidCount, color: '#EE5D50' },
        ].map(({ label, value, color }) => (
          <Box key={label} bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="18px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.5px" mb="6px">{label}</Text>
            {loading ? <Skeleton h="24px" w="60px" /> : (
              <Text fontSize="xl" fontWeight="800" color={color}>{value.toLocaleString()}</Text>
            )}
          </Box>
        ))}
      </Grid>

      {/* Filters */}
      <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="20px" mb="20px">
        <Flex gap="12px" flexWrap="wrap" align="flex-end">
          <Box flex="2" minW="180px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="6px" textTransform="uppercase" letterSpacing="0.5px">Search</Text>
            <Input placeholder="Search description / reference..." value={search} onChange={e => setSearch(e.target.value)} borderRadius="10px" fontSize="sm" />
          </Box>
          <Box flex="1" minW="120px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="6px" textTransform="uppercase" letterSpacing="0.5px">From</Text>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} borderRadius="10px" fontSize="sm" />
          </Box>
          <Box flex="1" minW="120px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="6px" textTransform="uppercase" letterSpacing="0.5px">To</Text>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} borderRadius="10px" fontSize="sm" />
          </Box>
          <Box flex="1" minW="130px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="6px" textTransform="uppercase" letterSpacing="0.5px">Source</Text>
            <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} borderRadius="10px" fontSize="sm">
              <option value="">All Sources</option>
              <option value="chat">AI Chat</option>
              <option value="invoice_upload">Invoice Upload</option>
              <option value="manual">Manual</option>
            </Select>
          </Box>
          <Box flex="1" minW="120px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} mb="6px" textTransform="uppercase" letterSpacing="0.5px">Status</Text>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} borderRadius="10px" fontSize="sm">
              <option value="">All Status</option>
              <option value="posted">Posted</option>
              <option value="draft">Draft</option>
              <option value="void">Void</option>
            </Select>
          </Box>
        </Flex>
      </Box>

      {/* Audit Table */}
      <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} overflow="hidden">
        <Flex px="24px" pt="22px" pb="16px" align="center">
          <Text fontWeight="700" fontSize="md" color={TEXT_DARK} flex="1">Journal Entry Audit Trail</Text>
          <Text fontSize="xs" color={TEXT_MUTED}>{filtered.length} entries shown</Text>
        </Flex>

        {loading ? (
          <Box px="24px" pb="24px">{[...Array(6)].map((_, i) => <Skeleton key={i} h="48px" mb="8px" borderRadius="8px" />)}</Box>
        ) : filtered.length === 0 ? (
          <Flex direction="column" align="center" py="60px" gap="12px">
            <Flex w="56px" h="56px" bg="gray.50" borderRadius="16px" align="center" justify="center">
              <Icon as={MdAssignment} w="28px" h="28px" color={TEXT_MUTED} />
            </Flex>
            <Text fontSize="sm" color={TEXT_BODY}>No audit entries found.</Text>
          </Flex>
        ) : (
          <>
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr bg={PAGE_BG}>
                    {['Date', 'Description', 'Reference', 'Type', 'Debit', 'Credit', 'Status', 'Source', 'Created At'].map((h, i) => (
                      <Th key={h} px={i === 0 || i === 8 ? '24px' : '12px'} isNumeric={i === 4 || i === 5}
                        fontSize="10px" color={TEXT_MUTED} fontWeight="700" letterSpacing="0.7px"
                        borderColor={BORDER} textTransform="uppercase" py="14px" whiteSpace="nowrap">{h}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map(e => (
                    <Tr key={e.id} _hover={{ bg: PAGE_BG }} opacity={e.status === 'void' ? 0.5 : 1}>
                      <Td px="24px" borderColor={BORDER} py="12px" whiteSpace="nowrap">
                        <Text fontSize="xs" color={TEXT_BODY} fontFamily="mono">
                          {new Date(e.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px" maxW="200px">
                        <Text fontSize="sm" color={TEXT_DARK} fontWeight="500" noOfLines={1}>{e.description}</Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px">
                        <Text fontSize="xs" color={TEXT_BODY} fontFamily="mono">{e.reference_number || '—'}</Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px">
                        <Badge colorScheme={TYPE_COLOR[e.transaction_type] || 'gray'} borderRadius="6px" fontSize="10px" textTransform="capitalize">
                          {e.transaction_type}
                        </Badge>
                      </Td>
                      <Td isNumeric borderColor={BORDER} px="12px">
                        <Text fontSize="xs" fontWeight="600" color="#01B574" fontFamily="mono">{fmt(e.total_debit || 0)}</Text>
                      </Td>
                      <Td isNumeric borderColor={BORDER} px="12px">
                        <Text fontSize="xs" fontWeight="600" color="#EE5D50" fontFamily="mono">{fmt(e.total_credit || 0)}</Text>
                      </Td>
                      <Td borderColor={BORDER} px="12px">
                        <Badge colorScheme={e.status === 'posted' ? 'green' : e.status === 'void' ? 'red' : 'yellow'} borderRadius="6px" fontSize="10px" textTransform="capitalize">
                          {e.status}
                        </Badge>
                      </Td>
                      <Td borderColor={BORDER} px="12px">
                        <Flex align="center" gap="4px" display="inline-flex" px="7px" py="3px"
                          bg={e.ai_generated ? '#E6FAF5' : '#F5F5F6'} borderRadius="6px">
                          <Icon as={e.ai_generated ? RiRobot2Line : MdAssignment} w="10px" h="10px"
                            color={e.ai_generated ? '#51BC8F' : TEXT_MUTED} />
                          <Text fontSize="10px" fontWeight="700" color={e.ai_generated ? '#51BC8F' : TEXT_MUTED}>
                            {SOURCE_LABEL[e.source] || e.source}
                          </Text>
                        </Flex>
                      </Td>
                      <Td px="24px" borderColor={BORDER} whiteSpace="nowrap">
                        <Text fontSize="10px" color={TEXT_MUTED} fontFamily="mono">
                          {new Date(e.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Flex px="24px" py="16px" justify="space-between" align="center" borderTop="1px solid" borderColor={BORDER}>
                <Text fontSize="sm" color={TEXT_MUTED}>Page {page} of {totalPages} ({total} total)</Text>
                <Flex gap="8px">
                  <Button size="xs" borderRadius="8px" isDisabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button size="xs" borderRadius="8px" isDisabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </Flex>
              </Flex>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
