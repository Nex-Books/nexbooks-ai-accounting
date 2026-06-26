/*eslint-disable*/

import { Flex, Link, List, ListItem, Text, useColorModeValue } from '@chakra-ui/react';

export default function Footer() {
  const textColor = useColorModeValue('gray.400', 'white');
  return (
    <Flex
      zIndex="3"
      flexDirection={{ base: 'column', xl: 'row' }}
      alignItems={{ base: 'center', xl: 'start' }}
      justifyContent="space-between"
      px={{ base: '30px', md: '50px' }}
      pb="30px"
    >
      <Text
        color={textColor}
        textAlign={{ base: 'center', xl: 'start' }}
        mb={{ base: '20px', xl: '0px' }}
      >
        &copy; {new Date().getFullYear()}
        <Text as="span" fontWeight="500" ms="4px">
          NexBooks. All Rights Reserved.
        </Text>
      </Text>
      <List display="flex">
        <ListItem me={{ base: '20px', md: '44px' }}>
          <Link fontWeight="500" color={textColor} href="mailto:nexbooks.general@gmail.com">
            Support
          </Link>
        </ListItem>
        <ListItem me={{ base: '20px', md: '44px' }}>
          <Link fontWeight="500" color={textColor} href="/app/help">
            Help
          </Link>
        </ListItem>
        <ListItem>
          <Link fontWeight="500" color={textColor} href="/app/settings">
            Settings
          </Link>
        </ListItem>
      </List>
    </Flex>
  );
}
