import {
  LayoutDashboard, FileText, PlusCircle, Users, Map,
  Video, MessageSquare, Settings, LogOut,
  ChevronRight, ChevronLeft, ChevronDown, BarChart3,
  ShieldCheck, Landmark, HeartPulse, Flame, UsersRound, BriefcaseBusiness, Trash2
} from 'lucide-react';
import React, { useState } from 'react';
import { useApp, useAuth } from '../App';
import { isMobileView } from '../utils/helpers';
import { usePhonePortrait } from '../hooks/use-shell';
import { KATEGORI_LIST } from '../utils/kategori';

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, setIsOpenMobile, collapsed, onToggleCollapse }) => {
  const { activeTab, setActiveTab } = useApp();
  const { isAdmin, session, logout } = useAuth();
  const isPhonePortrait = usePhonePortrait();

  // Sub menu kategori: terbuka bawaan supaya percabangan langsung terlihat.
  const [katOpen, setKatOpen] = useState(true);
  const [showDevInfo, setShowDevInfo] = useState(false);

  // Collapsed hanya berlaku di layout desktop — di potret ponsel drawer selalu lebar penuh.
  const collapse = collapsed && !isPhonePortrait;

  const nav = (tab: string) => { setActiveTab(tab); setIsOpenMobile(false); };

  const toggle = () => {
    if (isMobileView()) {
      setIsOpenMobile(!isOpenMobile);
    } else {
      onToggleCollapse();
    }
  };

  // Check if user has permission to access a menu
  const hasPermission = (menuKey: string): boolean => {
    if (isAdmin) return true;
    const permissions = session?.permissions || {};
    return permissions[menuKey] === true;
  };

  // Ikon sub menu Rekap — dipetakan dari nama ikon kategori (sama dgn sipedas mobile).
  const KAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    shield: ShieldCheck,
    landmark: Landmark,
    heart: HeartPulse,
    flame: Flame,
    users: UsersRound,
    briefcase: BriefcaseBusiness,
  };

  const CATEGORY_TABS = ['rk', 'pedestrian', 'poskamling', 'posyandu', 'kebencanaan', 'yanmas', 'lainnya'];
  const isRekapActive = CATEGORY_TABS.includes(activeTab);

  const navKategori = (slug: string) => {
    setActiveTab(slug);
    setIsOpenMobile(false);
  };

  const NavBtn = ({ tab, icon, label, tabs }: { tab: string; icon: React.ReactNode; label: string; tabs?: string[] }) => {
    const isActive = tabs ? tabs.includes(activeTab) : activeTab === tab;
    return (
      <button
        className={[
          'group relative flex w-full cursor-pointer items-center overflow-hidden whitespace-nowrap border border-transparent text-left text-[.8rem] font-semibold transition-all duration-150',
          collapse
            ? 'h-10 w-[60px] justify-center gap-0 rounded-none p-0'
            : 'mb-0.5 gap-2.5 rounded-md px-3 py-2.5',
          isActive
            ? 'bg-[var(--sb-bg-active)] font-bold text-[#FFD23F]'
            : 'text-white/75 hover:bg-white/10 hover:text-white',
        ].join(' ')}
        onClick={() => nav(tab)}
        title={collapse ? label : undefined}
      >
        {isActive && (
          <span className={`absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-[3px] bg-[#FFD23F] ${collapse ? 'h-3.5' : 'h-[18px]'}`} />
        )}
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-150 group-hover:text-white ${isActive ? 'text-[#FFD23F]' : 'text-white/65'}`}>
          {icon}
        </span>
        {!collapse && (
          <span className="flex-1 overflow-hidden text-ellipsis transition-opacity duration-200">{label}</span>
        )}
      </button>
    );
  };

  return (
    <>
      <nav
        id="sidebar"
        className={[
          'fixed left-0 top-0 flex h-screen flex-col overflow-visible border-r border-[var(--sb-border)] bg-[linear-gradient(180deg,var(--sb-bg),var(--sb-bg-dark))] shadow-[inset_-1px_0_0_rgba(255,255,255,.04),4px_0_24px_rgba(0,0,0,.16)] transition-[transform,opacity,width] duration-[280ms] ease-[cubic-bezier(.4,0,.2,1)]',
          collapse ? 'w-[60px] min-w-[60px]' : 'w-60 min-w-60',
          isPhonePortrait && isOpenMobile
            ? 'z-[1200] translate-x-0 opacity-100 shadow-[0_8px_40px_rgba(0,0,0,.5)]'
            : isPhonePortrait
              ? 'z-[200] -translate-x-[calc(100%+24px)] opacity-0 rounded-r-2xl'
              : 'z-[200] translate-x-0 opacity-100',
        ].join(' ')}
      >
        {/* Floating collapse toggle button — di tepi kanan sidebar */}
        <button
          className="absolute -right-3 top-1/2 z-[201] flex h-6 w-6 shrink-0 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--border)] bg-card text-blueh shadow-[0_2px_8px_rgba(0,0,0,.18)] transition-all hover:border-blueh hover:bg-blueh hover:text-white"
          onClick={toggle}
          title={collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Header */}
        <div className={`flex h-[60px] min-h-[60px] shrink-0 items-center border-b border-[var(--sb-border)] bg-black/15 ${collapse ? 'justify-center px-0' : 'px-4'}`}>
          <div className={`flex min-w-0 items-center gap-2.5 overflow-hidden ${collapse ? 'justify-center' : 'flex-1'}`}>
            <button
              className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/30 bg-white/20 p-[4px] shadow-[0_2px_8px_rgba(0,0,0,.3)] transition-all hover:scale-105 hover:bg-white/30"
              onClick={() => setShowDevInfo(true)}
              title="Info Pengembang"
            >
              <img src="assets/icon-32.png" alt="Logo" className="block size-full object-contain" />
            </button>
            {!collapse && (
              <div className="flex flex-col overflow-hidden transition-[opacity,width] duration-200">
                <span className="whitespace-nowrap font-display text-[.9rem] font-black uppercase leading-[1.2] tracking-[.10em] text-[#ffb020]">SIPEDAS</span>
                <span className="mt-0.5 whitespace-nowrap text-[.56rem] font-medium leading-[1.6] tracking-[.03em] text-white/60">Dashboard Monitoring</span>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div className={`sbnv flex-1 overflow-y-auto overflow-x-hidden ${collapse ? 'flex flex-col items-stretch px-2 py-2' : 'px-2 py-2.5'}`}>
          {!collapse && <span className="block px-2.5 pb-[5px] pt-3.5 text-[.55rem] font-extrabold uppercase tracking-[.14em] text-white/45">Menu Utama</span>}
          <NavBtn tab="db" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          {/* Rekap Laporan — menu induk yang bisa kolaps berisi sub menu kategori
              (percabangan gaya NavDropdown Mesen.Ae; ikon & identitas = sipedas mobile) */}
          <div className="mb-0.5">
            <button
              className={[
                'group relative flex w-full cursor-pointer items-center overflow-hidden whitespace-nowrap border border-transparent text-left text-[.8rem] transition-all duration-150',
                collapse ? 'h-10 w-[60px] justify-center gap-0 rounded-none p-0' : 'gap-2.5 rounded-md px-3 py-2.5',
                isRekapActive
                  ? 'bg-[var(--sb-bg-active)] font-bold text-[#FFD23F]'
                  : katOpen
                    ? 'bg-white/[.06] font-semibold text-white'
                    : 'font-semibold text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')}
              onClick={() => {
                setKatOpen(!katOpen);
                if (!isRekapActive) {
                  navKategori('pedestrian');
                }
              }}
              title={collapse ? 'Rekap Laporan' : undefined}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-150 ${
                  isRekapActive ? 'text-[#FFD23F]' : katOpen ? 'text-white' : 'text-white/65 group-hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
              </span>
              {!collapse && (
                <>
                  <span className="flex-1 overflow-hidden text-ellipsis">Rekap Laporan</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
                      katOpen ? 'rotate-180' : ''
                    } ${isRekapActive ? 'text-[#FFD23F]' : 'text-white/45 group-hover:text-white'}`}
                  />
                </>
              )}
            </button>

            {/* Tinggi cabang dianimasikan lewat trik grid-rows (1fr ↔ 0fr) */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                katOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className={
                    collapse
                      ? 'flex flex-col items-center py-1'
                      : 'my-1 ml-5 border-l-2 border-white/10 py-1 pl-3'
                  }
                >
                  {KATEGORI_LIST.map((item) => {
                    const KatIcon = KAT_ICONS[item.icon] ?? FileText;
                    const isActive = activeTab === item.slug || (item.slug === 'pedestrian' && activeTab === 'rk');
                    return (
                      <button
                        key={item.slug}
                        className={[
                          'flex w-full cursor-pointer items-center overflow-hidden whitespace-nowrap rounded-md transition-all duration-200',
                          collapse
                            ? 'h-8 w-[60px] justify-center gap-0 p-0'
                            : 'gap-2.5 py-1.5 pl-3 pr-2 text-left text-[.72rem]',
                          isActive
                            ? 'bg-[var(--sb-bg-active)] font-bold text-[#FFD23F]'
                            : 'text-white/60 hover:bg-white/10 hover:text-white',
                        ].join(' ')}
                        onClick={() => navKategori(item.slug)}
                        title={collapse ? item.label : undefined}
                      >
                        <KatIcon className="h-3.5 w-3.5 shrink-0" />
                        {!collapse && <span className="flex-1 overflow-hidden text-ellipsis">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {hasPermission('input') && <NavBtn tab="in" icon={<PlusCircle className="h-4 w-4" />} label="Input Laporan" />}

          {hasPermission('sampah') && <NavBtn tab="sampah" icon={<Trash2 className="h-4 w-4" />} label="Sampah" />}

          {!collapse && <span className="block px-2.5 pb-[5px] pt-3.5 text-[.55rem] font-extrabold uppercase tracking-[.14em] text-white/45">Data &amp; Peta</span>}
          {hasPermission('satlinmas') && <NavBtn tab="sl" icon={<Users className="h-4 w-4" />} label="Data Satlinmas" />}
          {hasPermission('peta') && <NavBtn tab="pt" icon={<Map className="h-4 w-4" />} label="Peta Satgas" />}
          {hasPermission('cctv') && <NavBtn tab="cc" icon={<Video className="h-4 w-4" />} label="CCTV Pedestrian" />}
          {hasPermission('aduan') && <NavBtn tab="ad" icon={<MessageSquare className="h-4 w-4" />} label="Aduan" />}
          {hasPermission('survei') && <NavBtn tab="sv" icon={<BarChart3 className="h-4 w-4" />} label="Rating Layanan" />}

          {hasPermission('pengaturan') && <NavBtn tab="set" icon={<Settings className="h-4 w-4" />} label="Pengaturan" />}
        </div>

        {/* Footer */}
        <div className={`flex shrink-0 flex-col gap-2 border-t border-[var(--sb-border)] ${collapse ? 'items-stretch px-2 py-2' : 'px-2 py-2.5'}`}>
          <button
            className={[
              'flex w-full cursor-pointer items-center overflow-hidden whitespace-nowrap rounded-md text-left text-[.78rem] font-bold transition-all duration-150',
              collapse
                ? 'h-10 w-[60px] justify-center gap-0 border border-transparent bg-transparent p-0'
                : 'gap-2.5 border border-white/15 bg-white/[.08] px-3 py-[9px] text-white/80 hover:border-[rgba(239,108,74,.4)] hover:bg-[rgba(239,108,74,.25)] hover:text-white',
            ].join(' ')}
            onClick={() => logout()}
            title={collapse ? 'Keluar' : undefined}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!collapse && <span>Keluar</span>}
          </button>
        </div>
      </nav>

      {/* Modal Info Pengembang - Tampilan Tengah Layar */}
      {showDevInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDevInfo(false)}>
          <div className="relative mx-4 w-full max-w-[380px] rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowDevInfo(false)}
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-bg text-muted transition-all hover:bg-red hover:text-white"
              title="Tutup"
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue/30 to-purple/30 blur-sm"></div>
                <img
                  src="/assets/basith.jpeg"
                  alt="Ahmad Abdul Basith"
                  className="relative h-24 w-24 rounded-full border-2 border-border object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%23e8e8e8"/%3E%3Ctext x="48" y="48" text-anchor="middle" fill="%23999" font-size="12" font-family="sans-serif"%3EAAB%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className="text-center">
                <h3 className="text-[1.05rem] font-extrabold text-text">Ahmad Abdul Basith, S.Tr.I.P</h3>
                <p className="mt-1 text-[.75rem] text-muted">Pengembang Sistem SIPEDAS</p>
              </div>
              <div className="w-full rounded-lg border border-border bg-bg p-3 text-center">
                <p className="text-[.7rem] text-mid">Sistem Pelaporan Digital Satgas Linmas</p>
                <p className="text-[.65rem] text-muted">Kabupaten Ponorogo</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
