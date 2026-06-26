import { Box, Flex, Link, Text } from '@chakra-ui/react';

export default function SidebarDocs() {
  return (
    <Flex
      justify="center"
      direction="column"
      align="center"
      bg="linear-gradient(135deg, #155740 0%, #51BC8F 100%)"
      borderRadius="20px"
      me="20px"
      p="20px 16px"
    >
      <Text
        fontSize="15px"
        color="white"
        fontWeight="700"
        lineHeight="150%"
        textAlign="center"
        mb="8px"
      >
        NexBooks AI Assistant
      </Text>
      <Text fontSize="xs" color="whiteAlpha.800" textAlign="center" mb="16px" px="4px">
        Ask any accounting question or record a transaction in plain language.
      </Text>
      <Link href="/app/ai-assistant" style={{ textDecoration: 'none' }}>
        <Box
          bg="whiteAlpha.300"
          _hover={{ bg: 'whiteAlpha.400' }}
          px="20px"
          py="9px"
          borderRadius="10px"
          color="white"
          fontSize="sm"
          fontWeight="600"
          textAlign="center"
        >
          Open AI Assistant
        </Box>
      </Link>
    </Flex>
  );
}
