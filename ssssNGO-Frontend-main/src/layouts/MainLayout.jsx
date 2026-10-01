import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import AnnouncementBar from "../components/AnnouncementBar";

const MainLayout = () => {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState(null);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [pathname]);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    API.get("/announcements/active").then(({ data }) => setAnnouncement(data.find((item) => ["sitewide", "both"].includes(item.placement)) || null)).catch(() => setAnnouncement(null));
  }, [pathname]);
  return (
    <>
      {!pathname.startsWith("/admin") && <AnnouncementBar announcement={announcement} />}
      {!pathname.startsWith("/admin") && <Navbar />}
      <main className={`min-h-screen ${pathname.startsWith("/admin") ? "bg-[#F3F6F8]" : "bg-[#EDEDCE]"}`}>
        <Outlet />
      </main>
      {!pathname.startsWith("/admin") && <Footer />}
    </>
  );
};

export default MainLayout;
