import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

export interface CompanyBranding {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  favicon_url?: string;
  brand_color?: string;
  secondary_brand_color?: string;
  custom_domain?: string;
}

interface TenantContextType {
  branding: CompanyBranding;
  activeTenantId: string | null;
  setActiveTenantId: (tenantId: string | null) => void;
  reloadBranding: () => Promise<void>;
  isLoadingBranding: boolean;
}

const DEFAULT_BRANDING: CompanyBranding = {
  id: 'c1000000-0000-0000-0000-000000000001',
  name: 'Default Enterprise',
  code: 'DEFAULT',
  brand_color: '#1e293b',
  secondary_brand_color: '#0f172a',
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<CompanyBranding>(DEFAULT_BRANDING);
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(() => localStorage.getItem('hrms_active_tenant_id'));
  const [isLoadingBranding, setIsLoadingBranding] = useState<boolean>(true);

  const applyBrandingTheme = (brand: CompanyBranding) => {
    if (brand.brand_color) {
      document.documentElement.style.setProperty('--primary-color', brand.brand_color);
      document.documentElement.style.setProperty('--brand-primary', brand.brand_color);
      document.documentElement.style.setProperty('--primary-500', brand.brand_color);
      document.documentElement.style.setProperty('--primary-600', brand.brand_color);
      document.documentElement.style.setProperty('--primary-700', brand.brand_color);
      document.documentElement.style.setProperty('--primary-glow', `${brand.brand_color}40`);
    }
    if (brand.secondary_brand_color) {
      document.documentElement.style.setProperty('--secondary-color', brand.secondary_brand_color);
      document.documentElement.style.setProperty('--brand-secondary', brand.secondary_brand_color);
    }
    if (brand.name) {
      document.title = `${brand.name} | HRMS SaaS Platform`;
    }
    if (brand.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = brand.favicon_url;
    }
  };

  const fetchBranding = async () => {
    setIsLoadingBranding(true);
    try {
      const hostname = window.location.hostname;
      const headers: Record<string, string> = {};
      if (activeTenantId) {
        headers['x-tenant-id'] = activeTenantId;
      }

      const res = await fetch(`${API_BASE_URL}/company/branding?domain=${encodeURIComponent(hostname)}`, { headers });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setBranding(result.data);
          applyBrandingTheme(result.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load dynamic branding, using default enterprise styling.', err);
      applyBrandingTheme(DEFAULT_BRANDING);
    } finally {
      setIsLoadingBranding(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [activeTenantId]);

  const setActiveTenantId = (tenantId: string | null) => {
    setActiveTenantIdState(tenantId);
    if (tenantId) {
      localStorage.setItem('hrms_active_tenant_id', tenantId);
    } else {
      localStorage.removeItem('hrms_active_tenant_id');
    }
  };

  return (
    <TenantContext.Provider
      value={{
        branding,
        activeTenantId,
        setActiveTenantId,
        reloadBranding: fetchBranding,
        isLoadingBranding,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
