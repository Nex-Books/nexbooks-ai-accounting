'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { MdAttachFile, MdClose, MdOpenInNew, MdSend } from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';
import { supabase } from 'lib/supabase';
import { useAuth } from 'context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const STORAGE_KEY = 'nexbooks_ai_conversation_id';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalLine {
  account_name: string;
  debit?: number;
  credit?: number;
  description?: string;
}

interface JournalEntry {
  entry_date: string;
  description: string;
  reference?: string;
  lines: JournalLine[];
  total_amount?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  journalEntry?: JournalEntry;
  attachmentName?: string;
  isInvoice?: boolean;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Journal Entry Card ───────────────────────────────────────────────────────

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('#f0f7ff', 'gray.700');
  const borderColor = useColorModeValue('#d0e8ff', 'gray.600');
  const cellBorder = useColorModeValue('gray.100', 'gray.600');
  const totalColor = '#155740';

  const totalDebit = entry.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (l.credit ?? 0), 0);

  return (
    <Box
      mt="10px"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="14px"
      overflow="hidden"
      bg={cardBg}
      boxShadow="0px 2px 12px rgba(21, 87, 64, 0.10)"
      maxW="500px"
    >
      {/* Header */}
      <Flex
        bg={headerBg}
        px="16px"
        py="10px"
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <Box>
          <Text fontWeight="700" fontSize="sm" color="#155740">
            📒 Journal Entry Recorded
          </Text>
          <Text fontSize="xs" color="gray.500" mt="1px">
            {entry.entry_date}
            {entry.reference ? ` · ${entry.reference}` : ''}
          </Text>
        </Box>
        <Badge
          bg="#155740"
          color="white"
          borderRadius="8px"
          px="8px"
          py="3px"
          fontSize="10px"
        >
          AI Generated
        </Badge>
      </Flex>

      {/* Description + table */}
      <Box px="16px" py="12px">
        <Text fontSize="xs" color="gray.500" mb="10px" fontStyle="italic">
          {entry.description}
        </Text>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th px="0" fontSize="10px" color="gray.400" borderColor={cellBorder}>
                Account
              </Th>
              <Th isNumeric px="10px" fontSize="10px" color="gray.400" borderColor={cellBorder}>
                Debit
              </Th>
              <Th isNumeric px="0" fontSize="10px" color="gray.400" borderColor={cellBorder}>
                Credit
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {entry.lines.map((line, i) => (
              <Tr key={i}>
                <Td
                  px="0"
                  fontSize="xs"
                  borderColor={cellBorder}
                  pl={line.credit && !line.debit ? '16px' : '0'}
                  fontWeight={line.debit ? '600' : '400'}
                >
                  {line.account_name}
                </Td>
                <Td isNumeric px="10px" fontSize="xs" fontFamily="mono" borderColor={cellBorder} color="green.700">
                  {line.debit ? fmt(line.debit) : ''}
                </Td>
                <Td isNumeric px="0" fontSize="xs" fontFamily="mono" borderColor={cellBorder} color="red.600">
                  {line.credit ? fmt(line.credit) : ''}
                </Td>
              </Tr>
            ))}
            {/* Totals row */}
            <Tr bg={headerBg}>
              <Td px="0" fontSize="xs" fontWeight="700" borderColor={cellBorder} color={totalColor}>
                Total
              </Td>
              <Td
                isNumeric px="10px" fontSize="xs" fontWeight="700"
                fontFamily="mono" borderColor={cellBorder} color={totalColor}
              >
                {fmt(totalDebit)}
              </Td>
              <Td
                isNumeric px="0" fontSize="xs" fontWeight="700"
                fontFamily="mono" borderColor={cellBorder} color={totalColor}
              >
                {fmt(totalCredit)}
              </Td>
            </Tr>
          </Tbody>
        </Table>
        <Button
          mt="12px"
          size="xs"
          variant="ghost"
          colorScheme="green"
          rightIcon={<MdOpenInNew />}
          onClick={() => window.open('/app/journal', '_blank')}
          color="#155740"
          _hover={{ bg: 'green.50' }}
        >
          View in Journal Entries
        </Button>
      </Box>
    </Box>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  const aiBubbleBg = useColorModeValue('white', 'gray.800');
  const aiBubbleBorder = useColorModeValue('gray.200', 'gray.600');
  const aiAvatarBg = useColorModeValue('#e8f5ef', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const timeColor = 'gray.400';

  return (
    <Flex direction="column" align={isUser ? 'flex-end' : 'flex-start'} mb="20px">
      <Flex align="flex-end" gap="10px" flexDirection={isUser ? 'row-reverse' : 'row'}>
        {/* Avatar */}
        <Flex
          w="34px" h="34px" borderRadius="10px"
          bg={isUser ? '#155740' : aiAvatarBg}
          align="center" justify="center" flexShrink={0} mb="4px"
        >
          {isUser ? (
            <Text color="white" fontWeight="700" fontSize="sm">U</Text>
          ) : (
            <Icon as={RiRobot2Line} color="#155740" w="18px" h="18px" />
          )}
        </Flex>

        {/* Bubble */}
        <Box
          maxW={{ base: '74vw', md: '520px' }}
          px="16px" py="12px"
          borderRadius={isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px'}
          bg={isUser ? 'linear-gradient(135deg, #155740 0%, #1a7a57 100%)' : aiBubbleBg}
          border={isUser ? 'none' : '1px solid'}
          borderColor={aiBubbleBorder}
          boxShadow={isUser ? '0px 4px 14px rgba(21, 87, 64, 0.3)' : 'sm'}
        >
          {/* Attachment chip */}
          {message.attachmentName && (
            <Flex
              align="center"
              bg={isUser ? 'rgba(255,255,255,0.15)' : 'green.50'}
              borderRadius="8px" px="10px" py="5px" mb="8px" gap="6px" w="fit-content"
            >
              <Icon as={MdAttachFile} color={isUser ? 'white' : '#155740'} w="13px" h="13px" />
              <Text fontSize="xs" color={isUser ? 'white' : '#155740'} fontWeight="500" maxW="220px" noOfLines={1}>
                {message.attachmentName}
              </Text>
            </Flex>
          )}

          <Text
            fontSize="sm"
            color={isUser ? 'white' : textColor}
            lineHeight="1.7"
            whiteSpace="pre-wrap"
          >
            {message.content}
          </Text>
        </Box>
      </Flex>

      {/* Journal entry card */}
      {message.journalEntry && !isUser && (
        <Box ms="44px">
          <JournalEntryCard entry={message.journalEntry} />
        </Box>
      )}

      {/* Timestamp */}
      <Text fontSize="10px" color={timeColor} mt="4px" mx="44px">
        {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Flex>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <Flex align="flex-start" mb="20px" gap="10px">
      <Flex w="34px" h="34px" borderRadius="10px" bg="#e8f5ef" align="center" justify="center" flexShrink={0}>
        <Icon as={RiRobot2Line} color="#155740" w="18px" h="18px" />
      </Flex>
      <Flex
        px="16px" py="13px" borderRadius="4px 18px 18px 18px"
        bg="white" border="1px solid" borderColor="gray.200"
        align="center" gap="6px" boxShadow="sm"
      >
        <Spinner size="xs" color="#155740" />
        <Text fontSize="sm" color="gray.400">CA NexBot is thinking…</Text>
      </Flex>
    </Flex>
  );
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'I paid office rent ₹25,000 today',
  'Received ₹1,18,000 sales invoice with 18% GST',
  'Paid salary ₹50,000 to employees',
  'What is my current cash balance?',
];

// ─── Main Page ────────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Namaste! 🙏 I'm CA NexBot, your AI Chartered Accountant.\n\nI can help you:\n• 📝 Record transactions with double-entry journal entries\n• 🧾 Process invoices & extract GST details\n• 💰 Answer questions on GST, TDS, and Ind AS\n• 📊 Explain your account balances\n\nJust describe a transaction or upload an invoice to get started!",
  timestamp: new Date(),
};

export default function AIAssistantPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Load state on mount or user change
  useEffect(() => {
    if (!user) return;
    const userStorageKey = `${STORAGE_KEY}_${user.id}`;
    try {
      const storedConvId = sessionStorage.getItem(userStorageKey);
      const storedMsgs = sessionStorage.getItem(userStorageKey + '_msgs');
      if (storedConvId) {
        setConversationId(storedConvId);
      } else {
        setConversationId(null);
      }

      if (storedMsgs) {
        const parsed = JSON.parse(storedMsgs);
        const revived = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(revived);
      } else {
        setMessages([WELCOME]);
      }
    } catch (e) {
      console.error('Failed to load session history', e);
    }
  }, [user]);

  // Save state on change
  useEffect(() => {
    if (!user) return;
    const userStorageKey = `${STORAGE_KEY}_${user.id}`;
    if (conversationId) sessionStorage.setItem(userStorageKey, conversationId);
    if (messages.length > 1) {
      sessionStorage.setItem(userStorageKey + '_msgs', JSON.stringify(messages));
    }
  }, [conversationId, messages, user]);

  const bgPage = useColorModeValue('gray.50', 'gray.900');
  const bgInput = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');
  const inputAreaBg = useColorModeValue('gray.50', 'gray.700');
  const inputAreaBorder = useColorModeValue('gray.200', 'gray.600');
  const chipBg = useColorModeValue('green.50', 'gray.700');
  const chipBorder = useColorModeValue('green.100', 'gray.600');

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || isLoading) return;

    const authHeader = await getAuthHeader();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || 'Please process this invoice file.',
      timestamp: new Date(),
      attachmentName: attachedFile?.name,
      isInvoice: !!attachedFile,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    try {
      let data: Record<string, unknown>;

      if (fileToSend) {
        // Invoice upload → /api/ai/upload-invoice
        const form = new FormData();
        form.append('file', fileToSend);
        form.append('message', text || 'Process this invoice');
        if (conversationId) form.append('conversation_id', conversationId);
        if (user?.id) form.append('user_id', user.id);

        const res = await fetch(`${API}/api/ai/upload-invoice`, {
          method: 'POST',
          headers: authHeader,
          body: form,
        });
        if (!res.ok) throw new Error(await res.text());
        data = await res.json();
      } else {
        // Text chat → /chat/message (existing)
        const form = new FormData();
        form.append('message', text);
        if (conversationId) form.append('conversation_id', conversationId);
        if (user?.id) form.append('user_id', user.id);

        const res = await fetch(`${API}/api/ai/chat`, {
          method: 'POST',
          headers: authHeader,
          body: form,
        });
        if (!res.ok) {
          // Fallback to legacy endpoint
          const res2 = await fetch(`${API}/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              message: text,
              conversation_id: conversationId,
              user_id: user?.id,
            }),
          });
          if (!res2.ok) throw new Error(await res2.text());
          data = await res2.json();
        } else {
          data = await res.json();
        }
      }

      // Track conversation
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id as string);
      }

      // Build journal entry for display
      let journalEntry: JournalEntry | undefined;
      const je = data.journal_entry as Record<string, unknown> | null;
      if (je) {
        journalEntry = {
          entry_date: (je.entry_date as string) || new Date().toISOString().split('T')[0],
          description: (je.description as string) || '',
          reference: (je.reference as string) || (je.reference_number as string),
          lines: (je.lines as JournalLine[]) || [],
          total_amount: je.total_amount as number,
        };
      }
      // For invoice upload, also extract from invoice_data
      const invData = data.invoice_data as Record<string, unknown> | null;
      if (invData && !journalEntry && data.journal_entry) {
        journalEntry = data.journal_entry as JournalEntry;
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: (data.reply as string) || (data.message as string) || 'Done.',
          timestamp: new Date(),
          journalEntry,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Connection error', description: msg, status: 'error', duration: 4000 });
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, an error occurred:\n\n${msg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachedFile, isLoading, conversationId, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = '';
  };

  return (
    <Flex direction="column" flex="1" bg={bgPage} overflow="hidden" h="100%">
      {/* Header */}
      <Flex
        px={{ base: '16px', md: '24px' }} py="12px"
        bg="white" borderBottom="1px solid" borderColor="gray.200"
        align="center" justify="space-between" flexShrink={0} boxShadow="sm"
      >
        <Flex align="center" gap="10px">
          <Flex w="36px" h="36px" bg="#155740" borderRadius="10px" align="center" justify="center">
            <Icon as={RiRobot2Line} color="white" w="18px" h="18px" />
          </Flex>
          <Box>
            <Text fontWeight="800" fontSize="sm" color="gray.800" letterSpacing="-0.3px">CA NexBot</Text>
            <Flex align="center" gap="5px">
              <Box w="6px" h="6px" borderRadius="full" bg="green.400" />
              <Text fontSize="xs" color="gray.400">Senior Chartered Accountant · AI</Text>
            </Flex>
          </Box>
        </Flex>
        <Badge colorScheme="green" borderRadius="8px" px="8px" fontSize="10px">
          Gemini 2.5 Flash
        </Badge>
      </Flex>

      {/* Messages */}
      <Box
        flex="1" overflowY="auto"
        px={{ base: '16px', md: '8%', lg: '14%', xl: '18%' }}
        py="24px"
        sx={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.12)', borderRadius: '4px' },
        }}
      >
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

        {/* Suggestion chips — only when no conversation yet */}
        {messages.length === 1 && (
          <Flex wrap="wrap" gap="8px" mt="8px" mb="20px" justify="center">
            {SUGGESTIONS.map(s => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                colorScheme="green"
                borderRadius="20px"
                fontSize="xs"
                color="#155740"
                borderColor="#c8e6c9"
                _hover={{ bg: 'green.50' }}
                onClick={() => { setInput(s); }}
              >
                {s}
              </Button>
            ))}
          </Flex>
        )}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        px={{ base: '12px', md: '8%', lg: '14%', xl: '18%' }}
        pt="12px" pb="16px"
        bg={bgInput} borderTop="1px solid" borderColor={borderColor} flexShrink={0}
      >
        {/* Attachment chip */}
        {attachedFile && (
          <Flex
            align="center" bg={chipBg} borderRadius="10px" px="12px" py="6px"
            mb="8px" gap="8px" w="fit-content" border="1px solid" borderColor={chipBorder}
          >
            <Icon as={MdAttachFile} color="#155740" w="13px" h="13px" />
            <Text fontSize="xs" color="#155740" fontWeight="500" maxW="240px" noOfLines={1}>
              {attachedFile.name}
            </Text>
            <Icon
              as={MdClose} color="#155740" w="12px" h="12px" cursor="pointer"
              onClick={() => setAttachedFile(null)} opacity={0.7}
              _hover={{ opacity: 1 }}
            />
          </Flex>
        )}

        <Flex
          align="flex-end" bg={inputAreaBg} borderRadius="18px"
          px="14px" py="10px" gap="8px"
          border="1px solid" borderColor={inputAreaBorder}
          transition="border-color 0.2s, box-shadow 0.2s"
          _focusWithin={{ borderColor: '#155740', boxShadow: '0 0 0 3px rgba(21,87,64,0.1)' }}
        >
          <Tooltip label="Attach invoice or receipt" fontSize="xs" borderRadius="8px" placement="top">
            <IconButton
              aria-label="Attach file"
              icon={<MdAttachFile />}
              size="sm" variant="ghost" borderRadius="10px"
              color={attachedFile ? '#155740' : 'gray.400'}
              _hover={{ bg: 'transparent', color: '#155740' }}
              onClick={() => fileInputRef.current?.click()}
              mb="1px"
            />
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Textarea
            flex="1" value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
            placeholder="Describe a transaction or ask an accounting question…"
            fontSize="sm" border="none" resize="none" rows={1}
            minH="36px" maxH="120px" bg="transparent" p="0"
            color={textColor} _placeholder={{ color: placeholderColor }}
            _focus={{ border: 'none', boxShadow: 'none' }}
            overflow="auto" lineHeight="1.6"
          />

          <IconButton
            aria-label="Send message"
            icon={<MdSend />}
            size="sm" bg="#155740" color="white" borderRadius="10px"
            _hover={{ bg: '#1a7a57' }} _active={{ bg: '#0e3d2a' }}
            isLoading={isLoading}
            isDisabled={!input.trim() && !attachedFile}
            onClick={sendMessage}
            mb="1px"
          />
        </Flex>

        <Text fontSize="10px" color="gray.400" textAlign="center" mt="6px">
          Enter to send · Shift+Enter for new line · Attach PDF/image for invoice processing
        </Text>
      </Box>
    </Flex>
  );
}
