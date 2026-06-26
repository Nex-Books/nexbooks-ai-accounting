'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from 'context/AuthContext';
import { supabase } from 'lib/supabase';
import {
  Box,
  Divider,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import {
  MdAccountBalance,
  MdAccountTree,
  MdAssignment,
  MdBarChart,
  MdBook,
  MdClose,
  MdDashboard,
  MdDescription,
  MdGavel,
  MdHelp,
  MdLogout,
  MdMenu,
  MdMoneyOff,
  MdOutlineAccountBalanceWallet,
  MdOutlineReceiptLong,
  MdReceipt,
  MdSettings,
  MdShowChart,
  MdTableRows,
  MdWaterfallChart,
} from 'react-icons/md';
import { RiRobot2Line } from 'react-icons/ri';

const SIDEBAR_W = '268px';
const SIDEBAR_BG = '#155740';
const ACTIVE_BG = 'rgba(255,255,255,0.18)';
const HOVER_BG = 'rgba(255,255,255,0.08)';

// ─── Nav Structure ─────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  section?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/app/dashboard', icon: MdDashboard },
      { label: 'AI Assistant', href: '/app/ai-assistant', icon: RiRobot2Line },
    ],
  },
  {
    section: 'Accounting',
    items: [
      { label: 'Journal Entries', href: '/app/journal', icon: MdBook },
      { label: 'General Ledger', href: '/app/ledger', icon: MdTableRows },
      { label: 'Chart of Accounts', href: '/app/chart-of-accounts', icon: MdAccountTree },
    ],
  },
  {
    section: 'Receivables & Payables',
    items: [
      { label: 'Invoices', href: '/app/invoices', icon: MdReceipt },
      { label: 'Accounts Receivable', href: '/app/receivables', icon: MdOutlineReceiptLong },
      { label: 'Accounts Payable', href: '/app/payables', icon: MdDescription },
      { label: 'Expenses', href: '/app/expenses', icon: MdMoneyOff },
    ],
  },
  {
    section: 'Banking',
    items: [
      { label: 'Bank Transactions', href: '/app/bank', icon: MdAccountBalance },
    ],
  },
  {
    section: 'Reports',
    items: [
      { label: 'Financial Reports', href: '/app/reports', icon: MdBarChart },
      { label: 'Balance Sheet', href: '/app/reports/balance-sheet', icon: MdOutlineAccountBalanceWallet },
      { label: 'Profit & Loss', href: '/app/reports/profit-loss', icon: MdShowChart },
      { label: 'Cash Flow', href: '/app/reports/cash-flow', icon: MdWaterfallChart },
    ],
  },
  {
    section: 'Compliance',
    items: [
      { label: 'Tax Management', href: '/app/tax', icon: MdGavel },
      { label: 'Audit Logs', href: '/app/audit', icon: MdAssignment },
    ],
  },
];

const NAV_BOTTOM: NavItem[] = [
  { label: 'Settings', href: '/app/settings', icon: MdSettings },
  { label: 'Help', href: '/app/help', icon: MdHelp },
];

// ─── NavItem Component ────────────────────────────────────────────────────────

function NavLink({
  label,
  href,
  icon,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', width: '100%' }}>
      <Flex
        align="center"
        px="14px"
        py="8px"
        mx="8px"
        borderRadius="9px"
        bg={active ? ACTIVE_BG : 'transparent'}
        _hover={{ bg: active ? ACTIVE_BG : HOVER_BG }}
        transition="background 0.15s"
        gap="11px"
        cursor="pointer"
      >
        <Icon
          as={icon}
          w="17px"
          h="17px"
          color={active ? 'white' : 'whiteAlpha.600'}
          flexShrink={0}
        />
        <Text
          fontSize="sm"
          fontWeight={active ? '600' : '400'}
          color={active ? 'white' : 'whiteAlpha.800'}
          letterSpacing="-0.1px"
        >
          {label}
        </Text>
        {active && (
          <Box ml="auto" w="4px" h="4px" borderRadius="full" bg="white" flexShrink={0} />
        )}
      </Flex>
    </Link>
  );
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split('@')[0] ||
    'User';
  const email = user?.email || '';

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + '/') ?? false);

  return (
    <Flex direction="column" h="100%" bg={SIDEBAR_BG} overflowY="auto" py="18px">
      {/* Logo */}
      <Flex align="center" px="20px" mb="24px" justify="space-between">
        <Flex align="center" gap="10px">
          <Flex
            w="32px"
            h="32px"
            bg="rgba(255,255,255,0.2)"
            borderRadius="8px"
            align="center"
            justify="center"
          >
            <Text color="white" fontWeight="800" fontSize="sm">
              N
            </Text>
          </Flex>
          <Text color="white" fontWeight="800" fontSize="lg" letterSpacing="-0.4px">
            NexBooks
          </Text>
        </Flex>
        {onClose && (
          <IconButton
            aria-label="Close sidebar"
            icon={<MdClose />}
            size="sm"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: HOVER_BG, color: 'white' }}
            onClick={onClose}
          />
        )}
      </Flex>

      {/* Nav groups */}
      <Flex direction="column" flex="1" gap="2px">
        {NAV_GROUPS.map((group, gi) => (
          <Box key={gi} mb="4px">
            {group.section && (
              <Text
                fontSize="10px"
                fontWeight="700"
                color="whiteAlpha.500"
                letterSpacing="0.8px"
                textTransform="uppercase"
                px="22px"
                pt={gi === 0 ? '0' : '10px'}
                pb="6px"
              >
                {group.section}
              </Text>
            )}
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </Box>
        ))}

        {/* Separator before bottom items */}
        <Box mx="20px" mt="6px" mb="6px">
          <Divider borderColor="whiteAlpha.200" />
        </Box>

        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </Flex>

      {/* User info */}
      <Box mx="8px" mt="12px">
        <Divider borderColor="whiteAlpha.200" mb="12px" mx="12px" />
        <Flex
          align="center"
          px="12px"
          py="9px"
          borderRadius="9px"
          gap="10px"
          _hover={{ bg: HOVER_BG }}
          cursor="default"
        >
          <Flex
            w="32px"
            h="32px"
            borderRadius="8px"
            bg="rgba(255,255,255,0.2)"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Text color="white" fontWeight="700" fontSize="xs">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </Flex>
          <Box flex="1" minW="0">
            <Text color="white" fontSize="sm" fontWeight="600" noOfLines={1}>
              {displayName}
            </Text>
            <Text color="whiteAlpha.600" fontSize="xs" noOfLines={1}>
              {email}
            </Text>
          </Box>
          <Tooltip label="Sign out" placement="top" fontSize="xs" hasArrow>
            <IconButton
              aria-label="Sign out"
              icon={<MdLogout />}
              size="sm"
              variant="ghost"
              color="whiteAlpha.600"
              _hover={{ bg: HOVER_BG, color: 'white' }}
              onClick={handleSignOut}
            />
          </Tooltip>
        </Flex>
      </Box>
    </Flex>
  );
}

// ─── App Layout ───────────────────────────────────────────────────────────────

export default function AppLayout({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  // Check if user has completed onboarding (has a business profile)
  useEffect(() => {
    if (!user || loading) return;
    async function checkOnboarding() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch(`${API}/business/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 404) {
          // No profile yet — redirect to onboarding
          router.replace('/onboarding');
          return;
        }
      } catch {
        // Network error or backend not running — skip onboarding check
      } finally {
        setOnboardingChecked(true);
      }
    }
    checkOnboarding();
  }, [user, loading, router]);

  if (loading || !user || !onboardingChecked) {
    return (
      <Flex h="100vh" align="center" justify="center" bg="gray.50">
        <Spinner size="xl" color="teal.500" thickness="3px" />
      </Flex>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          * { box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Ensure charts are rendered okay or skipped, but tables are visible */
        }
      `}</style>
      <Flex h="100vh" overflow="hidden" className="print-full-width">
        {/* Desktop sidebar */}
        <Box
          w={SIDEBAR_W}
          flexShrink={0}
          h="100vh"
          display={{ base: 'none', md: 'block' }}
          className="no-print"
        >
          <SidebarContent />
        </Box>

      {/* Mobile overlay */}
      {mobileOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          zIndex={1300}
          bg="blackAlpha.600"
          display={{ base: 'block', md: 'none' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <Box
        position="fixed"
        top="0"
        left="0"
        w={SIDEBAR_W}
        h="100vh"
        zIndex={1400}
        transform={mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}
        transition="transform 0.25s ease"
        display={{ base: 'block', md: 'none' }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </Box>

      {/* Content area */}
      <Flex flex="1" direction="column" overflow="hidden" minW="0">
        {/* Mobile top bar */}
        <Flex
          display={{ base: 'flex', md: 'none' }}
          px="16px"
          py="12px"
          bg={SIDEBAR_BG}
          align="center"
          gap="12px"
          flexShrink={0}
          className="no-print"
        >
          <IconButton
            aria-label="Open menu"
            icon={<MdMenu />}
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: HOVER_BG }}
            onClick={() => setMobileOpen(true)}
          />
          <Text color="white" fontWeight="800" fontSize="md" letterSpacing="-0.4px">
            NexBooks
          </Text>
        </Flex>

        {/* Page content */}
        <Box flex="1" overflow="auto" display="flex" flexDirection="column">
          {children}
        </Box>
      </Flex>
    </Flex>
    </>
  );
}
