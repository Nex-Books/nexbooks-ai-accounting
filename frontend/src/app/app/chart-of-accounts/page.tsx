'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge, Box, Button, Flex, Icon, IconButton, Input, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tooltip, Tr,
  useDisclosure, useToast,
} from '@chakra-ui/react';
import {
  MdAdd, MdEdit, MdPause, MdPlayArrow, MdRefresh, MdSearch,
} from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_sub_type?: string;
  description?: string;
  is_active: boolean;
  created_by: string | null;
  balance?: number;
}

const TYPE_COLORS: Record<string, string> = {
  Asset: 'blue',
  Liability: 'red',
  Equity: 'purple',
  Revenue: 'green',
  Expense: 'orange',
};

const TYPE_ORDER = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Asset',
    account_sub_type: '',
    description: '',
  });

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();

      // Load accounts
      const accRes = await fetch(`${API}/accounts/chart?user_id=${user.id}`, { headers });
      const accData = await accRes.json();
      const flat: Account[] = [];
      if (accData.data) {
        for (const type of TYPE_ORDER) {
          for (const acc of (accData.data[type] || [])) flat.push(acc);
        }
      }
      setAccounts(flat);

      // Load balances
      const balRes = await fetch(`${API}/accounts/summary?user_id=${user.id}`, { headers });
      const balData = await balRes.json();
      const balMap: Record<string, number> = {};
      for (const row of (balData.data || [])) {
        balMap[row.account_name] = row.balance;
      }
      setBalances(balMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditAccount(null);
    setForm({ account_code: '', account_name: '', account_type: 'Asset', account_sub_type: '', description: '' });
    onOpen();
  };

  const openEdit = (acc: Account) => {
    setEditAccount(acc);
    setForm({
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type: acc.account_type,
      account_sub_type: acc.account_sub_type || '',
      description: acc.description || '',
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.account_code || !form.account_name) {
      toast({ title: 'Code and Name are required', status: 'warning', duration: 2000 });
      return;
    }
    setSaving(true);
    try {
      const headers = await getAuthHeader();
      const url = editAccount
        ? `${API}/accounts/chart/${editAccount.id}?user_id=${user?.id}`
        : `${API}/accounts/chart?user_id=${user?.id}`;
      const method = editAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }
      toast({ title: editAccount ? 'Account updated' : 'Account created', status: 'success', duration: 2000 });
      onClose();
      loadData();
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (acc: Account) => {
    try {
      const headers = await getAuthHeader();
      await fetch(`${API}/accounts/chart/${acc.id}/toggle-active?is_active=${!acc.is_active}&user_id=${user?.id}`, {
        method: 'PATCH',
        headers,
      });
      toast({ title: acc.is_active ? 'Account deactivated' : 'Account activated', status: 'success', duration: 2000 });
      loadData();
    } catch {
      toast({ title: 'Error toggling account', status: 'error', duration: 2000 });
    }
  };

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.account_name.toLowerCase().includes(q) || a.account_code.includes(q);
    const matchType = !filterType || a.account_type === filterType;
    return matchSearch && matchType;
  });

  // Group filtered by type
  const grouped: Record<string, Account[]> = {};
  for (const acc of filtered) {
    (grouped[acc.account_type] ??= []).push(acc);
  }

  // Summary stats
  const totalByType = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = accounts.filter(a => a.account_type === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box bg="gray.50" minH="100%">
      {/* Header */}
      <Box px={{ base: '20px', md: '32px' }} pt="28px" pb="20px" bg="white"
        borderBottom="1px solid" borderColor="gray.200">
        <Flex align="center" justify="space-between" wrap="wrap" gap="12px">
          <Box>
            <Text fontSize="xl" fontWeight="800" color="gray.800" letterSpacing="-0.5px">
              Chart of Accounts
            </Text>
            <Text fontSize="sm" color="gray.500" mt="2px">
              {accounts.length} accounts · {accounts.filter(a => a.is_active).length} active
            </Text>
          </Box>
          <Flex gap="8px">
            <IconButton aria-label="Refresh" icon={<MdRefresh />} size="sm" variant="ghost"
              onClick={loadData} isLoading={loading} />
            <Button leftIcon={<MdAdd />} size="sm" bg="#155740" color="white"
              _hover={{ bg: '#1a7a57' }} borderRadius="10px" onClick={openAdd}>
              Add Account
            </Button>
          </Flex>
        </Flex>

        {/* Type summary badges */}
        <Flex gap="8px" mt="16px" wrap="wrap">
          {TYPE_ORDER.map(t => (
            <Flex
              key={t}
              align="center" gap="6px" px="12px" py="6px"
              bg={filterType === t ? `${TYPE_COLORS[t]}.100` : 'gray.50'}
              borderRadius="20px" border="1px solid"
              borderColor={filterType === t ? `${TYPE_COLORS[t]}.200` : 'gray.200'}
              cursor="pointer"
              onClick={() => setFilterType(filterType === t ? '' : t)}
              transition="all 0.15s"
              _hover={{ bg: `${TYPE_COLORS[t]}.50` }}
            >
              <Badge colorScheme={TYPE_COLORS[t]} borderRadius="4px" fontSize="10px">
                {totalByType[t] || 0}
              </Badge>
              <Text fontSize="xs" fontWeight="600" color="gray.700">{t}</Text>
            </Flex>
          ))}
        </Flex>
      </Box>

      {/* Filters */}
      <Box px={{ base: '20px', md: '32px' }} py="16px">
        <Flex gap="10px" wrap="wrap">
          <Flex align="center" bg="white" borderRadius="10px" border="1px solid" borderColor="gray.200"
            px="12px" gap="8px" flex="1" minW="200px" maxW="320px">
            <Icon as={MdSearch} color="gray.400" w="16px" h="16px" />
            <Input
              placeholder="Search accounts…" size="sm" border="none"
              value={search} onChange={e => setSearch(e.target.value)}
              _focus={{ border: 'none', boxShadow: 'none' }} fontSize="sm"
            />
          </Flex>
          <Select
            size="sm" bg="white" borderRadius="10px" borderColor="gray.200"
            value={filterType} onChange={e => setFilterType(e.target.value)}
            w="160px" fontSize="sm"
          >
            <option value="">All Types</option>
            {TYPE_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Flex>
      </Box>

      {/* Table */}
      <Box px={{ base: '20px', md: '32px' }} pb="32px">
        {loading ? (
          <Flex justify="center" align="center" py="60px">
            <Spinner size="lg" color="#155740" thickness="3px" />
          </Flex>
        ) : filtered.length === 0 ? (
          <Flex direction="column" align="center" py="60px" gap="12px">
            <Text fontSize="md" color="gray.500">No accounts found</Text>
            <Button size="sm" colorScheme="green" onClick={openAdd}>Add First Account</Button>
          </Flex>
        ) : (
          <Box>
            {TYPE_ORDER.map(type => {
              const typeAccounts = grouped[type];
              if (!typeAccounts?.length) return null;
              return (
                <Box key={type} mb="24px" bg="white" borderRadius="14px"
                  border="1px solid" borderColor="gray.200" overflow="hidden">
                  <Flex
                    px="20px" py="12px" bg={`${TYPE_COLORS[type]}.50`}
                    borderBottom="1px solid" borderColor={`${TYPE_COLORS[type]}.100`}
                    align="center" gap="10px"
                  >
                    <Badge colorScheme={TYPE_COLORS[type]} borderRadius="6px" px="8px" py="2px">
                      {type}
                    </Badge>
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      {typeAccounts.length} accounts
                    </Text>
                  </Flex>

                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th fontSize="11px" color="gray.500" py="10px">Code</Th>
                        <Th fontSize="11px" color="gray.500">Account Name</Th>
                        <Th fontSize="11px" color="gray.500">Sub-type</Th>
                        <Th isNumeric fontSize="11px" color="gray.500">Balance</Th>
                        <Th fontSize="11px" color="gray.500">Status</Th>
                        <Th fontSize="11px" color="gray.500" w="80px">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {typeAccounts.map(acc => {
                        const bal = balances[acc.account_name] ?? 0;
                        const isGlobal = acc.created_by === null;
                        return (
                          <Tr key={acc.id} _hover={{ bg: 'gray.50' }} opacity={acc.is_active ? 1 : 0.5}>
                            <Td fontSize="xs" fontFamily="mono" color="gray.500" py="10px">
                              {acc.account_code}
                            </Td>
                            <Td fontSize="sm" fontWeight="500" color="gray.800">
                              <Flex align="center" gap="6px">
                                {acc.account_name}
                                {isGlobal && (
                                  <Badge fontSize="9px" colorScheme="gray" borderRadius="4px">
                                    Standard
                                  </Badge>
                                )}
                              </Flex>
                            </Td>
                            <Td fontSize="xs" color="gray.500">{acc.account_sub_type || '—'}</Td>
                            <Td isNumeric fontSize="xs" fontFamily="mono"
                              color={bal < 0 ? 'red.600' : bal > 0 ? 'gray.800' : 'gray.400'}>
                              {bal !== 0 ? fmt(bal) : '—'}
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={acc.is_active ? 'green' : 'gray'}
                                borderRadius="6px" fontSize="10px"
                              >
                                {acc.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </Td>
                            <Td>
                              {!isGlobal && (
                                <Flex gap="4px">
                                  <Tooltip label="Edit">
                                    <IconButton aria-label="Edit" icon={<MdEdit />} size="xs"
                                      variant="ghost" onClick={() => openEdit(acc)} />
                                  </Tooltip>
                                  <Tooltip label={acc.is_active ? 'Deactivate' : 'Activate'}>
                                    <IconButton
                                      aria-label="Toggle"
                                      icon={acc.is_active ? <MdPause /> : <MdPlayArrow />}
                                      size="xs" variant="ghost"
                                      colorScheme={acc.is_active ? 'red' : 'green'}
                                      onClick={() => toggleActive(acc)}
                                    />
                                  </Tooltip>
                                </Flex>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Add / Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="16px">
          <ModalHeader fontSize="md" fontWeight="700">
            {editAccount ? 'Edit Account' : 'Add New Account'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="4">
            <Flex direction="column" gap="12px">
              <Flex gap="10px">
                <Box flex="1">
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb="4px">Account Code *</Text>
                  <Input size="sm" placeholder="e.g. 1050" value={form.account_code}
                    onChange={e => setForm(f => ({ ...f, account_code: e.target.value }))}
                    borderRadius="8px" fontFamily="mono" />
                </Box>
                <Box flex="2">
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb="4px">Account Name *</Text>
                  <Input size="sm" placeholder="e.g. Petty Cash – Branch" value={form.account_name}
                    onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                    borderRadius="8px" />
                </Box>
              </Flex>
              <Flex gap="10px">
                <Box flex="1">
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb="4px">Type *</Text>
                  <Select size="sm" value={form.account_type} borderRadius="8px"
                    onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                    {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Box>
                <Box flex="1">
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb="4px">Sub-type</Text>
                  <Input size="sm" placeholder="e.g. Current Asset" value={form.account_sub_type}
                    onChange={e => setForm(f => ({ ...f, account_sub_type: e.target.value }))}
                    borderRadius="8px" />
                </Box>
              </Flex>
              <Box>
                <Text fontSize="xs" fontWeight="600" color="gray.600" mb="4px">Description</Text>
                <Input size="sm" placeholder="Optional description" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  borderRadius="8px" />
              </Box>
            </Flex>
          </ModalBody>
          <ModalFooter gap="8px">
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button size="sm" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }}
              borderRadius="8px" isLoading={saving} onClick={handleSave}>
              {editAccount ? 'Save Changes' : 'Create Account'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
