import {
  LayoutDashboard, FileText, PlusCircle, Users, Map,
  Video, MessageSquare, BookOpen, Settings, LogOut,
  ChevronRight, ChevronLeft, BarChart3
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useApp, useAuth } from '../App';
import { isMobileView } from '../utils/helpers';

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, setIsOpenMobile }) => {
  const { activeTab, setActiveTab } = useApp();
  const { isAdmin, logout, session } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === 'true');

  useEffect(() => {
    document.body.classList.toggle('sb-collapsed', isCollapsed);
  }, [isCollapsed]);

  const nav = (tab: string) => { setActiveTab(tab); setIsOpenMobile(false); };

  const toggle = () => {
    if (isMobileView()) {
      setIsOpenMobile(!isOpenMobile);
    } else {
      const next = !isCollapsed;
      setIsCollapsed(next);
      localStorage.setItem('sb-collapsed', String(next));
    }
  };

  const NavBtn = ({ tab, icon, label, tabs }: { tab: string; icon: React.ReactNode; label: string; tabs?: string[] }) => {
    const isActive = tabs ? tabs.includes(activeTab) : activeTab === tab;
    return (
      <button className={`sb-nav-btn${isActive ? ' active' : ''}`} onClick={() => nav(tab)} title={isCollapsed ? label : undefined}>
        <span className="sb-nav-icon">{icon}</span>
        <span className="sb-nav-label">{label}</span>
      </button>
    );
  };

  return (
    <nav className={`sb${isOpenMobile ? ' on' : ''}${isCollapsed ? ' collapsed' : ''}`} id="sidebar">
      {/* Floating collapse toggle button — di tepi kanan sidebar */}
      <button className="sb-toggle-btn" onClick={toggle} title={isCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}>
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Header */}
      <div className="sb-header">
        <div className="sb-brand">
          <div className="sb-logo-wrap">
            <img src="assets/linmas.svg" alt="Logo" className="sb-logo" />
          </div>
          <div className="sb-brand-text">
            <span className="sb-brand-name">SI-PEDAS</span>
            <span className="sb-brand-sub">Dashboard Monitoring</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="sb-nav">
        <span className="sb-section-label">Menu Utama</span>
        <NavBtn tab="db" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
        <NavBtn tab="rk" icon={<FileText className="w-4 h-4" />} label="Rekap Laporan" />
        {isAdmin && <NavBtn tab="in" icon={<PlusCircle className="w-4 h-4" />} label="Input Laporan" />}

        <span className="sb-section-label">Data &amp; Peta</span>
        <NavBtn tab="sl" icon={<Users className="w-4 h-4" />} label="Data Satlinmas" />
        <NavBtn tab="pt" icon={<Map className="w-4 h-4" />} label="Peta Pedestrian" tabs={['pt', 'kr']} />
        <NavBtn tab="cc" icon={<Video className="w-4 h-4" />} label="CCTV Pedestrian" />
        <NavBtn tab="ad" icon={<MessageSquare className="w-4 h-4" />} label="Aduan" />
        <NavBtn tab="sv" icon={<BarChart3 className="w-4 h-4" />} label="Survei Kepuasan" />

        <span className="sb-section-label">Panduan</span>
        <NavBtn tab="ptk" icon={<BookOpen className="w-4 h-4" />} label="Petunjuk Teknis" />
        {isAdmin && <NavBtn tab="set" icon={<Settings className="w-4 h-4" />} label="Pengaturan" />}
      </div>

      {/* Footer */}
      <div className="sb-footer">
        <button className="sb-logout" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
