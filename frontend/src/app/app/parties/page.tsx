'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge, Box, Button, Flex, Icon, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, Input, Select, FormControl, FormLabel, useToast
} from '@chakra-ui/react';
import { MdPeople, MdAdd } from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function PartiesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [partyType, setPartyType] = useState('Customer');
  const [partyName, setPartyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const loadParties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API}/parties?user_id=${user.id}`, { headers });
      const data = await res.json();
      setParties(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader]);

  useEffect(() => { loadParties(); }, [loadParties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API}/parties?user_id=${user.id}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_type: partyType,
          party_name: partyName,
          gstin: gstin || null,
          pan: pan || null,
          phone: phone || null,
          email: email || null,
        }),
      });
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Party added successfully.', status: 'success' });
        loadParties();
        onClose();
        // Reset form
        setPartyName(''); setGstin(''); setPan(''); setPhone(''); setEmail('');
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add party');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg="gray.50" minH="100%">
      <Box px={{ base: '20px', md: '32px' }} pt="28px" pb="20px" bg="white" borderBottom="1px solid" borderColor="gray.200">
        <Flex justify="space-between" align="center" wrap="wrap" gap="16px">
          <Box>
            <Text fontSize="xl" fontWeight="800" color="gray.800" letterSpacing="-0.5px">Contacts & Parties</Text>
            <Text fontSize="sm" color="gray.500" mt="2px">Manage Customers, Vendors, and Employees</Text>
          </Box>
          <Button
            size="sm" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }} borderRadius="10px"
            leftIcon={<MdAdd />} onClick={onOpen}
          >
            Add Contact
          </Button>
        </Flex>
      </Box>

      <Box px={{ base: '20px', md: '32px' }} py="20px">
        {loading ? (
          <Flex justify="center" py="60px"><Spinner size="lg" color="#155740" thickness="3px" /></Flex>
        ) : parties.length === 0 ? (
          <Flex direction="column" align="center" py="60px" gap="12px" bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200">
            <Icon as={MdPeople} w="32px" h="32px" color="gray.300" />
            <Text color="gray.500">No contacts added yet.</Text>
            <Button mt="10px" size="sm" variant="outline" onClick={onOpen}>Add your first Contact</Button>
          </Flex>
        ) : (
          <Box bg="white" borderRadius="14px" border="1px solid" borderColor="gray.200" overflow="hidden">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th fontSize="11px" py="12px">Name</Th>
                  <Th fontSize="11px">Type</Th>
                  <Th fontSize="11px">GSTIN / PAN</Th>
                  <Th fontSize="11px">Contact</Th>
                  <Th isNumeric fontSize="11px">AR/AP</Th>
                </Tr>
              </Thead>
              <Tbody>
                {parties.map((p, i) => (
                  <Tr key={p.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontSize="sm" fontWeight="600" color="gray.800">{p.party_name}</Td>
                    <Td>
                      <Badge colorScheme={p.party_type === 'Customer' ? 'blue' : p.party_type === 'Vendor' ? 'purple' : 'gray'} fontSize="10px" borderRadius="5px">
                        {p.party_type}
                      </Badge>
                    </Td>
                    <Td fontSize="xs" color="gray.500">
                      {p.gstin ? <Text>GST: {p.gstin}</Text> : null}
                      {p.pan ? <Text>PAN: {p.pan}</Text> : null}
                      {!p.gstin && !p.pan ? '—' : null}
                    </Td>
                    <Td fontSize="xs" color="gray.500">
                      {p.phone ? <Text>{p.phone}</Text> : null}
                      {p.email ? <Text>{p.email}</Text> : null}
                      {!p.phone && !p.email ? '—' : null}
                    </Td>
                    <Td isNumeric>
                      <Button size="xs" variant="ghost" colorScheme="teal" onClick={() => toast({ title: 'Coming Soon', status: 'info' })}>
                        View Ledger
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Add Contact Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader fontSize="lg" fontWeight="800">Add New Contact</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="24px">
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="16px">
                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.600">Contact Type</FormLabel>
                  <Select value={partyType} onChange={(e) => setPartyType(e.target.value)} size="sm" borderRadius="8px">
                    <option value="Customer">Customer</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Employee">Employee</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.600">Name / Company</FormLabel>
                  <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} size="sm" borderRadius="8px" placeholder="e.g. Reliance Retail Ltd" />
                </FormControl>
                <Flex gap="16px">
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.600">GSTIN</FormLabel>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} size="sm" borderRadius="8px" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.600">PAN</FormLabel>
                    <Input value={pan} onChange={(e) => setPan(e.target.value)} size="sm" borderRadius="8px" />
                  </FormControl>
                </Flex>
                <Flex gap="16px">
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.600">Phone</FormLabel>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} size="sm" borderRadius="8px" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.600">Email</FormLabel>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} size="sm" borderRadius="8px" />
                  </FormControl>
                </Flex>
                <Button type="submit" mt="8px" bg="#155740" color="white" _hover={{ bg: '#1a7a57' }} isLoading={submitting}>
                  Save Contact
                </Button>
              </Flex>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
