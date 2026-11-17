import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // This can be expanded to hold global search results if needed
  const value = {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useGlobalSearch = () => useContext(SearchContext);
