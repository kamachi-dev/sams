"use client";

import { useEffect } from "react";

export function DatabaseInitializer() {
  useEffect(() => {
    // Run migrations on app startup
    const initializeDatabase = async () => {
      try {
        const response = await fetch("/api/init", { 
          method: "GET",
          cache: "no-store" 
        });
        
        if (!response.ok) {
          console.warn("Database initialization returned non-200 status");
        }
        
        const data = await response.json();
        console.log("Database ready:", data);
      } catch (err) {
        console.error("Failed to initialize database:", err);
      }
    };

    initializeDatabase();
  }, []);

  return null;
}
