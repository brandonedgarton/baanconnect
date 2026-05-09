import { useMemo } from "react";

import { useGlobalContext } from "./global-provider";

/**
 * UX-only flags for hiding/showing UI. Appwrite permissions / server functions must still
 * enforce who can create data, publish, or access admin routes.
 */
export function useProfileAccess() {
    const { profile } = useGlobalContext();

    return useMemo(() => {
        const role = profile?.role ?? null;

        return {
            profile,
            role,
            isAdmin: profile?.role === "admin",
            isAgent: role === "agent",
            isBuyer: role === "buyer",
            isVerifiedAgent:
                profile?.role === "agent" &&
                profile?.agentVerificationStatus === "verified",
            isSuspended: profile?.isSuspended === true,
        };
    }, [profile]);
}
