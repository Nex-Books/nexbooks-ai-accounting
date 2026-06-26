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
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { MdAttachFile, MdClose, MdSend } from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';
import { useAuth } from 'context/AuthContext';
import { supabase } from 'lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalLine {
  account: string;
  debit?: number;
  credit?: number;
}

interface JournalEntry {
  date: string;
  description: string;
  reference?: string;
  lines: JournalLine[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  journalEntry?: JournalEntry;
  attachmentName?: string;
}

// ─── Journal Entry Card ───────────────────────────────────────────────────────

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const cardBg = useColorModeValue('white', 'navy.800');
  const headerBg = useColorModeValue('purple.50', 'navy.700');
  const borderColor = useColorModeValue('purple.100', 'navy.600');
  const cellBorder = useColorModeValue('gray.100', 'navy.600');
  const totalColor = useColorModeValue('brand.500', 'brand.400');

  const totalDebit = entry.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (l.credit ?? 0), 0);

  return (
    <Box
      mt="10px"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="16px"
      overflow="hidden"
      bg={cardBg}
      boxShadow="0px 4px 20px rgba(66, 42, 251, 0.08)"
      maxW="460px"
    >
      {/* Card header */}
      <Flex
        bg={headerBg}
        px="16px"
        py="11px"
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <Box>
          <Text fontWeight="700" fontSize="sm" color="brand.500">
            Journal Entry
          </Text>
          <Text fontSize="xs" color="gray.500" mt="1px">
            {entry.date}
            {entry.reference ? ` · Ref: ${entry.reference}` : ''}
          </Text>
        </Box>
        <Badge
          colorScheme="purple"
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
        <Text fontSize="xs" color="gray.500" mb="10px">
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
                  pl={line.credit && !line.debit ? '14px' : '0'}
                >
                  {line.account}
                </Td>
                <Td isNumeric px="10px" fontSize="xs" fontFamily="mono" borderColor={cellBorder}>
                  {line.debit ? `$${line.debit.toFixed(2)}` : ''}
                </Td>
                <Td isNumeric px="0" fontSize="xs" fontFamily="mono" borderColor={cellBorder}>
                  {line.credit ? `$${line.credit.toFixed(2)}` : ''}
                </Td>
              </Tr>
            ))}
            {/* Totals row */}
            <Tr>
              <Td px="0" fontSize="xs" fontWeight="700" borderColor={cellBorder}>
                Total
              </Td>
              <Td
                isNumeric
                px="10px"
                fontSize="xs"
                fontWeight="700"
                fontFamily="mono"
                borderColor={cellBorder}
                color={totalColor}
              >
                ${totalDebit.toFixed(2)}
              </Td>
              <Td
                isNumeric
                px="0"
                fontSize="xs"
                fontWeight="700"
                fontFamily="mono"
                borderColor={cellBorder}
                color={totalColor}
              >
                ${totalCredit.toFixed(2)}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  const aiBubbleBg = useColorModeValue('white', 'navy.800');
  const aiBubbleBorder = useColorModeValue('gray.200', 'navy.600');
  const aiAvatarBg = useColorModeValue('secondaryGray.300', 'navy.700');
  const textColor = useColorModeValue('navy.700', 'white');
  const attachmentUserBg = 'whiteAlpha.200';
  const attachmentAiBg = useColorModeValue('purple.50', 'navy.700');
  const attachmentAiColor = 'brand.500';

  const timeColor = 'gray.400';

  return (
    <Flex direction="column" align={isUser ? 'flex-end' : 'flex-start'} mb="20px">
      <Flex
        align="flex-end"
        gap="10px"
        flexDirection={isUser ? 'row-reverse' : 'row'}
      >
        {/* Avatar */}
        <Flex
          w="34px"
          h="34px"
          borderRadius="10px"
          bg={isUser ? 'brand.500' : aiAvatarBg}
          align="center"
          justify="center"
          flexShrink={0}
          mb="4px"
        >
          {isUser ? (
            <Text color="white" fontWeight="700" fontSize="sm">
              U
            </Text>
          ) : (
            <Icon as={RiRobot2Line} color="brand.500" w="18px" h="18px" />
          )}
        </Flex>

        {/* Bubble */}
        <Box
          maxW={{ base: '74vw', md: '480px' }}
          px="16px"
          py="12px"
          borderRadius={isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px'}
          bg={isUser ? 'linear-gradient(135deg, #422AFB 0%, #7551FF 100%)' : aiBubbleBg}
          border={isUser ? 'none' : '1px solid'}
          borderColor={aiBubbleBorder}
          boxShadow={
            isUser
              ? '0px 4px 14px rgba(66, 42, 251, 0.3)'
              : 'sm'
          }
        >
          {/* Attachment chip inside bubble */}
          {message.attachmentName && (
            <Flex
              align="center"
              bg={isUser ? attachmentUserBg : attachmentAiBg}
              borderRadius="8px"
              px="10px"
              py="5px"
              mb="8px"
              gap="6px"
              w="fit-content"
            >
              <Icon
                as={MdAttachFile}
                color={isUser ? 'white' : attachmentAiColor}
                w="13px"
                h="13px"
              />
              <Text
                fontSize="xs"
                color={isUser ? 'white' : attachmentAiColor}
                fontWeight="500"
                maxW="200px"
                noOfLines={1}
              >
                {message.attachmentName}
              </Text>
            </Flex>
          )}

          <Text
            fontSize="sm"
            color={isUser ? 'white' : textColor}
            lineHeight="1.65"
            whiteSpace="pre-wrap"
          >
            {message.content}
          </Text>
        </Box>
      </Flex>

      {/* Journal entry below AI bubble */}
      {message.journalEntry && !isUser && (
        <Box ms="44px">
          <JournalEntryCard entry={message.journalEntry} />
        </Box>
      )}

      {/* Timestamp */}
      <Text fontSize="10px" color={timeColor} mt="4px" mx="44px">
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Flex>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const avatarBg = useColorModeValue('secondaryGray.300', 'navy.700');
  const bubbleBg = useColorModeValue('white', 'navy.800');
  const bubbleBorder = useColorModeValue('gray.200', 'navy.600');

  return (
    <Flex align="flex-start" mb="20px" gap="10px">
      <Flex
        w="34px"
        h="34px"
        borderRadius="10px"
        bg={avatarBg}
        align="center"
        justify="center"
        flexShrink={0}
      >
        <Icon as={RiRobot2Line} color="brand.500" w="18px" h="18px" />
      </Flex>
      <Flex
        px="16px"
        py="13px"
        borderRadius="4px 18px 18px 18px"
        bg={bubbleBg}
        border="1px solid"
        borderColor={bubbleBorder}
        align="center"
        gap="6px"
        boxShadow="sm"
      >
        <Spinner size="xs" color="brand.500" />
        <Text fontSize="sm" color="gray.400">
          Thinking...
        </Text>
      </Flex>
    </Flex>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your NexBooks AI assistant. I can help you:\n\n• Record transactions and journal entries\n• Categorize expenses and income\n• Process invoices and receipts\n• Answer accounting questions\n\nYou can also attach invoice or receipt files. How can I help you today?",
  timestamp: new Date(),
};

export default function AIAssistantPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Colors — all declared at top level to satisfy rules of hooks
  const bgPage = useColorModeValue('secondaryGray.300', 'navy.900');
  const bgHeader = useColorModeValue('white', 'navy.800');
  const bgInput = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'navy.700');
  const textColor = useColorModeValue('navy.700', 'white');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');
  const inputAreaBg = useColorModeValue('secondaryGray.300', 'navy.700');
  const inputAreaBorder = useColorModeValue('gray.200', 'navy.600');
  const inputAreaFocusBorder = 'brand.400';
  const chipBg = useColorModeValue('purple.50', 'navy.700');
  const chipBorder = useColorModeValue('purple.100', 'navy.600');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || isLoading) return;

    const { data: { session } } = await supabase.auth.getSession();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || 'Please process this file.',
      timestamp: new Date(),
      attachmentName: attachedFile?.name,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    try {
      let response: Response;
      const authHeader = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      if (fileToSend) {
        const form = new FormData();
        form.append('message', userMsg.content);
        form.append('file', fileToSend);
        response = await fetch('http://localhost:8000/chat/message', {
          method: 'POST',
          headers: authHeader,
          body: form,
        });
      } else {
        response = await fetch('http://localhost:8000/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ message: userMsg.content }),
        });
      }

      if (!response.ok) throw new Error(`${response.status}`);

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message ?? data.response ?? 'Done.',
          timestamp: new Date(),
          journalEntry: data.journal_entry ?? undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'I could not reach the server. Make sure the backend is running at http://localhost:8000.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachedFile, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  // Show spinner while resolving auth state
  if (authLoading || !user) {
    return (
      <Flex h="100vh" align="center" justify="center" bg={bgPage}>
        <Spinner size="xl" color="brand.500" thickness="3px" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100vh" bg={bgPage} overflow="hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Flex
        px={{ base: '16px', md: '28px' }}
        py="13px"
        bg={bgHeader}
        borderBottom="1px solid"
        borderColor={borderColor}
        align="center"
        justify="space-between"
        flexShrink={0}
        boxShadow="sm"
      >
        <Flex align="center" gap="12px">
          <Flex
            w="38px"
            h="38px"
            bg="linear-gradient(135deg, #422AFB 0%, #7551FF 100%)"
            borderRadius="10px"
            align="center"
            justify="center"
            boxShadow="0px 4px 10px rgba(66, 42, 251, 0.4)"
          >
            <Text color="white" fontWeight="800" fontSize="md">
              N
            </Text>
          </Flex>
          <Box>
            <Text
              fontWeight="800"
              fontSize="md"
              color={textColor}
              letterSpacing="-0.3px"
              lineHeight="1.2"
            >
              NexBooks
            </Text>
            <Flex align="center" gap="6px">
              <Box w="7px" h="7px" borderRadius="full" bg="green.400" />
              <Text fontSize="xs" color="gray.400">
                AI Assistant
              </Text>
            </Flex>
          </Box>
        </Flex>

        <Flex align="center" gap="10px">
          <Text
            fontSize="sm"
            color="gray.400"
            display={{ base: 'none', md: 'block' }}
          >
            {user.email}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="gray"
            borderRadius="10px"
            fontSize="sm"
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
          >
            Sign Out
          </Button>
        </Flex>
      </Flex>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <Box
        flex="1"
        overflowY="auto"
        px={{ base: '16px', md: '8%', lg: '14%', xl: '18%' }}
        py="28px"
        sx={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.12)',
            borderRadius: '4px',
          },
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </Box>

      {/* ── Input area ──────────────────────────────────────────────────────── */}
      <Box
        px={{ base: '12px', md: '8%', lg: '14%', xl: '18%' }}
        pt="14px"
        pb="18px"
        bg={bgInput}
        borderTop="1px solid"
        borderColor={borderColor}
        flexShrink={0}
      >
        {/* Attachment chip */}
        {attachedFile && (
          <Flex
            align="center"
            bg={chipBg}
            borderRadius="10px"
            px="12px"
            py="7px"
            mb="10px"
            gap="8px"
            w="fit-content"
            border="1px solid"
            borderColor={chipBorder}
          >
            <Icon as={MdAttachFile} color="brand.500" w="14px" h="14px" />
            <Text
              fontSize="xs"
              color="brand.600"
              fontWeight="500"
              maxW="240px"
              noOfLines={1}
            >
              {attachedFile.name}
            </Text>
            <Icon
              as={MdClose}
              color="brand.400"
              w="13px"
              h="13px"
              cursor="pointer"
              onClick={() => setAttachedFile(null)}
              _hover={{ color: 'brand.700' }}
            />
          </Flex>
        )}

        {/* Input row */}
        <Flex
          align="flex-end"
          bg={inputAreaBg}
          borderRadius="18px"
          px="14px"
          py="10px"
          gap="8px"
          border="1px solid"
          borderColor={inputAreaBorder}
          transition="border-color 0.2s, box-shadow 0.2s"
          _focusWithin={{
            borderColor: inputAreaFocusBorder,
            boxShadow: '0 0 0 3px rgba(66, 42, 251, 0.1)',
          }}
        >
          {/* Attachment button */}
          <Tooltip
            label="Attach invoice / receipt"
            fontSize="xs"
            borderRadius="8px"
            placement="top"
          >
            <IconButton
              aria-label="Attach file"
              icon={<MdAttachFile />}
              size="sm"
              variant="ghost"
              colorScheme="gray"
              borderRadius="10px"
              color={attachedFile ? 'brand.500' : 'gray.400'}
              _hover={{ bg: 'transparent', color: 'brand.500' }}
              onClick={() => fileInputRef.current?.click()}
              mb="1px"
            />
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Text input */}
          <Textarea
            flex="1"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about transactions, expenses, or upload an invoice…"
            fontSize="sm"
            border="none"
            resize="none"
            rows={1}
            minH="36px"
            maxH="120px"
            bg="transparent"
            p="0"
            color={textColor}
            _placeholder={{ color: placeholderColor }}
            _focus={{ border: 'none', boxShadow: 'none' }}
            overflow="auto"
            lineHeight="1.6"
          />

          {/* Send button */}
          <IconButton
            aria-label="Send message"
            icon={<MdSend />}
            size="sm"
            bg="brand.500"
            color="white"
            borderRadius="10px"
            _hover={{ bg: 'brand.600' }}
            _active={{ bg: 'brand.700' }}
            isLoading={isLoading}
            isDisabled={!input.trim() && !attachedFile}
            onClick={sendMessage}
            mb="1px"
          />
        </Flex>

        <Text fontSize="10px" color="gray.400" textAlign="center" mt="8px">
          Enter to send · Shift+Enter for new line
        </Text>
      </Box>
    </Flex>
  );
}
