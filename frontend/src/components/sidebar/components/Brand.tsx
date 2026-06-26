// Chakra imports
import { Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { HSeparator } from 'components/separator/Separator';

export function SidebarBrand() {
  const textColor = useColorModeValue('navy.700', 'white');

  return (
    <Flex alignItems="center" flexDirection="column">
      <Flex align="center" gap="10px" my="32px">
        <Flex
          w="32px"
          h="32px"
          bg="brand.500"
          borderRadius="8px"
          align="center"
          justify="center"
        >
          <Text color="white" fontWeight="900" fontSize="sm">
            N
          </Text>
        </Flex>
        <Text color={textColor} fontWeight="800" fontSize="lg" letterSpacing="-0.4px">
          NexBooks
        </Text>
      </Flex>
      <HSeparator mb="20px" />
    </Flex>
  );
}

export default SidebarBrand;
