import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../state/queryClient';
import type {
  AccountQuery,
  CustomerQuery,
  LedgerQuery,
  TransactionQuery,
} from '../types/domain';

/**
 * Customer and account data hooks. Results, pagination and filtering all come
 * from the data source; the interface only renders what it returns.
 */
export function useCustomers(query: CustomerQuery) {
  return useQuery({
    queryKey: queryKeys.customers.list(query),
    queryFn: () => api.customersList(query),
    staleTime: 8_000,
  });
}

export function useCustomerDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: () => api.customerDetail(id as string),
    enabled: Boolean(id),
    staleTime: 8_000,
  });
}

export function useAccounts(query: AccountQuery) {
  return useQuery({
    queryKey: queryKeys.accounts.list(query),
    queryFn: () => api.accountsList(query),
    staleTime: 8_000,
  });
}

export function useAccountDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id ?? ''),
    queryFn: () => api.accountDetail(id as string),
    enabled: Boolean(id),
    staleTime: 8_000,
  });
}

/* ------------------------------------------------------------- transactions */

export function useTransactions(query: TransactionQuery) {
  return useQuery({
    queryKey: queryKeys.transactions.list(query),
    queryFn: () => api.transactionsList(query),
    staleTime: 5_000,
  });
}

export function useTransactionDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id ?? ''),
    queryFn: () => api.transactionDetail(id as string),
    enabled: Boolean(id),
    staleTime: 2_000,
    // While the source is still progressing the transaction, keep polling so
    // the lifecycle and ledger render the source's actual state.
    refetchInterval: (query) =>
      query.state.data?.inProgress ? 1_200 : false,
  });
}

/* ------------------------------------------------------------------- ledger */

export function useLedger(query: LedgerQuery) {
  return useQuery({
    queryKey: queryKeys.ledger.list(query),
    queryFn: () => api.ledgerList(query),
    staleTime: 5_000,
  });
}

export function useLedgerEntry(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.ledger.detail(id ?? ''),
    queryFn: () => api.ledgerEntryDetail(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}
