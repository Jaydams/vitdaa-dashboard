import { MdOutlineDashboard } from "react-icons/md";
import { TbTruckDelivery } from "react-icons/tb";
import { RiCoupon2Line } from "react-icons/ri";
import { TbSettings } from "react-icons/tb";
import { TbTag } from "react-icons/tb";
import { TbBriefcase } from "react-icons/tb";
import { MdOutlineShoppingCart } from "react-icons/md";
import { LucideUsers2, Share2 } from "lucide-react";
import { TbWallet } from "react-icons/tb";
import { TbPackage } from "react-icons/tb";
import { MdOutlineEvent } from "react-icons/md";

export interface NavItem {
  title: string;
  url?: string;
  icon: React.ReactNode;
  submenu?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: <MdOutlineDashboard />,
  },
  {
    title: "Menus",
    url: "/menu",
    icon: <MdOutlineShoppingCart />,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: <TbTag />,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: <LucideUsers2 />,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: <TbTruckDelivery />,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: <TbPackage />,
  },
  {
    title: "Wallet",
    url: "/wallet",
    icon: <TbWallet />,
  },
  {
    title: "Coupons",
    url: "/coupons",
    icon: <RiCoupon2Line />,
  },
  {
    title: "Reservations",
    url: "/reservations",
    icon: <MdOutlineEvent />,
    submenu: [
      {
        title: "All Reservations",
        url: "/reservations",
        icon: <MdOutlineEvent />,
      },
      {
        title: "Calendar View",
        url: "/reservations/calendar",
        icon: <MdOutlineEvent />,
      },
      {
        title: "Venues",
        url: "/reservations/venues",
        icon: <MdOutlineEvent />,
      },
      {
        title: "Settings",
        url: "/reservations/settings",
        icon: <TbSettings />,
      },
    ],
  },
  {
    title: "Staff",
    url: "/staff",
    icon: <TbBriefcase />,
    submenu: [
      {
        title: "Staff Management",
        url: "/staff",
        icon: <LucideUsers2 />,
      },
      {
        title: "Login Manager",
        url: "/staff-login-manager",
        icon: <Share2 />,
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: <TbSettings />,
  },
];
