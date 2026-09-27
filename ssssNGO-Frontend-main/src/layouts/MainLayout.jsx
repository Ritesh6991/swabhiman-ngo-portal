import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const MainLayout = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [pathname]);
  return (
    <>
      {!pathname.startsWith("/admin") && <Navbar />}
      <main className={`min-h-screen ${pathname.startsWith("/admin") ? "bg-[#F3F6F8]" : "bg-[#EDEDCE]"}`}>
        <Outlet />
      </main>
      {!pathname.startsWith("/admin") && <Footer />}
    </>
  );
};

export default MainLayout;
