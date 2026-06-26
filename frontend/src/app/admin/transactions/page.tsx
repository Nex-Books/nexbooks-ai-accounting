'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Card from 'components/card/Card';
import { supabase } from 'lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type TransactionRow = {
  id: string;
  entry_date: string;
  description: string;
  reference: string;
  total_amount: number;
  transaction_type: string;
  source: 'AI' | 'Manual';
  debit_account: string;
  credit_account: string;
};

type Filters = { dateFrom: string; dateTo: string; account: string };

const columnHelper = createColumnHelper<TransactionRow>();

export default function TransactionsPage() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [account, setAccount] = useState('');
  const [applied, setApplied] = useState<Filters>({ dateFrom: '', dateTo: '', account: '' });

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const labelColor = useColorModeValue('gray.400', 'gray.400');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setUserId(session.user.id);
    });
  }, []);

  const fetchTransactions = useCallback(
    async (uid: string, pg: number, filters: Filters) => {
      if (!uid) return;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ user_id: uid, page: String(pg), limit: '20' });
        if (filters.dateFrom) params.set('date_from', filters.dateFrom);
        if (filters.dateTo) params.set('date_to', filters.dateTo);
        if (filters.account) params.set('account', filters.account);

        const res = await fetch(`${API_BASE}/transactions?${params}`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        setRows(json.data);
        setTotal(json.total);
        setTotalPages(json.total_pages);
      } catch (e: any) {
        setError(e.message || 'Failed to load transactions.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (userId) fetchTransactions(userId, page, applied);
  }, [userId, page, applied, fetchTransactions]);

  const applyFilters = () => {
    setPage(1);
    setApplied({ dateFrom, dateTo, account });
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setAccount('');
    setPage(1);
    setApplied({ dateFrom: '', dateTo: '', account: '' });
  };

  const columns = [
    columnHelper.accessor('entry_date', {
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>DATE</Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700" whiteSpace="nowrap">
          {new Date(info.getValue()).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      ),
    }),
    columnHelper.accessor('description', {
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>DESCRIPTION</Text>
      ),
      cell: (info) => (
        <Text
          color={textColor}
          fontSize="sm"
          maxW="220px"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          title={info.getValue()}
        >
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('debit_account', {
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>DEBIT ACCOUNT</Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">{info.getValue()}</Text>
      ),
    }),
    columnHelper.accessor('credit_account', {
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>CREDIT ACCOUNT</Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm">{info.getValue()}</Text>
      ),
    }),
    columnHelper.accessor('total_amount', {
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>AMOUNT</Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700" whiteSpace="nowrap">
          ₹{(info.getValue() ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    }),
    columnHelper.accessor('source', {
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>SOURCE</Text>
      ),
      cell: (info) => (
        <Badge
          colorScheme={info.getValue() === 'AI' ? 'green' : 'gray'}
          fontSize="10px"
          px="8px"
          py="2px"
          borderRadius="full"
        >
          {info.getValue()}
        </Badge>
      ),
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Filter bar */}
      <Card mb="20px" px="25px" py="20px">
        <Text color={textColor} fontSize="lg" fontWeight="700" mb="16px">
          Filters
        </Text>
        <Flex gap="12px" wrap="wrap" align="flex-end">
          <Box>
            <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
              DATE FROM
            </Text>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="sm"
              borderRadius="lg"
              w="160px"
            />
          </Box>
          <Box>
            <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
              DATE TO
            </Text>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="sm"
              borderRadius="lg"
              w="160px"
            />
          </Box>
          <Box>
            <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
              ACCOUNT NAME
            </Text>
            <Input
              placeholder="e.g. Bank Account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              size="sm"
              borderRadius="lg"
              w="200px"
            />
          </Box>
          <HStack>
            <Button size="sm" colorScheme="blue" borderRadius="lg" px="20px" onClick={applyFilters}>
              Apply
            </Button>
            <Button size="sm" variant="outline" borderRadius="lg" px="20px" onClick={resetFilters}>
              Reset
            </Button>
          </HStack>
        </Flex>
      </Card>

      {/* Table */}
      <Card flexDirection="column" w="100%" px="0px" overflowX={{ sm: 'scroll', lg: 'hidden' }}>
        <Flex px="25px" mb="8px" justifyContent="space-between" align="center">
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
            Journal Entries
          </Text>
          <Text color={labelColor} fontSize="sm">
            {total} {total === 1 ? 'entry' : 'entries'}
          </Text>
        </Flex>

        {error && (
          <Alert status="error" mx="25px" mb="12px" borderRadius="lg">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {loading ? (
          <Flex justify="center" align="center" py="60px">
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : (
          <Box>
            <Table variant="simple" color="gray.500" mb="24px" mt="12px">
              <Thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Th key={header.id} pe="10px" borderColor={borderColor}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Th>
                    ))}
                  </Tr>
                ))}
              </Thead>
              <Tbody>
                {rows.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} textAlign="center" py="48px">
                      <Text color={labelColor} fontSize="sm">
                        No transactions found. Try adjusting your filters.
                      </Text>
                    </Td>
                  </Tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <Tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <Td
                          key={cell.id}
                          fontSize={{ sm: '14px' }}
                          minW={{ sm: '120px', md: '140px', lg: 'auto' }}
                          borderColor="transparent"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Td>
                      ))}
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <Flex justify="space-between" align="center" px="25px" pb="20px">
                <Text color={labelColor} fontSize="sm">
                  Page {page} of {totalPages}
                </Text>
                <HStack>
                  <Button
                    size="sm"
                    variant="outline"
                    borderRadius="lg"
                    isDisabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    borderRadius="lg"
                    isDisabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </HStack>
              </Flex>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
}
