'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from 'context/AuthContext';
import { Flex, Spinner } from '@chakra-ui/react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/app/dashboard' : '/auth/login');
    }
  }, [user, loading, router]);

  return (
    <Flex h="100vh" align="center" justify="center">
      <Spinner size="xl" color="teal.500" thickness="3px" />
    </Flex>
  );
}
