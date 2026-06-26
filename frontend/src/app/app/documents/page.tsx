'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert, AlertDescription, AlertIcon, Badge, Box, Button, Flex, Grid,
  Icon, Input, InputGroup, InputLeftElement, Select, Skeleton, Text, useToast,
} from '@chakra-ui/react';
import {
  MdCloudUpload, MdDelete, MdDescription, MdDownload, MdPictureAsPdf,
  MdRefresh, MdSearch, MdImage,
} from 'react-icons/md';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const CARD_SHADOW = '0px 18px 40px rgba(112,144,176,0.12)';
const TEXT_DARK = '#1B2559';
const TEXT_MUTED = '#AEB2B9';
const TEXT_BODY = '#676C73';
const BORDER = '#E3E5EA';
const PAGE_BG = '#FCFCFD';
const GREEN = '#155740';

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
  path: string;
  linked_entry?: string;
}

const BUCKET = 'documents';

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function DocIcon({ type }: { type: string }) {
  const isPdf = type.includes('pdf');
  const isImg = type.includes('image');
  return (
    <Flex w="42px" h="42px" borderRadius="10px"
      bg={isPdf ? '#FFF0F0' : isImg ? '#EFF4FB' : '#F5F5F6'}
      align="center" justify="center" flexShrink={0}>
      <Icon
        as={isPdf ? MdPictureAsPdf : isImg ? MdImage : MdDescription}
        w="22px" h="22px"
        color={isPdf ? '#EE5D50' : isImg ? '#3965FF' : TEXT_MUTED}
      />
    </Flex>
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${user.id}/`, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      const files: Document[] = (data || []).map(f => ({
        id: f.id || f.name,
        name: f.name,
        size: f.metadata?.size || 0,
        type: f.metadata?.mimetype || 'application/octet-stream',
        created_at: f.created_at || '',
        path: `${user.id}/${f.name}`,
      }));
      setDocs(files.filter(f => !f.name.startsWith('.')));
    } catch (e: any) {
      // Bucket might not exist yet
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const uploadFile = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large. Max 10MB.', status: 'error', duration: 3000 });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const uniqueName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${user.id}/${uniqueName}`, file, { upsert: false });

      if (error) throw error;
      toast({ title: `${file.name} uploaded successfully`, status: 'success', duration: 3000, position: 'top-right' });
      loadDocs();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message || 'Check if the documents bucket is created in Supabase Storage', status: 'error', duration: 5000 });
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (e) {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      await supabase.storage.from(BUCKET).remove([doc.path]);
      toast({ title: 'Document deleted', status: 'info', duration: 2000 });
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (e) {
      toast({ title: 'Delete failed', status: 'error', duration: 3000 });
    }
  };

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || d.type.includes(filterType);
    return matchSearch && matchType;
  });

  const totalSize = docs.reduce((s, d) => s + d.size, 0);

  return (
    <Box bg={PAGE_BG} minH="100%" p={{ base: '16px', md: '28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="12px">
        <Box>
          <Text fontSize="2xl" fontWeight="800" color={TEXT_DARK} letterSpacing="-0.6px">Documents</Text>
          <Text fontSize="sm" color={TEXT_MUTED} mt="2px">Store invoices, bills, receipts and other financial documents</Text>
        </Box>
        <Flex gap="10px">
          <Button leftIcon={<MdRefresh />} onClick={loadDocs} size="sm" variant="outline" borderRadius="10px" isLoading={loading}>Refresh</Button>
          <Button leftIcon={<MdCloudUpload />} onClick={() => fileRef.current?.click()} size="sm"
            bg={GREEN} color="white" borderRadius="10px" _hover={{ bg: '#1a6b4d' }} isLoading={uploading}>
            Upload
          </Button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.docx"
            style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </Flex>
      </Flex>

      {/* Stats */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap="16px" mb="24px">
        {[
          { label: 'Total Documents', value: docs.length.toString(), color: TEXT_DARK },
          { label: 'Storage Used', value: fmtSize(totalSize), color: '#3965FF' },
          { label: 'PDFs', value: docs.filter(d => d.type.includes('pdf')).length.toString(), color: '#EE5D50' },
        ].map(({ label, value, color }) => (
          <Box key={label} bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} p="18px">
            <Text fontSize="xs" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.5px" mb="6px">{label}</Text>
            {loading ? <Skeleton h="24px" w="60px" /> : <Text fontSize="xl" fontWeight="800" color={color}>{value}</Text>}
          </Box>
        ))}
      </Grid>

      {/* Drop zone */}
      <Box
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        border="2px dashed" borderColor={dragOver ? GREEN : BORDER}
        borderRadius="16px" p="32px" textAlign="center" mb="20px"
        bg={dragOver ? '#E6FAF5' : 'white'} transition="all 0.2s" cursor="pointer"
        onClick={() => fileRef.current?.click()}
      >
        <Icon as={MdCloudUpload} w="36px" h="36px" color={dragOver ? GREEN : TEXT_MUTED} mb="8px" />
        <Text fontSize="sm" fontWeight="600" color={dragOver ? GREEN : TEXT_BODY}>
          {dragOver ? 'Drop to upload' : 'Drag & drop files here or click to browse'}
        </Text>
        <Text fontSize="xs" color={TEXT_MUTED} mt="4px">PDF, JPG, PNG, XLSX, CSV — max 10MB each</Text>
      </Box>

      {/* Filters */}
      <Box bg="white" borderRadius="14px" boxShadow={CARD_SHADOW} p="16px" mb="16px">
        <Flex gap="12px" flexWrap="wrap">
          <Box flex="2" minW="180px">
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color={TEXT_MUTED} w="14px" h="14px" />
              </InputLeftElement>
              <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
                borderRadius="8px" fontSize="sm" pl="32px" />
            </InputGroup>
          </Box>
          <Select size="sm" value={filterType} onChange={e => setFilterType(e.target.value)}
            borderRadius="8px" fontSize="sm" flex="1" minW="130px">
            <option value="">All Types</option>
            <option value="pdf">PDF only</option>
            <option value="image">Images only</option>
            <option value="spreadsheet">Spreadsheets</option>
          </Select>
        </Flex>
      </Box>

      {/* Document List */}
      <Box bg="white" borderRadius="16px" boxShadow={CARD_SHADOW} overflow="hidden">
        <Flex px="24px" pt="20px" pb="14px" align="center">
          <Text fontWeight="700" fontSize="md" color={TEXT_DARK} flex="1">All Documents</Text>
          <Text fontSize="xs" color={TEXT_MUTED}>{filtered.length} files</Text>
        </Flex>
        {loading ? (
          <Box px="24px" pb="24px">{[...Array(4)].map((_, i) => <Skeleton key={i} h="64px" mb="10px" borderRadius="10px" />)}</Box>
        ) : filtered.length === 0 ? (
          <Flex direction="column" align="center" py="60px" gap="12px">
            <Flex w="56px" h="56px" bg="gray.50" borderRadius="16px" align="center" justify="center">
              <Icon as={MdDescription} w="28px" h="28px" color={TEXT_MUTED} />
            </Flex>
            <Text fontSize="sm" color={TEXT_BODY}>{docs.length === 0 ? 'No documents yet. Upload your first file!' : 'No documents match your filters.'}</Text>
            {docs.length === 0 && (
              <Alert status="info" borderRadius="12px" fontSize="xs" maxW="400px">
                <AlertIcon />
                <AlertDescription>
                  Make sure you've created a <strong>documents</strong> bucket in Supabase Storage with public or authenticated access.
                </AlertDescription>
              </Alert>
            )}
          </Flex>
        ) : (
          <Flex direction="column" pb="8px">
            {filtered.map(doc => (
              <Flex key={doc.id} px="24px" py="12px" align="center" gap="14px"
                _hover={{ bg: PAGE_BG }} borderBottom="1px solid" borderColor={BORDER}>
                <DocIcon type={doc.type} />
                <Box flex="1" minW="0">
                  <Text fontSize="sm" fontWeight="600" color={TEXT_DARK} noOfLines={1}>{doc.name}</Text>
                  <Flex gap="10px" align="center" mt="2px">
                    <Text fontSize="xs" color={TEXT_MUTED}>{fmtSize(doc.size)}</Text>
                    <Text fontSize="xs" color={TEXT_MUTED}>·</Text>
                    <Text fontSize="xs" color={TEXT_MUTED}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                  </Flex>
                </Box>
                <Flex gap="8px">
                  <Button size="xs" variant="ghost" borderRadius="8px" leftIcon={<MdDownload />}
                    color={TEXT_BODY} _hover={{ bg: 'gray.100' }} onClick={() => handleDownload(doc)}>
                    Download
                  </Button>
                  <Button size="xs" variant="ghost" borderRadius="8px" leftIcon={<MdDelete />}
                    color="#EE5D50" _hover={{ bg: '#FFF0F0' }} onClick={() => handleDelete(doc)}>
                    Delete
                  </Button>
                </Flex>
              </Flex>
            ))}
          </Flex>
        )}
      </Box>
    </Box>
  );
}
