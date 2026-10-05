import { NavLink } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Home, X } from 'lucide-react';
import { usePermission } from '../../hooks';
import { setSidebarOpen } from '../../features/ui/uiSlice';
import { NAV_SECTIONS } from './navigation';

function NavContent({ onNavigate }) {
  const allowed = usePermission();
  const businessName = useSelector((state) => state.lookups.data.settings?.businessName ?? 'Homestay');
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow">
          <Home className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{businessName}</p>
          <p className="text-[11px] uppercase tracking-wider text-brand-200/80">Homestay Cloud</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => allowed(item.permission));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-200/60">{section.title}</p>
              <ul className="mt-2 space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isActive ? 'bg-white/10 text-white' : 'text-brand-100/80 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-white/5 p-3 text-xs text-brand-100/80">
        <p className="font-semibold text-amber-300">Demo environment</p>
        <p className="mt-1">Data lives in serverless memory and may reset at any time.</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const dispatch = useDispatch();
  const open = useSelector((state) => state.ui.sidebarOpen);
  const close = () => dispatch(setSidebarOpen(false));
  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-brand-950 lg:fixed lg:inset-y-0 lg:block">
        <NavContent />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/60" onClick={close} aria-hidden />
          <aside className="relative h-full w-72 max-w-[85%] bg-brand-950 shadow-xl">
            <button type="button" onClick={close} className="absolute right-3 top-4 rounded-md p-1.5 text-brand-100 hover:bg-white/10" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </button>
            <NavContent onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
