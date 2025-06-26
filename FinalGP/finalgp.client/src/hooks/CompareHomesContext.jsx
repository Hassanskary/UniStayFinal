import React, { createContext, useState, useEffect } from "react";

const getCurrentUserId = () => localStorage.getItem("userId") || "guest";

export const CompareHomesContext = createContext();

export const CompareHomesProvider = ({ userId: propUserId, children }) => {
    const userId = propUserId || getCurrentUserId();
    const localStorageKey = `comparedHomes_${userId}`;

    const [comparedHomes, setComparedHomes] = useState(() => {
        if (userId === "guest") {
            console.log("CompareHomesContext: Guest user – initializing with empty array.");
            return [];
        }
        const stored = JSON.parse(localStorage.getItem(localStorageKey)) || [];
        console.log(
            "CompareHomesContext: Loaded comparedHomes from localStorage (key:",
            localStorageKey,
            "):",
            stored
        );
        return stored;
    });

    useEffect(() => {
        if (userId === "guest") {
            localStorage.setItem(localStorageKey, JSON.stringify([]));
            console.log(
                "CompareHomesContext: Guest user – set comparedHomes to empty array in localStorage (key:",
                localStorageKey,
                ")"
            );
        } else {
            localStorage.setItem(localStorageKey, JSON.stringify(comparedHomes));
            console.log(
                "CompareHomesContext: Updated comparedHomes in localStorage (key:",
                localStorageKey,
                "):",
                comparedHomes
            );
        }
    }, [comparedHomes, localStorageKey, userId]);

    const updateComparedHomes = (newList) => {
        console.log("CompareHomesContext: Updating comparedHomes with", newList);
        setComparedHomes(newList);
    };

    const assignIdIfMissing = (home) => {
        if (!home.id) {
            home.id = home._id || `${home.title}-${Date.now()}`;
        }
        return home;
    };

    const addHomeToCompare = (home) => {
        console.log("CompareHomesContext: Attempting to add home:", home);
        if (userId === "guest") {
            console.warn("CompareHomesContext: Guest user cannot save homes.");
            return;
        }
        const assignedHome = assignIdIfMissing({ ...home });
        const homeId = assignedHome.id;
        if (!homeId) {
            console.log("CompareHomesContext: Home has no id. Skipping add.");
            return;
        }
        if (comparedHomes.some((h) => h.id === homeId)) {
            console.log("CompareHomesContext: Home already exists. Skipping add.");
            return;
        }
        setComparedHomes((prev) => {
            const newList = [...prev, assignedHome];
            console.log("CompareHomesContext: Added home to comparedHomes:", newList);
            return newList;
        });
    };

    const removeHome = (id) => {
        console.log("CompareHomesContext: Removing home with id:", id);
        setComparedHomes((prev) => {
            const newList = prev.filter((home) => home.id !== id);
            console.log("CompareHomesContext: Updated comparedHomes after removal:", newList);
            return newList;
        });
    };

    const clearComparison = () => {
        console.log("CompareHomesContext: Clearing all compared homes");
        setComparedHomes([]);
    };

    return (
        <CompareHomesContext.Provider
            value={{ comparedHomes, addHomeToCompare, removeHome, clearComparison, updateComparedHomes }}
        >
            {children}
        </CompareHomesContext.Provider>
    );
};
