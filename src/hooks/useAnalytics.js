import { useState, useCallback } from "react";

export function useAnalytics() {
  const [apiCallCount, setApiCallCount] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [costSavings, setCostSavings] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  const incrementApiCalls = useCallback(() => {
    setApiCallCount(prev => prev + 1);
  }, []);

  const addTokens = useCallback((input, output) => {
    setTotalTokens(prev => prev + input + output);
  }, []);

  const recordCacheHit = useCallback(() => {
    setCacheHits(prev => prev + 1);
    setCostSavings(prev => prev + 0.0016);
  }, []);

  const recordDeterministicRepairSavings = useCallback(() => {
    setCostSavings(prev => prev + 0.0015);
  }, []);

  const resetAnalytics = useCallback(() => {
    setApiCallCount(0);
    setCacheHits(0);
    setCostSavings(0);
    setTotalTokens(0);
  }, []);

  return {
    apiCallCount,
    cacheHits,
    costSavings,
    totalTokens,
    incrementApiCalls,
    addTokens,
    recordCacheHit,
    recordDeterministicRepairSavings,
    resetAnalytics,
    setApiCallCount,
    setCacheHits,
    setCostSavings,
    setTotalTokens
  };
}
