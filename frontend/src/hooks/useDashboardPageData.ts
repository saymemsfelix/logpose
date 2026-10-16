import { useEffect } from "react";

export function useDashboardPageData(data?: any, filters?: any, settings?: any) {
  useEffect(() => {
    // Sincroniza dados da página do dashboard em memória
  }, [data, filters, settings]);
}
