export const syncSavesWithServer = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId || userId === "guest") {
        console.log("syncSavesWithServer: No valid userId found (guest). Skipping sync.");
        return;
    }
    const localKey = `comparedHomes_${userId}`;
    const saves = JSON.parse(localStorage.getItem(localKey)) || [];
    console.log("syncSavesWithServer: Saves to sync for user", userId, ":", saves);
    const saveDtos = saves.map((s) => ({ userId, homeId: s.id || s._id }));
    if (saveDtos.length === 0) {
        console.log("syncSavesWithServer: No saves to sync.");
        return;
    }
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("https://localhost:7194/api/Save/sync", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(saveDtos),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("syncSavesWithServer: Failed to sync saves with server:", errorText);
        } else {
            console.log("syncSavesWithServer: Saves synced successfully");
        }
    } catch (err) {
        console.error("syncSavesWithServer: Error syncing saves", err);
    }
};
