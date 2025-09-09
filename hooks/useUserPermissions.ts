'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPermissions {
    canManageFood: boolean;
    canManageSports: boolean;
    loading: boolean;
}

export function useUserPermissions(): UserPermissions {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<UserPermissions>({
        canManageFood: false,
        canManageSports: false,
        loading: true,
    });

    useEffect(() => {
        const fetchUserPermissions = async () => {
            if (!user?.uid) {
                setPermissions({
                    canManageFood: false,
                    canManageSports: false,
                    loading: false,
                });
                return;
            }

            try {
                // Check if user is in FoodManagers
                const foodManagersRef = doc(db, 'Groups', 'FoodManagers');
                const foodManagersSnap = await getDoc(foodManagersRef);

                // Check if user is in SportsManagers
                const sportsManagersRef = doc(db, 'Groups', 'SportsManagers');
                const sportsManagersSnap = await getDoc(sportsManagersRef);

                const canManageFood = foodManagersSnap.exists() &&
                    foodManagersSnap.data()?.userIds?.includes(user.uid);

                const canManageSports = sportsManagersSnap.exists() &&
                    sportsManagersSnap.data()?.userIds?.includes(user.uid);

                setPermissions({
                    canManageFood,
                    canManageSports,
                    loading: false,
                });
            } catch (error) {
                console.error('Error fetching user permissions:', error);
                setPermissions({
                    canManageFood: false,
                    canManageSports: false,
                    loading: false,
                });
            }
        };

        fetchUserPermissions();
    }, [user?.uid]);

    return permissions;
}
