// Chakra imports
import { Box, Flex, Icon, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import Footer from 'components/footer/FooterAuth';
import FixedPlugin from 'components/fixedPlugin/FixedPlugin';
import { ReactNode } from 'react';
import { MdAutoGraph, MdReceiptLong, MdSavings } from 'react-icons/md';

function NexBooksPanel() {
  return (
    <Flex
      w="100%"
      h="100%"
      direction="column"
      align="center"
      justify="center"
      bg="linear-gradient(135deg, #155740 0%, #1a7a58 40%, #51BC8F 100%)"
      borderBottomLeftRadius={{ lg: '120px', xl: '200px' }}
      px={{ lg: '48px', xl: '64px' }}
      py="60px"
      position="relative"
      overflow="hidden"
    >
      {/* Decorative circles */}
      <Box
        position="absolute"
        top="-80px"
        right="-80px"
        w="300px"
        h="300px"
        borderRadius="full"
        bg="rgba(255,255,255,0.06)"
      />
      <Box
        position="absolute"
        bottom="-60px"
        left="-60px"
        w="220px"
        h="220px"
        borderRadius="full"
        bg="rgba(255,255,255,0.05)"
      />

      {/* Logo mark */}
      <Flex
        w="72px"
        h="72px"
        bg="rgba(255,255,255,0.15)"
        borderRadius="20px"
        align="center"
        justify="center"
        mb="28px"
        boxShadow="0px 8px 32px rgba(0,0,0,0.12)"
      >
        <Text color="white" fontWeight="900" fontSize="2xl" letterSpacing="-1px">
          N
        </Text>
      </Flex>

      {/* Brand name */}
      <Text
        color="white"
        fontWeight="800"
        fontSize="3xl"
        letterSpacing="-0.8px"
        mb="10px"
        textAlign="center"
      >
        NexBooks
      </Text>

      {/* Tagline */}
      <Text
        color="rgba(255,255,255,0.85)"
        fontSize="md"
        fontWeight="500"
        textAlign="center"
        mb="4px"
        maxW="280px"
      >
        AI-Powered Accounting for Indian SMBs
      </Text>
      <Text color="rgba(255,255,255,0.55)" fontSize="sm" mb="52px">
        nexbooks.in
      </Text>

      {/* Feature pills */}
      <VStack spacing="12px" w="100%" maxW="300px">
        {[
          { icon: MdAutoGraph, text: 'Smart journal entries from plain language' },
          { icon: MdReceiptLong, text: 'GST & TDS compliance built-in' },
          { icon: MdSavings, text: 'Real-time P&L, Balance Sheet, Cash Flow' },
        ].map(({ icon, text }) => (
          <Flex
            key={text}
            align="center"
            gap="12px"
            bg="rgba(255,255,255,0.1)"
            borderRadius="12px"
            px="16px"
            py="12px"
            w="100%"
            backdropFilter="blur(8px)"
          >
            <Flex
              w="32px"
              h="32px"
              bg="rgba(255,255,255,0.15)"
              borderRadius="8px"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Icon as={icon} w="16px" h="16px" color="white" />
            </Flex>
            <Text color="white" fontSize="sm" fontWeight="500" lineHeight="1.35">
              {text}
            </Text>
          </Flex>
        ))}
      </VStack>
    </Flex>
  );
}

function AuthIllustration(props: {
  children: ReactNode;
  illustrationBackground?: string;
}) {
  const authBg = useColorModeValue('white', 'navy.900');
  const { children } = props;
  return (
    <Flex minW="100vh" w="100%" bg={authBg} position="relative" h="max-content">
      <Flex
        h={{ sm: 'initial', md: 'unset', lg: '100vh', xl: '100vh' }}
        w={{ base: '100vw', md: '100%' }}
        maxW={{ md: '66%', lg: '1313px' }}
        mx={{ md: 'auto' }}
        pt={{ sm: '50px', md: '0px' }}
        px={{ lg: '30px', xl: '0px' }}
        ps={{ xl: '70px' }}
        justifyContent="start"
        direction="column"
      >
        {children}
        <Box
          display={{ base: 'none', md: 'block' }}
          h="100%"
          minH="100vh"
          w={{ lg: '50vw', '2xl': '44vw' }}
          position="absolute"
          right="0px"
        >
          <NexBooksPanel />
        </Box>
        <Footer mb={{ xl: '3vh' }} />
      </Flex>
      <FixedPlugin />
    </Flex>
  );
}

export default AuthIllustration;
