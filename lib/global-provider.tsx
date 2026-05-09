import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    enrichSessionUser,
    getCurrentUserWithProfile,
    getPrefsRole,
    type GlobalSessionUser,
    type UserProfileDocument,
} from "./appwrite";

interface GlobalContextType {
    user: GlobalSessionUser | null;
    profile: UserProfileDocument | null;
    /** Buyer/agent chosen in prefs (select-role). Not the same as table RBAC. */
    hasChosenRole: boolean;
    loading: boolean;
    refetchUser: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
    children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
    const [user, setUser] = useState<GlobalSessionUser | null>(null);
    const [profile, setProfile] = useState<UserProfileDocument | null>(null);
    const [hasChosenRole, setHasChosenRole] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getCurrentUserWithProfile();

            if (!result) {
                setUser(null);
                setProfile(null);
                setHasChosenRole(false);
                return;
            }

            const sessionUser = await enrichSessionUser(result.account);
            const prefsRole = await getPrefsRole();
            setHasChosenRole(prefsRole != null);
            setUser(sessionUser);
            setProfile(result.profile);
        } catch (error) {
            console.error("GlobalProvider loadUser error:", error);
            setUser(null);
            setProfile(null);
            setHasChosenRole(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUser();
    }, [loadUser]);

    return (
        <GlobalContext.Provider
            value={{
                user,
                profile,
                hasChosenRole,
                loading,
                refetchUser: loadUser,
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = (): GlobalContextType => {
    const context = useContext(GlobalContext);
    if (!context)
        throw new Error("useGlobalContext must be used within a GlobalProvider");

    return context;
};

export default GlobalProvider;
