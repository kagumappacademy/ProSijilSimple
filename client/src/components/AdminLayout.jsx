import React,{useState} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {LayoutDashboard,GraduationCap,Award,FileUp,Settings,LogOut,Menu,X,ChevronRight,ExternalLink,Bell,ShieldCheck,Layers,Sparkles} from 'lucide-react';
import {toast} from 'sonner';
import {api} from '../lib/api';
import {Logo} from './UI';
const items=[
  {to:'/admin',icon:LayoutDashboard,label:'Dashboard',end:true},
  {to:'/admin/pesilat',icon:GraduationCap,label:'Pengurusan Pesilat'},
  {to:'/admin/templates',icon:Layers,label:'Templat Sijil'},
  {to:'/admin/jana-sijil',icon:Sparkles,label:'Janaan Sijil'},
  {to:'/admin/sijil',icon:Award,label:'Pengurusan Sijil'},
  {to:'/admin/import',icon:FileUp,label:'Import CSV'},
  {to:'/admin/tetapan',icon:Settings,label:'Tetapan Sistem'}
];
function Sidebar({close,logout,user}){
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link to="/" onClick={close} className="shrink-0"><Logo light small/></Link>
        {close && (
          <button onClick={close} aria-label="Tutup menu" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden">
            <X size={20}/>
          </button>
        )}
      </div>

      <div className="flex-1 px-3.5 py-4">
        <span className="px-3 text-[9px] font-extrabold uppercase tracking-[.2em] text-white/35">MENU UTAMA</span>
        <nav className="mt-2 space-y-1">
          {items.map(({to,icon:Icon,label,end}) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={close}
              className={({isActive}) => `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${isActive ? 'bg-white text-forest-900 shadow-sm font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon size={16} className="shrink-0"/>
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 shrink-0"/>
            </NavLink>
          ))}
        </nav>

        <div className="my-4 h-px bg-white/10"/>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink size={16} className="shrink-0"/>
          <span className="truncate">Lihat Portal Awam</span>
        </a>
      </div>

      <div className="p-3.5 mt-auto border-t border-white/10 bg-forest-950/20">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500 text-xs font-extrabold text-forest-950 shrink-0">
              {(user?.username||'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{user?.username||'Admin'}</div>
              <div className="text-[10px] text-white/40">Administrator</div>
            </div>
            <button
              onClick={logout}
              aria-label="Log keluar"
              title="Log keluar"
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
            >
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({user,onLogout}){
  const [open,setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  async function logout(){
    try {
      await api('/auth/logout',{method:'POST'});
    } finally {
      onLogout();
      toast.success('Anda telah log keluar.');
      nav('/admin/login');
    }
  }

  const name = items.find(i=>i.to===loc.pathname)?.label || 'Portal Admin';

  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[230px] bg-forest-900 lg:block shadow-md">
        <Sidebar user={user} logout={logout}/>
      </aside>

      {open && (
        <div className="fixed inset-0 z-[90] bg-forest-950/55 backdrop-blur-xs lg:hidden" onClick={()=>setOpen(false)}>
          <aside className="h-full w-[260px] bg-forest-900 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <Sidebar user={user} close={()=>setOpen(false)} logout={logout}/>
          </aside>
        </div>
      )}

      <div className="lg:pl-[230px]">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 p-2 text-forest-900 lg:hidden hover:bg-slate-50 transition"
              onClick={()=>setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={19}/>
            </button>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ProSijil / Admin</div>
              <div className="text-xs sm:text-sm font-extrabold text-forest-950 leading-tight">{name}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span>Aktif</span>
            </div>
            <div className="h-5 w-px bg-slate-200 hidden sm:block"/>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-forest-100 text-xs font-extrabold text-forest-800">
              {(user?.username||'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-3 sm:p-5 lg:p-6 pb-8">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
