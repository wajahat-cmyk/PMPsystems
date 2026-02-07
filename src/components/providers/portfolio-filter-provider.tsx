'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface PortfolioFilterContextValue {
  selectedPortfolio: string | null;
  setSelectedPortfolio: (portfolio: string | null) => void;
  isFiltered: boolean;
}

const PortfolioFilterContext = createContext<PortfolioFilterContextValue | null>(
  null
);

export function PortfolioFilterProvider({ children }: { children: ReactNode }) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(
    null
  );

  const handleSetPortfolio = useCallback(
    (portfolio: string | null) => setSelectedPortfolio(portfolio),
    []
  );

  const value = useMemo<PortfolioFilterContextValue>(
    () => ({
      selectedPortfolio,
      setSelectedPortfolio: handleSetPortfolio,
      isFiltered: selectedPortfolio !== null,
    }),
    [selectedPortfolio, handleSetPortfolio]
  );

  return (
    <PortfolioFilterContext.Provider value={value}>
      {children}
    </PortfolioFilterContext.Provider>
  );
}

export function usePortfolioFilter(): PortfolioFilterContextValue {
  const context = useContext(PortfolioFilterContext);
  if (!context) {
    throw new Error(
      'usePortfolioFilter must be used within a <PortfolioFilterProvider />'
    );
  }
  return context;
}
