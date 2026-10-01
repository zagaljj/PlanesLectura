import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { DatabaseManager, ISQLiteDatabase } from '../../data/sqlite/DatabaseManager';
import {
  SQLitePlanRepository,
  SQLiteSubscriptionRepository,
  SQLiteArticleRepository,
  SQLiteBibleRepository,
} from '../../data/repositories';
import {
  PlanRepository,
  SubscriptionRepository,
  ArticleRepository,
  BibleRepository,
} from '../../domain/repositories';
import {
  GetActivePlansWithTodayReadings,
  ToggleReadingProgress,
  GetPassageVerses,
  GetPlanCatalog,
  SubscribeToPlan,
} from '../../domain/usecases';
import { SitemapSyncService } from '../../data/sync/SitemapSyncService';
import { PlanReading } from '../../domain/entities';
import { lightColors, darkColors, ColorPalette } from '../theme/colors';

export interface AppContextType {
  isInitialized: boolean;
  initError: Error | null;
  database: ISQLiteDatabase | null;
  planRepo: PlanRepository | null;
  subscriptionRepo: SubscriptionRepository | null;
  articleRepo: ArticleRepository | null;
  bibleRepo: BibleRepository | null;
  getActivePlansUseCase: GetActivePlansWithTodayReadings | null;
  toggleReadingProgressUseCase: ToggleReadingProgress | null;
  getPassageVersesUseCase: GetPassageVerses | null;
  getPlanCatalogUseCase: GetPlanCatalog | null;
  subscribeToPlanUseCase: SubscribeToPlan | null;
  sitemapSyncService: SitemapSyncService | null;
  selectedReading: PlanReading | null;
  selectedSubscriptionId: string | null;
  setSelectedReading: (reading: PlanReading | null, subscriptionId?: string | null) => void;
  fontSizeModifier: number;
  setFontSizeModifier: React.Dispatch<React.SetStateAction<number>>;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleTheme: () => void;
  colors: ColorPalette;
  refreshTrigger: number;
  notifyDataChanged: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export interface AppProviderProps {
  children: React.ReactNode;
  initialDatabase?: ISQLiteDatabase;
  planRepo?: PlanRepository;
  subscriptionRepo?: SubscriptionRepository;
  articleRepo?: ArticleRepository;
  bibleRepo?: BibleRepository;
  getActivePlansUseCase?: GetActivePlansWithTodayReadings;
  toggleReadingProgressUseCase?: ToggleReadingProgress;
  getPassageVersesUseCase?: GetPassageVerses;
  getPlanCatalogUseCase?: GetPlanCatalog;
  subscribeToPlanUseCase?: SubscribeToPlan;
  sitemapSyncService?: SitemapSyncService;
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  initialDatabase,
  planRepo: overridePlanRepo,
  subscriptionRepo: overrideSubRepo,
  articleRepo: overrideArticleRepo,
  bibleRepo: overrideBibleRepo,
  getActivePlansUseCase: overrideGetActivePlans,
  toggleReadingProgressUseCase: overrideToggleProgress,
  getPassageVersesUseCase: overrideGetVerses,
  getPlanCatalogUseCase: overrideGetCatalog,
  subscribeToPlanUseCase: overrideSubscribe,
  sitemapSyncService: overrideSyncService,
}) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(Boolean(initialDatabase));
  const [initError, setInitError] = useState<Error | null>(null);
  const [database, setDatabase] = useState<ISQLiteDatabase | null>(initialDatabase ?? null);

  const [selectedReading, setSelectedReadingState] = useState<PlanReading | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [fontSizeModifier, setFontSizeModifier] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const notifyDataChanged = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const setSelectedReading = useCallback(
    (reading: PlanReading | null, subscriptionId?: string | null) => {
      setSelectedReadingState(reading);
      setSelectedSubscriptionId(subscriptionId ?? null);
    },
    []
  );

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initDb() {
      if (initialDatabase) {
        return;
      }
      try {
        const db = await DatabaseManager.getDatabase();
        if (isMounted) {
          setDatabase(db);
          setIsInitialized(true);
        }
      } catch (err: any) {
        if (isMounted) {
          setInitError(err);
          setIsInitialized(true);
        }
      }
    }

    initDb();

    return () => {
      isMounted = false;
    };
  }, [initialDatabase]);

  // Build repositories
  const planRepo = useMemo(() => {
    if (overridePlanRepo) return overridePlanRepo;
    if (!database) return null;
    return new SQLitePlanRepository(database);
  }, [database, overridePlanRepo]);

  const subscriptionRepo = useMemo(() => {
    if (overrideSubRepo) return overrideSubRepo;
    if (!database) return null;
    return new SQLiteSubscriptionRepository(database);
  }, [database, overrideSubRepo]);

  const articleRepo = useMemo(() => {
    if (overrideArticleRepo) return overrideArticleRepo;
    if (!database) return null;
    return new SQLiteArticleRepository(database);
  }, [database, overrideArticleRepo]);

  const bibleRepo = useMemo(() => {
    if (overrideBibleRepo) return overrideBibleRepo;
    if (!database) return null;
    return new SQLiteBibleRepository(database);
  }, [database, overrideBibleRepo]);

  // Build use cases
  const getActivePlansUseCase = useMemo(() => {
    if (overrideGetActivePlans) return overrideGetActivePlans;
    if (!planRepo || !subscriptionRepo || !articleRepo) return null;
    return new GetActivePlansWithTodayReadings(planRepo, subscriptionRepo, articleRepo);
  }, [planRepo, subscriptionRepo, articleRepo, overrideGetActivePlans]);

  const toggleReadingProgressUseCase = useMemo(() => {
    if (overrideToggleProgress) return overrideToggleProgress;
    if (!subscriptionRepo) return null;
    return new ToggleReadingProgress(subscriptionRepo);
  }, [subscriptionRepo, overrideToggleProgress]);

  const getPassageVersesUseCase = useMemo(() => {
    if (overrideGetVerses) return overrideGetVerses;
    if (!bibleRepo) return null;
    return new GetPassageVerses(bibleRepo);
  }, [bibleRepo, overrideGetVerses]);

  const getPlanCatalogUseCase = useMemo(() => {
    if (overrideGetCatalog) return overrideGetCatalog;
    if (!planRepo || !subscriptionRepo) return null;
    return new GetPlanCatalog(planRepo, subscriptionRepo);
  }, [planRepo, subscriptionRepo, overrideGetCatalog]);

  const subscribeToPlanUseCase = useMemo(() => {
    if (overrideSubscribe) return overrideSubscribe;
    if (!subscriptionRepo || !planRepo) return null;
    return new SubscribeToPlan(subscriptionRepo, planRepo);
  }, [subscriptionRepo, planRepo, overrideSubscribe]);

  const sitemapSyncService = useMemo(() => {
    if (overrideSyncService) return overrideSyncService;
    if (!articleRepo) return null;
    return new SitemapSyncService(articleRepo);
  }, [articleRepo, overrideSyncService]);

  const colors = isDarkMode ? darkColors : lightColors;

  const value: AppContextType = {
    isInitialized,
    initError,
    database,
    planRepo,
    subscriptionRepo,
    articleRepo,
    bibleRepo,
    getActivePlansUseCase,
    toggleReadingProgressUseCase,
    getPassageVersesUseCase,
    getPlanCatalogUseCase,
    subscribeToPlanUseCase,
    sitemapSyncService,
    selectedReading,
    selectedSubscriptionId,
    setSelectedReading,
    fontSizeModifier,
    setFontSizeModifier,
    isDarkMode,
    setIsDarkMode,
    toggleTheme,
    colors,
    refreshTrigger,
    notifyDataChanged,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    // Return a safe fallback object for testing or unmounted context
    return {
      isInitialized: true,
      initError: null,
      database: null,
      planRepo: null,
      subscriptionRepo: null,
      articleRepo: null,
      bibleRepo: null,
      getActivePlansUseCase: null,
      toggleReadingProgressUseCase: null,
      getPassageVersesUseCase: null,
      getPlanCatalogUseCase: null,
      subscribeToPlanUseCase: null,
      sitemapSyncService: null,
      selectedReading: null,
      selectedSubscriptionId: null,
      setSelectedReading: () => {},
      fontSizeModifier: 0,
      setFontSizeModifier: () => {},
      isDarkMode: false,
      setIsDarkMode: () => {},
      toggleTheme: () => {},
      colors: lightColors,
      refreshTrigger: 0,
      notifyDataChanged: () => {},
    };
  }
  return context;
}

export function useAppTheme(): { colors: ColorPalette; isDarkMode: boolean; toggleTheme: () => void } {
  const { colors, isDarkMode, toggleTheme } = useAppContext();
  return { colors, isDarkMode, toggleTheme };
}
