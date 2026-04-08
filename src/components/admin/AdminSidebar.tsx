import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  FileText,
  Users,
  LogOut,
  MessageSquare,
  MapPin,
  Image,
  Frame,
  BarChart3,
  UserX,
  Landmark,
  Mail,
  Flower2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Orders", url: "/admin/orders", icon: ClipboardList },
  { title: "Schedule", url: "/admin/schedule", icon: CalendarDays },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Tickets", url: "/admin/tickets", icon: MessageSquare },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Leads", url: "/admin/leads", icon: UserX },
  { title: "Travel Zones", url: "/admin/travel-zones", icon: MapPin },
  { title: "Gallery", url: "/admin/gallery", icon: Image },
  { title: "Frame Builder", url: "/admin/frame-builder", icon: Frame },
  { title: "Memorials", url: "/admin/memorials", icon: Landmark },
  { title: "Flower Catalog", url: "/admin/flowers", icon: Flower2 },
  { title: "Email Signups", url: "/admin/signups", icon: Mail },
];

export function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-4">
            <h2 className="font-display text-lg font-bold">
              <span className="text-gradient-patina">Toll Keeper</span>
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin</p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={signOut}
        >
          <LogOut className="w-3 h-3 mr-2" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
