'use client';

import { ApolloClient, ApolloProvider, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export default function Providers({ children }) {
  const httpLink = createHttpLink({
    uri: 'https://learn.reboot01.com/api/graphql-engine/v1/graphql',
    credentials: 'include',
  });

  const authLink = setContext((_, { headers }) => {
    // Get token from cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const token = getCookie('auth_token') || localStorage.getItem('token');

    return {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      }
    };
  });

  const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    credentials: 'include',
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only',
      },
      query: {
        fetchPolicy: 'network-only',
      },
    },
  });

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
