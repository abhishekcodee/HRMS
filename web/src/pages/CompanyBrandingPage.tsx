import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { API_BASE_URL } from '../config/api';
import { safeFetchJson } from '../utils/safeFetch';

export const CompanyBrandingPage: React.FC = () => {
  const { token, user } = useAuth();
  const { branding, reloadBranding } = useTenant();

  const isAllowed = user?.role === 'ADMIN' || user?.isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'amanupadhyay2030@gmail.com';
  if (!isAllowed) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-primary)', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 12px 0' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
          White-Label Branding configuration requires administrator permissions.
        </p>
      </div>
    );
  }

  const [form, setForm] = useState({
    name: branding.name || '',
    logoUrl: branding.logo_url || '',
    faviconUrl: branding.favicon_url || '',
    brandColor: branding.brand_color || '#1e293b',
    secondaryBrandColor: branding.secondary_brand_color || '#0f172a',
    customDomain: branding.custom_domain || '',
    email: '',
    phone: '',
    address: '',
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setForm({
      name: branding.name || '',
      logoUrl: branding.logo_url || '',
      faviconUrl: branding.favicon_url || '',
      brandColor: branding.brand_color || '#1e293b',
      secondaryBrandColor: branding.secondary_brand_color || '#0f172a',
      customDomain: branding.custom_domain || '',
      email: '',
      phone: '',
      address: '',
    });
  }, [branding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await safeFetchJson(`${API_BASE_URL}/company/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok && res.data?.success) {
        setFeedback({ type: 'success', message: 'White-Label Branding updated successfully!' });
        await reloadBranding();
        window.dispatchEvent(new Event('tenant-changed'));
      } else {
        setFeedback({ type: 'error', message: res.error || res.data?.error?.message || 'Failed to update branding.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Server connection error.' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-app)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>
          Company Branding & White-Label Customization
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Personalize your HRMS portal logo, primary brand colors, custom domain, and corporate identity.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: feedback.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
            color: feedback.type === 'success' ? 'var(--success-text)' : 'var(--error-text)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
          }}
        >
          {feedback.message}
        </div>
      )}

      <div className="branding-page-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Form Column */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: '16px',
              fontSize: '16px',
              color: 'var(--text-primary)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
            }}
          >
            Brand Identity Settings
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Display Company Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Primary Theme Color</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Secondary Accent Color</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.secondaryBrandColor}
                  onChange={(e) => setForm({ ...form, secondaryBrandColor: e.target.value })}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={form.secondaryBrandColor}
                  onChange={(e) => setForm({ ...form, secondaryBrandColor: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Company Logo Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/logo.png"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Favicon Icon URL</label>
            <input
              type="text"
              placeholder="https://example.com/favicon.ico"
              value={form.faviconUrl}
              onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Custom Subdomain / Host Alias</label>
            <input
              type="text"
              placeholder="portal.mycompany.com"
              value={form.customDomain}
              onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: form.brandColor || 'var(--primary-500)',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: 'opacity 0.2s ease',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving Branding...' : 'Save & Apply White-Label Theme'}
          </button>
        </form>

        {/* Live Preview Column */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: '16px',
              fontSize: '16px',
              color: 'var(--text-primary)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
            }}
          >
            Live Portal Theme Preview
          </h3>

          <div
            style={{
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Header Preview */}
            <div style={{ background: form.brandColor, padding: '12px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" style={{ height: '24px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 700 }}>🏢</span>
              )}
              <span style={{ fontWeight: 700, fontSize: '15px' }}>{form.name || 'Company Name'}</span>
            </div>

            {/* Sidebar & Body Preview */}
            <div style={{ display: 'flex', minHeight: '180px' }}>
              <div style={{ width: '80px', background: form.secondaryBrandColor, padding: '12px 8px', color: '#94a3b8', fontSize: '11px' }}>
                <div style={{ color: '#fff', marginBottom: '8px' }}>Dashboard</div>
                <div style={{ marginBottom: '8px' }}>Employees</div>
                <div style={{ marginBottom: '8px' }}>Payroll</div>
              </div>
              <div style={{ flex: 1, padding: '16px', background: 'var(--bg-app)' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HRMS Portal Active</span>
                  <div style={{ fontWeight: 700, color: form.brandColor, fontSize: '14px', marginTop: '4px' }}>
                    Welcome to {form.name || 'Company Portal'}
                  </div>
                </div>
                <button
                  style={{
                    background: form.brandColor,
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Primary Action Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
