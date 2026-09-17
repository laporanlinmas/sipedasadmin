import React, { useState, lazy, Suspense, Component, ErrorInfo } from 'react';
import { useApp } from '../App';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LoadingOverlay } from './common/LoadingOverlay';
import { GalleryOverlay } from './common/GalleryOverlay';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import {
  DashboardSkeleton,
  RekapSkeleton,
  SatlinmasSkeleton,
  InputSkeleton,
  PetaSkeleton,
  AduanSkeleton,
  SurveiSkeleton,
  PengaturanSkeleton,
  PetunjukSkeleton,
  CctvSkeleton,
} from './SkeletonPages';

// Error boundary to catch lazy load failures
class PageErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageError]:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
          <XCircle className="w-10 h-10 text-[var(--muted)] opacity-50" />
          <p className="text-[var(--tx2)] text-sm">Terjadi penyegaran komponen sistem, silakan coba lagi.</p>
          <button
            className="bp px-4 py-2 rounded text-sm mt-2"
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Page components (lazy loaded for code splitting)
const Dashboard      = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const RekapLaporan   = lazy(() => import('../pages/RekapLaporan').then(m => ({ default: m.RekapLaporan })));
const InputLaporan   = lazy(() => import('../pages/InputLaporan').then(m => ({ default: m.InputLaporan })));
const DataSatlinmas  = lazy(() => import('../pages/DataSatlinmas').then(m => ({ default: m.DataSatlinmas })));
const PetunjukTeknis = lazy(() => import('../pages/PetunjukTeknis').then(m => ({ default: m.PetunjukTeknis })));
const Pengaturan     = lazy(() => import('../pages/Pengaturan').then(m => ({ default: m.Pengaturan })));
const PetaPedestrian = lazy(() => import('../pages/PetaPedestrian').then(m => ({ default: m.PetaPedestrian })));
const CctvPedestrian = lazy(() => import('../pages/CctvPedestrian').then(m => ({ default: m.CctvPedestrian })));
const Aduan          = lazy(() => import('../pages/Aduan').then(m => ({ default: m.Aduan })));
const Survei         = lazy(() => import('../pages/Survei').then(m => ({ default: m.Survei })));

export const AppLayout: React.FC = () => {
  const { activeTab, toasts, removeToast } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const renderActiveTab = () => {
    const wrap = (node: React.ReactNode, fallback: React.ReactNode) => (
      <Suspense fallback={fallback}>{node}</Suspense>
    );
    switch (activeTab) {
      case 'db':
        return wrap(<Dashboard />, <DashboardSkeleton />);
      case 'rk':
        return wrap(<RekapLaporan />, <RekapSkeleton />);
      case 'in':
        return wrap(<InputLaporan />, <InputSkeleton />);
      case 'sl':
        return wrap(<DataSatlinmas />, <SatlinmasSkeleton />);
      case 'pt':
      case 'kr':
      case 'kerawanan':
        return wrap(<PetaPedestrian />, <PetaSkeleton />);
      case 'cc':
      case 'cctv':
        return wrap(<CctvPedestrian />, <CctvSkeleton />);
      case 'ad':
      case 'aduan':
        return wrap(<Aduan />, <AduanSkeleton />);
      case 'sv':
      case 'survei':
        return wrap(<Survei />, <SurveiSkeleton />);
      case 'ptk':
        return wrap(<PetunjukTeknis />, <PetunjukSkeleton />);
      case 'set':
        return wrap(<Pengaturan />, <PengaturanSkeleton />);
      default:
        return wrap(<Dashboard />, <DashboardSkeleton />);
    }
  };

  const renderToastIcon = (type: 'ok' | 'er' | 'inf') => {
    switch (type) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 inline-block align-middle" />;
      case 'er':
        return <XCircle className="w-4 h-4 inline-block align-middle" />;
      case 'inf':
      default:
        return <Info className="w-4 h-4 inline-block align-middle" />;
    }
  };

  return (
    <div id="app-wrap" className="min-h-screen bg-[var(--bg)] font-sans transition-colors duration-300 relative">
      {/* Mobile Sidebar Backdrop */}
      <div
        id="mbb"
        className={isMobileSidebarOpen ? 'on' : ''}
        onClick={() => setIsMobileSidebarOpen(false)}
      ></div>

      <div id="app" className="on flex min-h-screen overflow-hidden">
        <Sidebar
          isOpenMobile={isMobileSidebarOpen}
          setIsOpenMobile={setIsMobileSidebarOpen}
        />
        <div className="main flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-hidden">
          <Topbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
          
          <div className="pa flex-1 p-3 md:p-4 overflow-y-auto w-full" id="ct">
            <PageErrorBoundary>
              {renderActiveTab()}
            </PageErrorBoundary>
          </div>
        </div>
      </div>

      {/* Global Overlays & Modals */}
      <LoadingOverlay />
      <GalleryOverlay />

      {/* Toast container */}
      <div id="tco">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ti ${t.type}`}
            onClick={() => removeToast(t.id)}
            style={{ cursor: 'pointer' }}
          >
            {renderToastIcon(t.type)}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AppLayout;
