'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Badge, Box, Button, Flex, Icon, IconButton, Select, Spinner, Table, Tbody,
  Td, Text, Th, Thead, Tr, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalCloseButton, useDisclosure,
} from '@chakra-ui/react';
import { MdAccountBalance, MdFileUpload, MdCheckCircle, MdWarning } from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const fmtSigned = (n: number) =>
  (n < 0 ? '(₹' : '₹') + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + (n < 0 ? ')' : '');

export default function BankPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API}/bank/transactions?user_id=${user.id}`, { headers });
      const data = await res.json();
      setTransactions(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API}/bank/upload-statement?user_id=${user.id}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        toast({ title: 'Upload Successful', description: 'Bank statement imported successfully.', status: 'success' });
        loadTransactions();
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, status: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const unreconciledCount = transactions.filter(t => t.status === 'unreconciled').length;

  return (
    <Box bg="gray.50" minH="100%">
      <Box px={{ base: '20px', md: '32px' }} pt="28px" pb="20px" bg="white" borderBottom="1px solid" borderColor="gray.200">
        <Flex justify="space-between" align="center" wrap="wrap" gap="16px">
          <Box>
            <Text fontSize="xl" fontWeight="800" color="gray.800" letterSpacing="-0.5px">Bank Reconciliation</Text>
            <Text fontSize="sm" color="gray.500" mt="2px">Match imported statements with journal entries</Text>
          </Box>
          <Flex gap="12px">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: 'none' }} />
            <Button
              size="sm" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }} borderRadius="10px"
              leftIcon={<MdFileUpload />} onClick={() => fileInputRef.current?.click()} isLoading={uploading}
            >
              Import CSV Statement
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Box px={{ base: '20px', md: '32px' }} py="20px">
        {loading && transactions.length === 0 ? (
          <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
        ) : transactions.length === 0 ? (
          <Flex direction="column" align="center" py="60px" gap="12px" bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
            <Icon as={MdAccountBalance} w="32px" h="32px" color="gray.300" />
            <Text color="gray.500">No bank transactions imported yet.</Text>
            <Text fontSize="sm" color="gray.400">Import a CSV statement to begin reconciliation.</Text>
            <Button mt="10px" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
          </Flex>
        ) : (
          <>
            <Flex gap="16px" mb="24px">
              <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" px="20px" py="16px" flex="1">
                <Text fontSize="xs" fontWeight="700" color="gray.500" mb="4px">UNRECONCILED</Text>
                <Text fontSize="2xl" fontWeight="800" color="red.600">{unreconciledCount}</Text>
              </Box>
              <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" px="20px" py="16px" flex="1">
                <Text fontSize="xs" fontWeight="700" color="gray.500" mb="4px">RECONCILED</Text>
                <Text fontSize="2xl" fontWeight="800" color="#155740">{transactions.length - unreconciledCount}</Text>
              </Box>
            </Flex>

            <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th fontSize="11px" py="12px">Date</Th>
                    <Th fontSize="11px">Description</Th>
                    <Th isNumeric fontSize="11px">Amount (₹)</Th>
                    <Th fontSize="11px">Type</Th>
                    <Th fontSize="11px">Status</Th>
                    <Th fontSize="11px">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((t, i) => (
                    <Tr key={t.id} _hover={{ bg: 'gray.50' }}>
                      <Td fontSize="xs">{t.transaction_date}</Td>
                      <Td fontSize="sm" color="gray.800">{t.description}</Td>
                      <Td isNumeric fontSize="sm" fontFamily="mono" fontWeight="600" color={t.amount > 0 ? 'green.700' : 'red.600'}>
                        {fmtSigned(t.amount)}
                      </Td>
                      <Td>
                        <Badge colorScheme={t.amount > 0 ? 'green' : 'red'} fontSize="10px" borderRadius="5px">
                          {t.transaction_type}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={t.status === 'reconciled' ? 'green' : 'orange'} fontSize="10px" borderRadius="5px">
                          {t.status}
                        </Badge>
                      </Td>
                      <Td>
                        {t.status === 'unreconciled' ? (
                          <Button size="xs" colorScheme="teal" variant="ghost">Match</Button>
                        ) : (
                          <Icon as={MdCheckCircle} color="green.500" />
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
