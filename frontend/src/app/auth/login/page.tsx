'use client';

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import DefaultAuthLayout from 'layouts/auth/Default';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiEyeCloseLine } from 'react-icons/ri';
import { useAuth } from 'context/AuthContext';

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = 'gray.400';
  const textColorDetails = useColorModeValue('navy.700', 'secondaryGray.600');
  const textColorBrand = useColorModeValue('brand.500', 'white');
  const brandStars = useColorModeValue('brand.500', 'brand.400');

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/app/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    } else {
      router.push('/app/dashboard');
    }
  };

  return (
    <DefaultAuthLayout illustrationBackground={'/img/auth/auth.png'}>
      <Flex
        maxW={{ base: '100%', md: 'max-content' }}
        w="100%"
        mx={{ base: 'auto', lg: '0px' }}
        me="auto"
        h="100%"
        alignItems="start"
        justifyContent="center"
        mb={{ base: '30px', md: '60px' }}
        px={{ base: '25px', md: '0px' }}
        mt={{ base: '40px', md: '14vh' }}
        flexDirection="column"
      >
        <Box me="auto" mb="36px">
          <Flex align="center" mb="16px">
            <Flex
              w="44px"
              h="44px"
              bg="linear-gradient(135deg, #422AFB 0%, #7551FF 100%)"
              borderRadius="12px"
              align="center"
              justify="center"
              me="12px"
              boxShadow="0px 4px 14px rgba(66, 42, 251, 0.45)"
            >
              <Text color="white" fontWeight="800" fontSize="xl">
                N
              </Text>
            </Flex>
            <Text
              color={textColorBrand}
              fontWeight="800"
              fontSize="2xl"
              letterSpacing="-0.5px"
            >
              NexBooks
            </Text>
          </Flex>
          <Heading color={textColor} fontSize="36px" mb="8px">
            Welcome back
          </Heading>
          <Text color={textColorSecondary} fontWeight="400" fontSize="md">
            Sign in to your AI-powered accounting platform
          </Text>
        </Box>

        <Flex
          zIndex="2"
          direction="column"
          w={{ base: '100%', md: '420px' }}
          maxW="100%"
          background="transparent"
          borderRadius="15px"
          mx={{ base: 'auto', lg: 'unset' }}
          me="auto"
          mb={{ base: '20px', md: 'auto' }}
        >
          {error && (
            <Alert status="error" borderRadius="16px" mb="24px" fontSize="sm">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <FormControl>
              <FormLabel
                display="flex"
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                mb="8px"
              >
                Email<Text color={brandStars}>*</Text>
              </FormLabel>
              <Input
                isRequired
                variant="auth"
                fontSize="sm"
                type="email"
                placeholder="your@email.com"
                mb="24px"
                fontWeight="500"
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <FormLabel
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                display="flex"
              >
                Password<Text color={brandStars}>*</Text>
              </FormLabel>
              <InputGroup size="md">
                <Input
                  isRequired
                  fontSize="sm"
                  placeholder="Your password"
                  mb="24px"
                  size="lg"
                  type={showPassword ? 'text' : 'password'}
                  variant="auth"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputRightElement display="flex" alignItems="center" mt="4px">
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: 'pointer' }}
                    as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>

              <Button
                fontSize="sm"
                variant="brand"
                fontWeight="500"
                w="100%"
                h="50px"
                mb="24px"
                type="submit"
                isLoading={isLoading}
                loadingText="Signing in..."
              >
                Sign In
              </Button>
            </FormControl>
          </form>

          <Flex justifyContent="center">
            <Text color={textColorDetails} fontWeight="400" fontSize="14px">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register">
                <Text color={textColorBrand} as="span" fontWeight="500">
                  Create one
                </Text>
              </Link>
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </DefaultAuthLayout>
  );
}
