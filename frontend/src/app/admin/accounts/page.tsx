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
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { MdAdd, MdEdit, MdPause, MdPlayArrow } from 'react-icons/md';
import Card from 'components/card/Card';
import { supabase } from 'lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Account = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  balance: number;
  is_active: boolean;
};

type GroupedAccounts = Record<string, Account[]>;

const ACCOUNT_TYPES = [
  { type: 'Asset',     label: 'Assets',      colorScheme: 'blue'   },
  { type: 'Liability', label: 'Liabilities', colorScheme: 'red'    },
  { type: 'Equity',    label: 'Equity',      colorScheme: 'purple' },
  { type: 'Income',    label: 'Income',      colorScheme: 'green'  },
  { type: 'Expense',   label: 'Expenses',    colorScheme: 'orange' },
];

const EMPTY_FORM = { account_code: '', account_name: '', account_type: 'Asset' };

export default function AccountsPage() {
  const [grouped, setGrouped] = useState<GroupedAccounts>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const toast = useToast();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const labelColor = useColorModeValue('gray.400', 'gray.400');
  const mutedColor = useColorModeValue('gray.400', 'gray.500');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setUserId(session.user.id);
    });
  }, []);

  const fetchAccounts = useCallback(async (uid: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/accounts?user_id=${uid}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setGrouped(json.data);
      setTotal(json.total);
    } catch (e: any) {
      setError(e.message || 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchAccounts(userId);
  }, [userId, fetchAccounts]);

  const handleAdd = async () => {
    if (!addForm.account_code.trim() || !addForm.account_name.trim()) {
      toast({ title: 'Account code and name are required.', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create account');
      }
      toast({ title: 'Account created.', status: 'success', duration: 2000, isClosable: true });
      setAddForm(EMPTY_FORM);
      addModal.onClose();
      fetchAccounts(userId);
    } catch (e: any) {
      toast({ title: e.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (account: Account) => {
    setEditTarget(account);
    setEditForm({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
    });
    editModal.onOpen();
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!editForm.account_code.trim() || !editForm.account_name.trim()) {
      toast({ title: 'Account code and name are required.', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounts/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update account');
      }
      toast({ title: 'Account updated.', status: 'success', duration: 2000, isClosable: true });
      editModal.onClose();
      fetchAccounts(userId);
    } catch (e: any) {
      toast({ title: e.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setEditLoading(false);
    }
  };

  const toggleActive = async (account: Account) => {
    setActionLoading(account.id);
    const endpoint = account.is_active !== false ? 'deactivate' : 'activate';
    try {
      const res = await fetch(`${API_BASE}/accounts/${account.id}/${endpoint}`, { method: 'PATCH' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update account');
      }
      toast({
        title: account.is_active !== false ? 'Account deactivated.' : 'Account activated.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      fetchAccounts(userId);
    } catch (e: any) {
      toast({ title: e.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Page header */}
      <Flex mb="20px" justifyContent="space-between" align="center">
        <Box>
          <Text color={textColor} fontSize="2xl" fontWeight="700">Chart of Accounts</Text>
          <Text color={labelColor} fontSize="sm" mt="2px">
            {total} account{total !== 1 ? 's' : ''} across all categories
          </Text>
        </Box>
        <Button
          leftIcon={<Icon as={MdAdd} />}
          colorScheme="blue"
          borderRadius="lg"
          onClick={addModal.onOpen}
        >
          Add Account
        </Button>
      </Flex>

      {error && (
        <Alert status="error" mb="20px" borderRadius="lg">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {loading ? (
        <Flex justify="center" align="center" py="80px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : (
        <VStack spacing="20px" align="stretch">
          {ACCOUNT_TYPES.map(({ type, label, colorScheme }) => {
            const accts = grouped[type] || [];
            return (
              <Card key={type} flexDirection="column" w="100%" px="0px" overflowX={{ sm: 'scroll', lg: 'hidden' }}>
                {/* Section header */}
                <Flex px="25px" py="16px" justifyContent="space-between" align="center">
                  <HStack spacing="10px">
                    <Badge
                      colorScheme={colorScheme}
                      fontSize="sm"
                      px="12px"
                      py="4px"
                      borderRadius="full"
                      textTransform="none"
                    >
                      {label}
                    </Badge>
                    <Text color={labelColor} fontSize="sm">
                      {accts.length} account{accts.length !== 1 ? 's' : ''}
                    </Text>
                  </HStack>
                </Flex>

                {accts.length === 0 ? (
                  <Text color={mutedColor} fontSize="sm" px="25px" pb="20px">
                    No accounts yet. Click &quot;Add Account&quot; to create one.
                  </Text>
                ) : (
                  <Table variant="simple" color="gray.500" mb="12px">
                    <Thead>
                      <Tr>
                        {['CODE', 'NAME', 'BALANCE', 'STATUS', 'ACTIONS'].map((h) => (
                          <Th key={h} pe="10px" borderColor={borderColor}>
                            <Text fontSize={{ sm: '10px', lg: '12px' }} color={labelColor}>{h}</Text>
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {accts.map((acc) => {
                        const isActive = acc.is_active !== false;
                        return (
                          <Tr key={acc.id} opacity={isActive ? 1 : 0.45}>
                            <Td borderColor="transparent" minW="80px">
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="600"
                                fontFamily="mono"
                              >
                                {acc.account_code}
                              </Text>
                            </Td>
                            <Td borderColor="transparent" minW="180px">
                              <Text color={textColor} fontSize="sm" fontWeight="700">
                                {acc.account_name}
                              </Text>
                            </Td>
                            <Td borderColor="transparent" minW="130px">
                              <Text color={textColor} fontSize="sm">
                                ₹{(acc.balance ?? 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}
                              </Text>
                            </Td>
                            <Td borderColor="transparent">
                              <Badge
                                colorScheme={isActive ? 'green' : 'gray'}
                                fontSize="10px"
                                px="8px"
                                py="2px"
                                borderRadius="full"
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </Td>
                            <Td borderColor="transparent">
                              <HStack spacing="2">
                                <IconButton
                                  aria-label="Edit account"
                                  icon={<Icon as={MdEdit} />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={() => openEdit(acc)}
                                />
                                <IconButton
                                  aria-label={isActive ? 'Deactivate account' : 'Activate account'}
                                  icon={<Icon as={isActive ? MdPause : MdPlayArrow} />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme={isActive ? 'red' : 'green'}
                                  isLoading={actionLoading === acc.id}
                                  onClick={() => toggleActive(acc)}
                                />
                              </HStack>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </Card>
            );
          })}
        </VStack>
      )}

      {/* Add Account Modal */}
      <Modal isOpen={addModal.isOpen} onClose={addModal.onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Add Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="16px">
              <Box w="100%">
                <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
                  ACCOUNT TYPE *
                </Text>
                <Select
                  value={addForm.account_type}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_type: e.target.value }))}
                  borderRadius="lg"
                >
                  {ACCOUNT_TYPES.map(({ type, label }) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </Select>
              </Box>
              <Box w="100%">
                <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
                  ACCOUNT CODE *
                </Text>
                <Input
                  placeholder="e.g. 1001"
                  value={addForm.account_code}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_code: e.target.value }))}
                  borderRadius="lg"
                  fontFamily="mono"
                />
              </Box>
              <Box w="100%">
                <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
                  ACCOUNT NAME *
                </Text>
                <Input
                  placeholder="e.g. Bank Account"
                  value={addForm.account_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  borderRadius="lg"
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter gap="10px">
            <Button variant="ghost" onClick={addModal.onClose} isDisabled={addLoading}>Cancel</Button>
            <Button colorScheme="blue" borderRadius="lg" onClick={handleAdd} isLoading={addLoading}>
              Create Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Account Modal */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Edit Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="16px">
              <Box w="100%">
                <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
                  ACCOUNT TYPE *
                </Text>
                <Select
                  value={editForm.account_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, account_type: e.target.value }))}
                  borderRadius="lg"
                >
                  {ACCOUNT_TYPES.map(({ type, label }) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </Select>
              </Box>
              <Box w="100%">
                <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
                  ACCOUNT CODE *
                </Text>
                <Input
                  value={editForm.account_code}
                  onChange={(e) => setEditForm((f) => ({ ...f, account_code: e.target.value }))}
                  borderRadius="lg"
                  fontFamily="mono"
                />
              </Box>
              <Box w="100%">
                <Text fontSize="xs" color={labelColor} mb="6px" fontWeight="600" letterSpacing="wide">
                  ACCOUNT NAME *
                </Text>
                <Input
                  value={editForm.account_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, account_name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                  borderRadius="lg"
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter gap="10px">
            <Button variant="ghost" onClick={editModal.onClose} isDisabled={editLoading}>Cancel</Button>
            <Button colorScheme="blue" borderRadius="lg" onClick={handleEdit} isLoading={editLoading}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
